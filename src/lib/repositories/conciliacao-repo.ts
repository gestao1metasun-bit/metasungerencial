/**
 * D15.3.d — Repositório oficial de Conciliação Bancária (Supabase)
 * Fonte: tabela extrato_banco + RPCs rpc_extrato_*
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withPerf } from "@/lib/perf";
import { logError } from "./error-log-repo";

export interface ExtratoLinha {
  id: string;
  conta_id: string;
  data: string;
  descricao: string;
  valor: number;
  documento: string | null;
  status: "PENDENTE" | "CONCILIADO" | "IGNORADO";
  titulo_id: string | null;
  movimento_id: string | null;
  observacao: string | null;
}

const QK = ["extrato-banco"] as const;

export function useExtratoConta(conta_id: string | null | undefined, opts?: { status?: string }) {
  return useQuery({
    queryKey: [...QK, conta_id ?? "none", opts?.status ?? "all"],
    enabled: !!conta_id,
    queryFn: async () => {
      let q = supabase
        .from("extrato_banco")
        .select("*")
        .eq("conta_id", conta_id!)
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(500);
      if (opts?.status) q = q.eq("status", opts.status);
      const { data, error } = await q;
      if (error) {
        await logError({ modulo: "financeiro", acao: "conciliacao.list", mensagem: error.message, payload: { conta_id }, severidade: "error" });
        throw error;
      }
      return (data ?? []) as ExtratoLinha[];
    },
    staleTime: 15_000,
  });
}

export function useConciliarExtrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { extrato_id: string; titulo_id?: string; movimento_id?: string; observacao?: string }) => {
      const { error } = await withPerf("rpc.extrato_conciliar", () => supabase.rpc("rpc_extrato_conciliar", {
        p_extrato_id: i.extrato_id,
        p_titulo_id: i.titulo_id ?? null,
        p_movimento_id: i.movimento_id ?? null,
        p_observacao: i.observacao ?? null,
      } as never));
      if (error) {
        await logError({ modulo: "financeiro", acao: "conciliacao.conciliar", mensagem: error.message, payload: i, severidade: "error" });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDesconciliarExtrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { extrato_id: string; motivo: string }) => {
      const { error } = await withPerf("rpc.extrato_desconciliar", () => supabase.rpc("rpc_extrato_desconciliar", {
        p_extrato_id: i.extrato_id,
        p_motivo: i.motivo,
      } as never));
      if (error) {
        await logError({ modulo: "financeiro", acao: "conciliacao.desconciliar", mensagem: error.message, payload: i, severidade: "error" });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useIgnorarExtrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { extrato_id: string; motivo: string }) => {
      const { error } = await withPerf("rpc.extrato_ignorar", () => supabase.rpc("rpc_extrato_ignorar", {
        p_extrato_id: i.extrato_id,
        p_motivo: i.motivo,
      } as never));
      if (error) {
        await logError({ modulo: "financeiro", acao: "conciliacao.ignorar", mensagem: error.message, payload: i, severidade: "error" });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
