/**
 * D15.3.d — Fluxo de Caixa oficial (view v_fluxo_caixa_oficial)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./error-log-repo";

export interface FluxoCaixaLinha {
  data: string;
  conta_id: string | null;
  tipo_lancamento: string;
  natureza_temporal: string | null;
  natureza_id: string | null;
  centro_resultado_id: string | null;
  qtde: number;
  total: number;
}

export function useFluxoCaixaOficial(opts?: { from?: string; to?: string; conta_id?: string }) {
  return useQuery({
    queryKey: ["fluxo-caixa-oficial", opts?.from ?? "", opts?.to ?? "", opts?.conta_id ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("v_fluxo_caixa_oficial" as never)
        .select("*")
        .order("data", { ascending: true })
        .limit(5000);
      if (opts?.from) q = q.gte("data", opts.from);
      if (opts?.to) q = q.lte("data", opts.to);
      if (opts?.conta_id) q = q.eq("conta_id", opts.conta_id);
      const { data, error } = await q;
      if (error) {
        await logError({ modulo: "financeiro", acao: "fluxo-caixa.list", mensagem: error.message, payload: opts, severidade: "error" });
        throw error;
      }
      return (data ?? []) as FluxoCaixaLinha[];
    },
    staleTime: 30_000,
  });
}
