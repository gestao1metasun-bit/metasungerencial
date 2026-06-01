/**
 * Onda C6 — Repositório de Comissão Enterprise.
 *
 * Toda transição passa por RPCs oficiais (SECURITY DEFINER).
 * Não há, nem deve haver, UPDATE direto em `comercial_comissoes` —
 * a trigger `tg_comissoes_bloqueia_edicao_direta` recusa fora de
 * `app.via_comissao_rpc='true'`.
 *
 * Ciclo: PREVISTA → LIBERADA → PAGA. Off-ramps: CANCELADA / ESTORNADA.
 * Reabertura (CANCELADA/ESTORNADA → PREVISTA) é só admin.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withPerf } from "@/lib/perf";
import { toast } from "sonner";

export type ComissaoStatus =
  | "PREVISTA" | "LIBERADA" | "PAGA" | "CANCELADA" | "ESTORNADA";

export type Comissao = {
  id: string;
  contrato_id: string;
  assinatura_evento_id: string | null;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  percentual: number;
  valor_base: number;
  valor_calculado: number;
  status: ComissaoStatus;
  observacao: string | null;
  prevista_em: string;
  liberada_em: string | null;
  paga_em: string | null;
  cancelada_em: string | null;
  motivo_cancelamento: string | null;
  estornada_em: string | null;
  motivo_estorno: string | null;
  row_version: number;
  created_at: string;
  updated_at: string;
};

export type ComissaoEvento = {
  id: string;
  comissao_id: string;
  acao:
    | "CRIADA" | "LIBERADA" | "MARCADA_PAGA" | "CANCELADA"
    | "ESTORNADA" | "PERCENTUAL_ALTERADO" | "REABERTA";
  status_anterior: ComissaoStatus | null;
  status_novo: ComissaoStatus | null;
  valor_anterior: number | null;
  valor_novo: number | null;
  percentual_anterior: number | null;
  percentual_novo: number | null;
  motivo: string | null;
  usuario_id: string;
  permissao_usada: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function useComissoesPorContrato(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["comissoes", "contrato", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_comissoes" as never)
        .select("*")
        .eq("contrato_id", contratoId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Comissao[];
    },
  });
}

export function useComissaoEventos(comissaoId: string | undefined) {
  return useQuery({
    queryKey: ["comissao-eventos", comissaoId],
    enabled: !!comissaoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_comissao_eventos" as never)
        .select("*")
        .eq("comissao_id", comissaoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ComissaoEvento[];
    },
  });
}

function makeRpc(
  rpcName:
    | "rpc_comissao_liberar"
    | "rpc_comissao_marcar_paga"
    | "rpc_comissao_cancelar"
    | "rpc_comissao_estornar"
    | "rpc_comissao_reabrir",
  successMsg: string,
) {
  return function useRpc() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { comissaoId: string; motivo?: string }) => {
        const { data, error } = await withPerf(`rpc.${rpcName}`, () => supabase.rpc(
          rpcName as never,
          { p_comissao_id: input.comissaoId, p_motivo: input.motivo ?? null } as never,
        ));
        if (error) throw error;
        return data as unknown as string;
      },
      onSuccess: () => {
        toast.success(successMsg);
        qc.invalidateQueries({ queryKey: ["comissoes"] });
        qc.invalidateQueries({ queryKey: ["comissao-eventos"] });
      },
      onError: (e: Error) => toast.error(`Falha: ${e.message}`),
    });
  };
}

export const useLiberarComissao    = makeRpc("rpc_comissao_liberar",    "Comissão liberada.");
export const useMarcarComissaoPaga = makeRpc("rpc_comissao_marcar_paga","Comissão marcada como paga.");
export const useCancelarComissao   = makeRpc("rpc_comissao_cancelar",   "Comissão cancelada.");
export const useEstornarComissao   = makeRpc("rpc_comissao_estornar",   "Comissão estornada.");
export const useReabrirComissao    = makeRpc("rpc_comissao_reabrir",    "Comissão reaberta.");

export function useAlterarPercentualComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { comissaoId: string; novoPercentual: number; motivo: string }) => {
      const { data, error } = await withPerf("rpc.comissao_alterar_percentual", () => supabase.rpc(
        "rpc_comissao_alterar_percentual" as never,
        {
          p_comissao_id: input.comissaoId,
          p_novo_percentual: input.novoPercentual,
          p_motivo: input.motivo,
        } as never,
      ));
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      toast.success("Percentual de comissão atualizado.");
      qc.invalidateQueries({ queryKey: ["comissoes"] });
      qc.invalidateQueries({ queryKey: ["comissao-eventos"] });
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });
}
