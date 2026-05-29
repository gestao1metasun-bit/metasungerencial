/**
 * D17.UI Fase 5b — Operações Financeiras (repo oficial)
 *
 * Acesso Supabase para operacoes_financeiras + _parcelas + _eventos.
 * Toda mutação de status passa pelas RPCs oficiais (Onda F2):
 *   rpc_op_fin_criar / _aprovar / _liberar / _renegociar / _cancelar /
 *   _gerar_parcelas / _estornar_recebimento.
 *
 * NÃO toca contratos/PV/propostas/engenharia/comissão.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/observability";
import { withPerf } from "@/lib/perf";
const logError = (op: string, msg: string, meta?: Record<string, unknown>) =>
  logger.error("op-fin", op, msg, meta);

export type OpFinTipo =
  | "EMPRESTIMO_COLABORADOR"
  | "EMPRESTIMO_CLIENTE"
  | "EMPRESTIMO_FORNECEDOR"
  | "EMPRESTIMO_SOCIO_EMPRESA"
  | "EMPRESTIMO_EMPRESA_TERCEIRO"
  | "APORTE_CAPITAL"
  | "CAPITAL_DE_GIRO"
  | "APLICACAO_FINANCEIRA";

export type OpFinStatus =
  | "RASCUNHO" | "EM_APROVACAO" | "APROVADA" | "LIBERADA"
  | "EM_PAGAMENTO" | "QUITADA" | "RENEGOCIADA" | "CANCELADA";

export interface OperacaoFinanceira {
  id: string;
  codigo: string | null;
  tipo: OpFinTipo;
  status: OpFinStatus;
  natureza_caixa: "ENTRADA" | "SAIDA";
  valor_total: number;
  data_operacao: string;
  qtd_parcelas: number;
  finalidade: string | null;
  observacoes: string | null;
  instituicao: string | null;
  banco_contrato: string | null;
  socio_nome: string | null;
  terceiro_nome: string | null;
  colaborador_nome: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpFinEvento {
  id: string;
  operacao_id: string;
  evento: string;
  motivo: string | null;
  detalhes: Record<string, unknown>;
  ator: string | null;
  criado_em: string;
}

export interface OpFinParcela {
  id: string;
  operacao_id: string;
  numero: number;
  valor: number;
  vencimento: string;
  competencia: string | null;
  observacao: string | null;
  titulo_id: string | null;
}

/* ───────────────── queries ───────────────── */

export interface ListFilter {
  tipos?: OpFinTipo[];
  status?: OpFinStatus[];
  search?: string;
  dataInicio?: string;
  dataFim?: string;
  apenasParceladas?: boolean;
}

export function useOperacoesFinanceiras(filter: ListFilter = {}) {
  return useQuery({
    queryKey: ["op-fin", "list", filter],
    queryFn: async () => {
      let q = supabase
        .from("operacoes_financeiras")
        .select("*")
        .is("deleted_at", null)
        .order("data_operacao", { ascending: false })
        .limit(500);

      if (filter.tipos?.length) q = q.in("tipo", filter.tipos);
      if (filter.status?.length) q = q.in("status", filter.status);
      if (filter.dataInicio) q = q.gte("data_operacao", filter.dataInicio);
      if (filter.dataFim) q = q.lte("data_operacao", filter.dataFim);
      if (filter.apenasParceladas) q = q.gt("qtd_parcelas", 1);
      if (filter.search) {
        const s = filter.search.trim();
        q = q.or(
          `codigo.ilike.%${s}%,finalidade.ilike.%${s}%,observacoes.ilike.%${s}%,instituicao.ilike.%${s}%,banco_contrato.ilike.%${s}%,socio_nome.ilike.%${s}%,terceiro_nome.ilike.%${s}%,colaborador_nome.ilike.%${s}%`,
        );
      }

      const { data, error } = await q;
      if (error) {
        logError("op-fin:list", error.message, { filter });
        throw error;
      }
      return (data ?? []) as OperacaoFinanceira[];
    },
    staleTime: 30_000,
  });
}

