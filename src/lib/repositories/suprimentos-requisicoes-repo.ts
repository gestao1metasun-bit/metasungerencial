/**
 * D20.SUP.2.UI — Repositório oficial das Requisições de Suprimentos.
 *
 * Toda mutação passa pelas 12 RPCs SECURITY DEFINER (flag de sessão
 * `app.via_sup_req_rpc` garantida pelo backend). Esta camada apenas
 * encaminha payloads e invalida cache.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SupReqTipo = "MATERIAL" | "SERVICO";
export type SupReqStatus =
  | "RASCUNHO" | "ENVIADA" | "EM_APROVACAO" | "APROVADA" | "REPROVADA"
  | "RETORNADA" | "AGUARDANDO_ESTOQUE" | "EM_SEPARACAO"
  | "AGUARDANDO_COMPRA" | "EM_COMPRA"
  | "PARCIALMENTE_ATENDIDA" | "ATENDIDA" | "CANCELADA";
export type SupReqPrioridade = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export type RequisicaoResumoRow =
  Database["public"]["Views"]["v_suprimentos_requisicoes_resumo"]["Row"];
export type RequisicaoFullRow =
  Database["public"]["Tables"]["suprimentos_requisicoes"]["Row"];
export type RequisicaoItemRow =
  Database["public"]["Tables"]["suprimentos_requisicao_itens"]["Row"];
export type RequisicaoEventoRow =
  Database["public"]["Tables"]["suprimentos_requisicao_eventos"]["Row"];

const KEY = "suprimentos-requisicoes";

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export function useRequisicoes(filters?: {
  search?: string;
  tipo?: SupReqTipo | null;
  status?: SupReqStatus | null;
}) {
  return useQuery({
    queryKey: [KEY, "list", filters ?? {}],
    queryFn: async (): Promise<RequisicaoResumoRow[]> => {
      let q = supabase
        .from("v_suprimentos_requisicoes_resumo")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(500);

      if (filters?.tipo) q = q.eq("tipo", filters.tipo);
      if (filters?.status) q = q.eq("status", filters.status);

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as RequisicaoResumoRow[];
      const s = (filters?.search ?? "").trim().toLowerCase();
      if (s) {
        rows = rows.filter((r) => String(r.numero ?? "").includes(s));
      }
      return rows;
    },
    staleTime: 30_000,
  });
}

export function useRequisicaoDetalhe(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: [KEY, "detalhe", id],
    queryFn: async () => {
      const [head, itens, eventos] = await Promise.all([
        supabase.from("suprimentos_requisicoes").select("*").eq("id", id!).maybeSingle(),
        supabase.from("suprimentos_requisicao_itens").select("*").eq("requisicao_id", id!).order("ordem"),
        supabase.from("suprimentos_requisicao_eventos").select("*").eq("requisicao_id", id!).order("data_hora", { ascending: false }),
      ]);
      if (head.error) throw head.error;
      if (itens.error) throw itens.error;
      if (eventos.error) throw eventos.error;
      return {
        cabecalho: (head.data ?? null) as RequisicaoFullRow | null,
        itens: (itens.data ?? []) as RequisicaoItemRow[],
        eventos: (eventos.data ?? []) as RequisicaoEventoRow[],
      };
    },
    staleTime: 10_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS (cada uma reflete uma RPC oficial)
// ─────────────────────────────────────────────────────────────────────────────

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [KEY] });
}

type CriarPayload = {
  tipo: SupReqTipo;
  prioridade?: SupReqPrioridade;
  setor?: string | null;
  data_necessidade?: string | null;
  justificativa?: string | null;
  os_id?: string | null;
  obra_id?: string | null;
  projeto_id?: string | null;
  cliente_id?: string | null;
  centro_custo_id?: string | null;
  centro_resultado_id?: string | null;
  itens: Array<{
    descricao: string;
    unidade?: string;
    quantidade_solicitada: number;
    valor_estimado_unitario?: number;
    item_estoque_id?: string | null;
    fornecedor_sugerido_id?: string | null;
    observacao?: string | null;
  }>;
};

export function useCriarRequisicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CriarPayload) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_criar", {
        p_payload: payload as never,
      });
      if (error) throw error;
      return data as unknown as { id: string; numero: number };
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useAtualizarRequisicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; payload: Partial<CriarPayload> }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_atualizar", {
        p_id: args.id,
        p_payload: args.payload as never,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

function makeSimpleMutation(rpc: string) {
  return function useSimples() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { data, error } = await supabase.rpc(rpc as never, { p_id: id } as never);
        if (error) throw error;
        return data;
      },
      onSuccess: () => invalidate(qc),
    });
  };
}

export const useEnviarRequisicao = makeSimpleMutation("rpc_sup_requisicao_enviar");
export const useVerificarEstoque = makeSimpleMutation("rpc_sup_requisicao_verificar_estoque");

export function useAprovarRequisicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; valor_aprovado?: number | null; observacao?: string | null }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_aprovar", {
        p_id: args.id,
        p_valor_aprovado: args.valor_aprovado ?? undefined,
        p_observacao: args.observacao ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

function makeMotivoMutation(rpc: string) {
  return function useMotivo() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (args: { id: string; motivo: string }) => {
        const { data, error } = await supabase.rpc(rpc as never, {
          p_id: args.id, p_motivo: args.motivo,
        } as never);
        if (error) throw error;
        return data;
      },
      onSuccess: () => invalidate(qc),
    });
  };
}

export const useReprovarRequisicao = makeMotivoMutation("rpc_sup_requisicao_reprovar");
export const useRetornarRequisicao = makeMotivoMutation("rpc_sup_requisicao_retornar");
export const useCancelarRequisicao = makeMotivoMutation("rpc_sup_requisicao_cancelar");

// ─────────────────────────────────────────────────────────────────────────────
// D20.SUP.3 — workflow estoque (reservar / entregar / devolver)
// ─────────────────────────────────────────────────────────────────────────────

export type VerificacaoEstoqueItem = {
  item_id: string;
  descricao: string;
  unidade: string | null;
  item_estoque_id: string | null;
  qtd_solicitada: number;
  qtd_aprovada: number;
  qtd_reservada: number;
  qtd_entregue: number;
  qtd_devolvida: number;
  reserva_id: string | null;
  movimento_baixa_id: string | null;
  saldo_fisico: number;
  saldo_reservado_total: number;
  saldo_disponivel: number;
  falta: number;
  status_atendimento:
    | "SEM_VINCULO" | "NAO_APROVADO" | "RESERVADO"
    | "DISPONIVEL" | "PARCIAL" | "INDISPONIVEL";
};

export function useVerificarEstoqueRPC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<VerificacaoEstoqueItem[]> => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_verificar_estoque", { p_id: id });
      if (error) throw error;
      return (data as unknown as VerificacaoEstoqueItem[]) ?? [];
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useReservarRequisicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_reservar", { p_id: id });
      if (error) throw error;
      return data as unknown as { itens_reservados: number; detalhe: unknown };
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useEntregarRequisicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; observacao?: string | null }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_entregar", {
        p_id: args.id,
        p_observacao: args.observacao ?? undefined,
      });
      if (error) throw error;
      return data as unknown as { itens_entregues: number; detalhe: unknown };
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDevolverItemRequisicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { item_id: string; quantidade: number; motivo: string }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_devolver_item", {
        p_item_id: args.item_id,
        p_quantidade: args.quantidade,
        p_motivo: args.motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

// View consolidada Requisições × O.S. (aba Materiais da O.S.)
export type OsRequisicaoResumoRow = {
  requisicao_id: string;
  numero: number;
  tipo: SupReqTipo;
  status: SupReqStatus;
  prioridade: SupReqPrioridade | null;
  os_id: string;
  criado_em: string;
  qtd_itens: number;
  total_solicitado: number;
  total_aprovado: number;
  total_reservado: number;
  total_entregue: number;
  total_devolvido: number;
  custo_material_total: number;
};

export function useOsRequisicoes(osId: string | null) {
  return useQuery({
    enabled: !!osId,
    queryKey: ["os-requisicoes", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_os_requisicoes_resumo" as never)
        .select("*")
        .eq("os_id", osId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OsRequisicaoResumoRow[];
    },
    staleTime: 15_000,
  });
}

export function useEnviarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; justificativa?: string | null }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_enviar_compra", {
        p_id: args.id, p_justificativa: args.justificativa ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useAtenderParcial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; payload: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_atender_parcial", {
        p_id: args.id, p_payload: args.payload as never,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useAtenderTotal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; payload?: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_atender_total", {
        p_id: args.id, p_payload: (args.payload ?? {}) as never,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useRegistrarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; tipo_evento: string; observacao: string; payload?: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc("rpc_sup_requisicao_evento_registrar", {
        p_id: args.id,
        p_tipo_evento: args.tipo_evento,
        p_observacao: args.observacao,
        p_payload: (args.payload ?? {}) as never,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de apresentação
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<SupReqStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  EM_APROVACAO: "Em aprovação",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  RETORNADA: "Retornada",
  AGUARDANDO_ESTOQUE: "Aguardando estoque",
  EM_SEPARACAO: "Em separação",
  AGUARDANDO_COMPRA: "Aguardando compra",
  EM_COMPRA: "Em compra",
  PARCIALMENTE_ATENDIDA: "Parcialmente atendida",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
};

export const STATUS_TONE: Record<SupReqStatus, "muted" | "info" | "warning" | "success" | "danger" | "primary"> = {
  RASCUNHO: "muted",
  ENVIADA: "info",
  EM_APROVACAO: "warning",
  APROVADA: "success",
  REPROVADA: "danger",
  RETORNADA: "warning",
  AGUARDANDO_ESTOQUE: "warning",
  EM_SEPARACAO: "info",
  AGUARDANDO_COMPRA: "warning",
  EM_COMPRA: "info",
  PARCIALMENTE_ATENDIDA: "primary",
  ATENDIDA: "success",
  CANCELADA: "danger",
};

export const STATUS_OPTIONS: { value: SupReqStatus; label: string }[] =
  (Object.keys(STATUS_LABEL) as SupReqStatus[]).map((v) => ({ value: v, label: STATUS_LABEL[v] }));

export const PRIORIDADE_OPTIONS: { value: SupReqPrioridade; label: string }[] = [
  { value: "BAIXA", label: "Baixa" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];
