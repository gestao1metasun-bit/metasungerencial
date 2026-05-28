/**
 * D15.3.d — Repositório oficial de Fechamentos de Período (Supabase)
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./error-log-repo";

export interface FechamentoPeriodo {
  id: string;
  conta_id: string;
  competencia: string; // YYYY-MM-01
  status: "ABERTO" | "FECHADO" | "REABERTO";
  saldo_apurado: number;
  fechado_em: string | null;
  fechado_por: string | null;
  reaberto_em: string | null;
  reaberto_por: string | null;
  motivo_reabertura: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  row_version: number;
}

const QK = ["fechamentos-periodo"] as const;

export function useFechamentos(opts?: { conta_id?: string }) {
  return useQuery({
    queryKey: [...QK, opts?.conta_id ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("fechamentos_periodo")
        .select("*")
        .is("deleted_at", null)
        .order("competencia", { ascending: false })
        .limit(500);
      if (opts?.conta_id) q = q.eq("conta_id", opts.conta_id);
      const { data, error } = await q;
      if (error) {
        await logError({ modulo: "financeiro", acao: "fechamentos.list", mensagem: error.message, payload: opts, severidade: "error" });
        throw error;
      }
      return (data ?? []) as FechamentoPeriodo[];
    },
    staleTime: 30_000,
  });
}

export function useAbrirFechamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { conta_id: string; competencia: string; observacoes?: string }) => {
      const { data, error } = await supabase.rpc("rpc_fechamento_abrir", {
        p_conta_id: i.conta_id,
        p_competencia: i.competencia,
        p_observacoes: i.observacoes ?? null,
      } as never);
      if (error) {
        await logError({ modulo: "financeiro", acao: "fechamentos.abrir", mensagem: error.message, payload: i, severidade: "error" });
        throw error;
      }
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useFecharFechamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { id: string; saldo_apurado: number }) => {
      const { error } = await supabase.rpc("rpc_fechamento_fechar", {
        p_id: i.id,
        p_saldo_apurado: i.saldo_apurado,
      } as never);
      if (error) {
        await logError({ modulo: "financeiro", acao: "fechamentos.fechar", mensagem: error.message, payload: i, severidade: "error" });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useReabrirFechamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { id: string; motivo: string }) => {
      const { error } = await supabase.rpc("rpc_fechamento_reabrir", {
        p_id: i.id,
        p_motivo: i.motivo,
      } as never);
      if (error) {
        await logError({ modulo: "financeiro", acao: "fechamentos.reabrir", mensagem: error.message, payload: i, severidade: "error" });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
