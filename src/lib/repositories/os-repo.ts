/**
 * E.OS.3 — Repositório oficial da Gestão de Serviços (Ordens de Serviço).
 *
 * Toda mutação atravessa RPCs SECURITY DEFINER da E.OS.2:
 *   rpc_os_criar / atualizar / mudar_status / finalizar / cancelar / excluir
 *   rpc_os_tarefa_criar / atualizar / atribuir / mudar_status / concluir
 *   rpc_os_formulario_responder / rpc_os_gerar_pv / rpc_os_evento_registrar
 *
 * Status, anti-edição direta, histórico e idempotência ficam no banco.
 * O frontend só consome — nunca atualiza status via UPDATE direto.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type OsStatus = string;
export type OsTarefaStatus =
  | "PLANEJAMENTO" | "AGENDADA" | "EM_DESLOCAMENTO" | "EM_EXECUCAO"
  | "PAUSA" | "IMPEDIDA" | "FINALIZADA" | "CANCELADA";

export interface OsStatusCatalogoRow {
  codigo: string; nome: string; cor: string | null;
  ordem: number; is_final: boolean; ativo: boolean;
}

export interface OsOrdemRow {
  id: string;
  numero: number;
  codigo: string | null;
  cliente_id: string | null;
  contrato_id: string | null;
  proposta_id: string | null;
  pedido_venda_id: string | null;
  projeto_id: string | null;
  obra_id: string | null;
  status_codigo: OsStatus;
  pipeline_id: string | null;
  area_negocio_id: string | null;
  ocorrencia_id: string | null;
  tecnico_responsavel_id: string | null;
  valor_orcado: number;
  custo_orcado: number;
  custo_total: number;
  valor_em_pv: number;
  data_cadastro: string;
  data_prev_inicio: string | null;
  data_prev_termino: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
  row_version: number;
  created_at: string;
  updated_at: string;
}

export interface OsTarefaRow {
  id: string;
  os_id: string;
  modelo_id: string | null;
  formulario_id: string | null;
  nome: string;
  descricao: string | null;
  ordem: number;
  status: OsTarefaStatus;
  tecnico_id: string | null;
  funcao_tecnico_id: string | null;
  data_prevista: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  duracao_estimada_min: number | null;
  obrigatorio: boolean;
  observacoes: string | null;
  row_version: number;
  created_at: string;
  updated_at: string;
}

export interface OsEventoRow {
  id: string;
  os_id: string;
  tarefa_id: string | null;
  tipo: string;
  ator_id: string | null;
  descricao: string | null;
  payload: unknown;
  created_at: string;
}

// ───────────────────── leitura ─────────────────────
export const osRepo = {
  async listarStatus(): Promise<OsStatusCatalogoRow[]> {
    const { data, error } = await supabase
      .from("os_status_catalogo").select("*").eq("ativo", true).order("ordem");
    if (error) throw error;
    return (data ?? []) as OsStatusCatalogoRow[];
  },

  async listar(opts?: {
    status?: string; clienteId?: string; busca?: string; limit?: number;
  }): Promise<OsOrdemRow[]> {
    let q = supabase
      .from("os_ordens").select("*")
      .is("deleted_at", null)
      .order("numero", { ascending: false })
      .limit(opts?.limit ?? 200);
    if (opts?.status) q = q.eq("status_codigo", opts.status);
    if (opts?.clienteId) q = q.eq("cliente_id", opts.clienteId);
    if (opts?.busca && opts.busca.trim()) {
      const b = `%${opts.busca.trim()}%`;
      q = q.or(`codigo.ilike.${b},observacoes.ilike.${b}`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as OsOrdemRow[];
  },

  async obter(id: string): Promise<OsOrdemRow | null> {
    const { data, error } = await supabase
      .from("os_ordens").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as OsOrdemRow) ?? null;
  },

  async listarTarefas(osId: string): Promise<OsTarefaRow[]> {
    const { data, error } = await supabase
      .from("os_tarefas").select("*")
      .eq("os_id", osId).is("deleted_at", null)
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []) as OsTarefaRow[];
  },

  async listarEventos(osId: string, limit = 200): Promise<OsEventoRow[]> {
    const { data, error } = await supabase
      .from("os_eventos").select("*")
      .eq("os_id", osId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as OsEventoRow[];
  },
};

// ───────────────────── hooks de leitura ─────────────────────
export function useOsStatusCatalogo() {
  return useQuery({ queryKey: ["os", "status-catalogo"], queryFn: () => osRepo.listarStatus(), staleTime: 5 * 60_000 });
}
export function useOsList(opts?: { status?: string; clienteId?: string; busca?: string; limit?: number }) {
  return useQuery({ queryKey: ["os", "list", opts], queryFn: () => osRepo.listar(opts), staleTime: 30_000 });
}
export function useOs(id?: string | null) {
  return useQuery({ queryKey: ["os", "one", id], queryFn: () => osRepo.obter(id!), enabled: !!id });
}
export function useOsTarefas(osId?: string | null) {
  return useQuery({ queryKey: ["os", "tarefas", osId], queryFn: () => osRepo.listarTarefas(osId!), enabled: !!osId });
}
export function useOsEventos(osId?: string | null) {
  return useQuery({ queryKey: ["os", "eventos", osId], queryFn: () => osRepo.listarEventos(osId!), enabled: !!osId });
}

// ───────────────────── helpers de RPC ─────────────────────
async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(name, args);
  if (error) throw error;
  return data as T;
}

// ───────────────────── mutations ─────────────────────
export function useCriarOs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      cliente_id: string;
      proposta_id?: string | null;
      contrato_id?: string | null;
      pedido_venda_id?: string | null;
      projeto_id?: string | null;
      obra_id?: string | null;
      pipeline_id?: string | null;
      area_negocio_id?: string | null;
      ocorrencia_id?: string | null;
      tecnico_responsavel_id?: string | null;
      status_codigo?: string;
      data_prev_inicio?: string | null;
      data_prev_termino?: string | null;
      valor_orcado?: number;
      custo_orcado?: number;
      valor_em_pv?: number;
      observacoes?: string | null;
      idempotency_key?: string;
    }) => rpc<string>("rpc_os_criar", {
      p_cliente_id: p.cliente_id,
      p_proposta_id: p.proposta_id ?? null,
      p_contrato_id: p.contrato_id ?? null,
      p_pedido_venda_id: p.pedido_venda_id ?? null,
      p_projeto_id: p.projeto_id ?? null,
      p_obra_id: p.obra_id ?? null,
      p_pipeline_id: p.pipeline_id ?? null,
      p_area_negocio_id: p.area_negocio_id ?? null,
      p_ocorrencia_id: p.ocorrencia_id ?? null,
      p_tecnico_responsavel_id: p.tecnico_responsavel_id ?? null,
      p_status_codigo: p.status_codigo ?? "VISTORIA_PRE_CONTRATO",
      p_data_prev_inicio: p.data_prev_inicio ?? null,
      p_data_prev_termino: p.data_prev_termino ?? null,
      p_valor_orcado: p.valor_orcado ?? 0,
      p_custo_orcado: p.custo_orcado ?? 0,
      p_valor_em_pv: p.valor_em_pv ?? 0,
      p_observacoes: p.observacoes ?? null,
      p_idempotency_key: p.idempotency_key ?? null,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["os"] }),
  });
}

export function useAtualizarOs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; row_version: number; patch: Record<string, unknown> }) =>
      rpc("rpc_os_atualizar", { p_os_id: p.os_id, p_row_version: p.row_version, p_patch: p.patch }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["os", "one", v.os_id] });
      qc.invalidateQueries({ queryKey: ["os", "list"] });
    },
  });
}

export function useMudarStatusOs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; row_version: number; novo_status: string; motivo?: string }) =>
      rpc("rpc_os_mudar_status", {
        p_os_id: p.os_id, p_row_version: p.row_version, p_novo_status: p.novo_status, p_motivo: p.motivo ?? null,
      }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os"] }),
  });
}

export function useFinalizarOs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; row_version: number; observacao?: string }) =>
      rpc("rpc_os_finalizar", { p_os_id: p.os_id, p_row_version: p.row_version, p_observacao: p.observacao ?? null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["os"] }),
  });
}

export function useCancelarOs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; row_version: number; motivo: string }) =>
      rpc("rpc_os_cancelar", { p_os_id: p.os_id, p_row_version: p.row_version, p_motivo: p.motivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["os"] }),
  });
}

export function useExcluirOs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; motivo: string }) =>
      rpc("rpc_os_excluir", { p_os_id: p.os_id, p_motivo: p.motivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["os"] }),
  });
}

// ── tarefas ──
export function useCriarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      os_id: string; nome: string; descricao?: string | null; ordem?: number;
      tecnico_id?: string | null; data_prevista?: string | null;
      duracao_min?: number | null; obrigatorio?: boolean;
    }) => rpc<string>("rpc_os_tarefa_criar", {
      p_os_id: p.os_id, p_nome: p.nome,
      p_descricao: p.descricao ?? null, p_ordem: p.ordem ?? 0,
      p_modelo_id: null, p_formulario_id: null,
      p_tecnico_id: p.tecnico_id ?? null, p_funcao_tecnico_id: null,
      p_data_prevista: p.data_prevista ?? null,
      p_duracao_min: p.duracao_min ?? null, p_obrigatorio: !!p.obrigatorio,
    }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os", "tarefas", v.os_id] }),
  });
}
export function useAtualizarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { tarefa_id: string; os_id: string; row_version: number; patch: Record<string, unknown> }) =>
      rpc("rpc_os_tarefa_atualizar", { p_tarefa_id: p.tarefa_id, p_row_version: p.row_version, p_patch: p.patch }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os", "tarefas", v.os_id] }),
  });
}
export function useAtribuirTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { tarefa_id: string; os_id: string; row_version: number; tecnico_id: string }) =>
      rpc("rpc_os_tarefa_atribuir", {
        p_tarefa_id: p.tarefa_id, p_row_version: p.row_version,
        p_tecnico_id: p.tecnico_id, p_funcao_tecnico_id: null,
      }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os", "tarefas", v.os_id] }),
  });
}
export function useMudarStatusTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { tarefa_id: string; os_id: string; row_version: number; novo_status: OsTarefaStatus; motivo?: string }) =>
      rpc("rpc_os_tarefa_mudar_status", {
        p_tarefa_id: p.tarefa_id, p_row_version: p.row_version,
        p_novo_status: p.novo_status, p_motivo: p.motivo ?? null,
      }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os", "tarefas", v.os_id] }),
  });
}
export function useConcluirTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { tarefa_id: string; os_id: string; row_version: number; observacao?: string }) =>
      rpc("rpc_os_tarefa_concluir", {
        p_tarefa_id: p.tarefa_id, p_row_version: p.row_version, p_observacao: p.observacao ?? null,
      }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os", "tarefas", v.os_id] }),
  });
}

// ── PV / Evento ──
export function useVincularPv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; pedido_venda_id: string }) =>
      rpc("rpc_os_gerar_pv", { p_os_id: p.os_id, p_pedido_venda_id: p.pedido_venda_id }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os", "one", v.os_id] }),
  });
}
export function useRegistrarEventoOs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; tipo: string; descricao: string; tarefa_id?: string | null; payload?: unknown }) =>
      rpc("rpc_os_evento_registrar", {
        p_os_id: p.os_id, p_tarefa_id: p.tarefa_id ?? null,
        p_tipo: p.tipo, p_descricao: p.descricao, p_payload: (p.payload ?? {}) as never,
      }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["os", "eventos", v.os_id] }),
  });
}

// ═════════════════════════════════════════════════════════════════════
// E.OS.3.b+ — Controle Operacional de Obra
// ═════════════════════════════════════════════════════════════════════

export type OsCategoriaCusto =
  | "MATERIAL" | "MAO_OBRA" | "HOSPEDAGEM" | "COMBUSTIVEL"
  | "ALIMENTACAO" | "EQUIPAMENTO" | "TERCEIROS" | "OUTROS";

export const OS_CATEGORIAS: { codigo: OsCategoriaCusto; label: string }[] = [
  { codigo: "MATERIAL",    label: "Material" },
  { codigo: "MAO_OBRA",    label: "Mão de obra" },
  { codigo: "HOSPEDAGEM",  label: "Hospedagem" },
  { codigo: "COMBUSTIVEL", label: "Combustível" },
  { codigo: "ALIMENTACAO", label: "Alimentação" },
  { codigo: "EQUIPAMENTO", label: "Equipamento" },
  { codigo: "TERCEIROS",   label: "Terceiros" },
  { codigo: "OUTROS",      label: "Outros" },
];

export interface OsOrcadoVsRealizadoRow {
  os_id: string;
  categoria: OsCategoriaCusto;
  orcado: number;
  realizado: number;
  variacao_rs: number;
  variacao_pct: number | null;
  semaforo: "NEUTRO" | "OK" | "ATENCAO" | "ESTOURO";
}

export interface OsDashboardRow {
  os_id: string;
  codigo: string | null;
  status_codigo: string;
  cliente_id: string | null;
  contrato_id: string | null;
  projeto_id: string | null;
  obra_id: string | null;
  valor_orcado: number;
  valor_em_pv: number;
  custo_previsto: number;
  custo_realizado: number;
  tarefas_total: number;
  tarefas_concluidas: number;
  tarefas_pendentes: number;
  aderencia_pct: number;
  formularios_respondidos: number;
  anexos_total: number;
  servicos_faturaveis: number;
}

export interface OsProdutividadeRow {
  os_id: string;
  tarefas_total: number;
  tarefas_concluidas: number;
  tarefas_pendentes: number;
  minutos_previstos: number;
  minutos_realizados: number;
  aderencia_pct: number | null;
}

export interface OsCustoRealizadoRow {
  id: string;
  os_id: string;
  categoria: OsCategoriaCusto;
  valor: number;
  data_custo: string;
  descricao: string | null;
  origem_tipo: string | null;
  origem_id: string | null;
  fornecedor_id: string | null;
  created_by: string | null;
  created_at: string;
}

// ── leituras ──
export function useOsOrcadoVsRealizado(osId?: string | null) {
  return useQuery({
    queryKey: ["os", "orc-vs-real", osId],
    enabled: !!osId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_os_orcado_realizado").select("*").eq("os_id", osId!);
      if (error) throw error;
      return (data ?? []) as OsOrcadoVsRealizadoRow[];
    },
  });
}

export function useOsDashboard(osId?: string | null) {
  return useQuery({
    queryKey: ["os", "dashboard", osId],
    enabled: !!osId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_os_dashboard_kpis").select("*").eq("os_id", osId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as OsDashboardRow | null;
    },
  });
}

export function useOsProdutividade(osId?: string | null) {
  return useQuery({
    queryKey: ["os", "produtividade", osId],
    enabled: !!osId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_os_produtividade").select("*").eq("os_id", osId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as OsProdutividadeRow | null;
    },
  });
}

export function useOsCustosRealizados(osId?: string | null) {
  return useQuery({
    queryKey: ["os", "custos", osId],
    enabled: !!osId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos_realizados").select("*")
        .eq("os_id", osId!).is("deleted_at", null)
        .order("data_custo", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OsCustoRealizadoRow[];
    },
  });
}

// ── mutations ──
export function useLancarOrcamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { os_id: string; categoria: OsCategoriaCusto; valor: number; observacao?: string }) =>
      rpc("rpc_os_orcamento_lancar", {
        p_os_id: p.os_id, p_categoria: p.categoria,
        p_valor: p.valor, p_observacao: p.observacao ?? null,
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["os", "orc-vs-real", v.os_id] });
      qc.invalidateQueries({ queryKey: ["os", "dashboard", v.os_id] });
    },
  });
}

export function useLancarCustoRealizado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      os_id: string; categoria: OsCategoriaCusto; valor: number;
      data_custo?: string; descricao?: string;
      origem_tipo?: string; origem_id?: string; fornecedor_id?: string;
    }) => rpc("rpc_os_custo_lancar", {
      p_os_id: p.os_id, p_categoria: p.categoria, p_valor: p.valor,
      p_data_custo: p.data_custo ?? null, p_descricao: p.descricao ?? null,
      p_origem_tipo: p.origem_tipo ?? "MANUAL",
      p_origem_id: p.origem_id ?? null, p_fornecedor_id: p.fornecedor_id ?? null,
    }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["os", "custos", v.os_id] });
      qc.invalidateQueries({ queryKey: ["os", "orc-vs-real", v.os_id] });
      qc.invalidateQueries({ queryKey: ["os", "dashboard", v.os_id] });
    },
  });
}

// ── form templates ──
export interface OsFormularioTemplateRow {
  id: string; nome: string; tipo: string; descricao: string | null;
  campos: unknown; obrigatorio: boolean; ativo: boolean; versao: number;
}
export function useOsFormulariosTemplates() {
  return useQuery({
    queryKey: ["os", "form-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_formularios_definicao").select("*")
        .is("deleted_at", null).order("nome");
      if (error) throw error;
      return (data ?? []) as OsFormularioTemplateRow[];
    },
    staleTime: 60_000,
  });
}

export function useSalvarFormularioTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      id?: string | null; nome: string; tipo: string; descricao?: string;
      campos: unknown[]; obrigatorio?: boolean; ativo?: boolean;
    }) => rpc<string>("rpc_os_formulario_template_salvar", {
      p_id: p.id ?? null, p_nome: p.nome, p_tipo: p.tipo,
      p_descricao: p.descricao ?? null, p_campos: p.campos as never,
      p_obrigatorio: !!p.obrigatorio, p_ativo: p.ativo ?? true,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["os", "form-templates"] }),
  });
}