export function useOpFinEventos(operacaoId: string | null) {
  return useQuery({
    queryKey: ["op-fin", "eventos", operacaoId],
    enabled: !!operacaoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_financeiras_eventos")
        .select("*")
        .eq("operacao_id", operacaoId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OpFinEvento[];
    },
  });
}

export function useOpFinParcelas(operacaoId: string | null) {
  return useQuery({
    queryKey: ["op-fin", "parcelas", operacaoId],
    enabled: !!operacaoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_financeiras_parcelas")
        .select("*")
        .eq("operacao_id", operacaoId!)
        .order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OpFinParcela[];
    },
  });
}

/* ───────────────── mutations (via RPC) ───────────────── */

export interface CriarPayload {
  tipo: OpFinTipo;
  natureza_caixa: "ENTRADA" | "SAIDA";
  natureza_id: string;
  centro_resultado_id: string;
  conta_id: string;
  valor_total: number;
  data_operacao: string;
  qtd_parcelas: number;
  finalidade?: string;
  observacoes?: string;
  instituicao?: string;
  banco_contrato?: string;
  competencia?: string;
  // contraparte estruturada
  cliente_id?: string;
  fornecedor_id?: string;
  colaborador_user_id?: string;
  colaborador_nome?: string;
  socio_nome?: string;
  terceiro_nome?: string;
  terceiro_documento?: string;
  juros_pct?: number;
}

export function useCriarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CriarPayload) => {
      const requestId = crypto.randomUUID();
      return withPerf("rpc.op_fin_criar", async () => {
        const { data, error } = await supabase.rpc("rpc_op_fin_criar", {
          _request_id: requestId,
          _payload: payload as never,
        });
        if (error) {
          logError("op-fin:criar", error.message, { payload });
          throw error;
        }
        return data as unknown as { id: string; codigo: string; status: string };
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-fin"] }),
  });
}

/** Atualiza valor/vencimento/competência/observação de uma parcela. */
export function useUpdateParcela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, valor, vencimento, competencia, observacao }: {
      id: string; valor?: number; vencimento?: string;
      competencia?: string | null; observacao?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (valor !== undefined) patch.valor = valor;
      if (vencimento !== undefined) patch.vencimento = vencimento;
      if (competencia !== undefined) patch.competencia = competencia;
      if (observacao !== undefined) patch.observacao = observacao;
      if (Object.keys(patch).length === 0) return;
      const { error } = await supabase
        .from("operacoes_financeiras_parcelas")
        .update(patch)
        .eq("id", id);
      if (error) {
        logError("op-fin:update-parcela", error.message, { id });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-fin"] }),
  });
}

export function useAprovarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao?: string }) => {
      const { data, error } = await supabase.rpc("rpc_op_fin_aprovar", {
        _request_id: crypto.randomUUID(),
        _operacao_id: id,
        _observacao: observacao ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-fin"] }),
  });
}

export function useLiberarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return withPerf("rpc.op_fin_liberar", async () => {
        const { data, error } = await supabase.rpc("rpc_op_fin_liberar", {
          _request_id: crypto.randomUUID(),
          _operacao_id: id,
        });
        if (error) {
          logError("op-fin:liberar", error.message, { id });
          throw error;
        }
        return data;
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-fin"] }),
  });
}

export function useCancelarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error } = await supabase.rpc("rpc_op_fin_cancelar", {
        _request_id: crypto.randomUUID(),
        _operacao_id: id,
        _motivo: motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-fin"] }),
  });
}

export function useGerarParcelas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, vencimentoPrimeiro, intervaloDias,
    }: { id: string; vencimentoPrimeiro: string; intervaloDias?: number }) => {
      const { data, error } = await supabase.rpc("rpc_op_fin_gerar_parcelas", {
        _request_id: crypto.randomUUID(),
        _operacao_id: id,
        _vencimento_primeiro: vencimentoPrimeiro,
        _intervalo_dias: intervaloDias ?? 30,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-fin"] }),
  });
}
