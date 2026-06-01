/**
 * Comercial C3 + C4 — Workflow Excecao R$/kWp + Transferencia de Carteira
 *
 * Hooks oficiais para as RPCs:
 *   - rpc_proposta_solicitar_aprovacao_excecao
 *   - rpc_proposta_decidir_aprovacao_excecao
 *   - rpc_carteira_transferir_individual
 *   - rpc_carteira_transferir_lote
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withPerf } from "@/lib/perf";

export type EscopoCarteira = "lead" | "proposta" | "contrato" | "cliente";
export type DecisaoExcecao = "APROVADA" | "NEGADA" | "CANCELADA";

// ----------------------------------------------------------------------------
// C3 — Excecao R$/kWp
// ----------------------------------------------------------------------------

export function useSolicitarAprovacaoExcecao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { propostaId: string; motivo: string }) => {
      const { data, error } = await withPerf("rpc.proposta_solicitar_aprovacao_excecao", () => supabase.rpc(
        "rpc_proposta_solicitar_aprovacao_excecao",
        { p_proposta_id: input.propostaId, p_motivo: input.motivo },
      ));
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["propostas"] });
      qc.invalidateQueries({ queryKey: ["workflow_aprovacoes"] });
    },
  });
}

export function useDecidirAprovacaoExcecao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      aprovacaoId: string;
      decisao: DecisaoExcecao;
      motivo: string;
    }) => {
      const { error } = await withPerf("rpc.proposta_decidir_aprovacao_excecao", () => supabase.rpc(
        "rpc_proposta_decidir_aprovacao_excecao",
        {
          p_aprovacao_id: input.aprovacaoId,
          p_decisao: input.decisao,
          p_motivo: input.motivo,
        },
      ));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["propostas"] });
      qc.invalidateQueries({ queryKey: ["workflow_aprovacoes"] });
    },
  });
}

export function useAprovacoesExcecaoPendentes() {
  return useQuery({
    queryKey: ["workflow_aprovacoes", "proposta_excecao_rs_kwp", "PENDENTE"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_aprovacoes")
        .select("*")
        .eq("tipo_operacao", "proposta_excecao_rs_kwp")
        .eq("status", "PENDENTE")
        .order("solicitado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ----------------------------------------------------------------------------
// C4 — Transferencia de Carteira
// ----------------------------------------------------------------------------

export function useTransferirCarteiraIndividual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      escopo: EscopoCarteira;
      registroId: string;
      vendedorDestinoId: string;
      motivo: string;
    }) => {
      const { data, error } = await withPerf("rpc.carteira_transferir_individual", () => supabase.rpc(
        "rpc_carteira_transferir_individual",
        {
          p_escopo: input.escopo,
          p_registro_id: input.registroId,
          p_vendedor_destino_id: input.vendedorDestinoId,
          p_motivo: input.motivo,
        },
      ));
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [vars.escopo + "s"] });
      qc.invalidateQueries({ queryKey: ["carteira_transferencias"] });
    },
  });
}

export function useTransferirCarteiraLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      escopo: EscopoCarteira;
      registroIds: string[];
      vendedorDestinoId: string;
      motivo: string;
    }) => {
      const { data, error } = await withPerf("rpc.carteira_transferir_lote", () => supabase.rpc(
        "rpc_carteira_transferir_lote",
        {
          p_escopo: input.escopo,
          p_registro_ids: input.registroIds,
          p_vendedor_destino_id: input.vendedorDestinoId,
          p_motivo: input.motivo,
        },
      ));
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [vars.escopo + "s"] });
      qc.invalidateQueries({ queryKey: ["carteira_transferencias"] });
    },
  });
}

export function useHistoricoCarteira(filtros?: {
  escopo?: EscopoCarteira;
  registroId?: string;
  vendedorId?: string;
}) {
  return useQuery({
    queryKey: ["carteira_transferencias", filtros],
    queryFn: async () => {
      let q = supabase
        .from("comercial_carteira_transferencias")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(500);
      if (filtros?.escopo) q = q.eq("escopo", filtros.escopo);
      if (filtros?.registroId) q = q.eq("registro_id", filtros.registroId);
      if (filtros?.vendedorId) {
        q = q.or(
          `vendedor_origem_id.eq.${filtros.vendedorId},vendedor_destino_id.eq.${filtros.vendedorId}`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
