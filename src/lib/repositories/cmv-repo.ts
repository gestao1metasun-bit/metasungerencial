/**
 * D15.3.d — CMV oficial (view v_cmv_oficial)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./error-log-repo";

export interface CmvLinha {
  centro_resultado_id: string | null;
  natureza_id: string | null;
  fornecedor_id: string | null;
  competencia: string;
  qtde_titulos: number;
  custo_total: number;
  custo_realizado: number;
  custo_previsto: number;
}

export function useCmvOficial(opts?: { from?: string; to?: string; centro_id?: string }) {
  return useQuery({
    queryKey: ["cmv-oficial", opts?.from ?? "", opts?.to ?? "", opts?.centro_id ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("v_cmv_oficial" as never)
        .select("*")
        .order("competencia", { ascending: false })
        .limit(2000);
      if (opts?.from) q = q.gte("competencia", opts.from);
      if (opts?.to) q = q.lte("competencia", opts.to);
      if (opts?.centro_id) q = q.eq("centro_resultado_id", opts.centro_id);
      const { data, error } = await q;
      if (error) {
        await logError({ modulo: "financeiro", acao: "cmv.list", mensagem: error.message, payload: opts, severidade: "error" });
        throw error;
      }
      return (data ?? []) as CmvLinha[];
    },
    staleTime: 30_000,
  });
}
