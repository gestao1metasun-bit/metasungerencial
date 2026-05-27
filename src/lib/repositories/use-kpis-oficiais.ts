/**
 * D14.1 — Enterprise Data Truth.
 *
 * Hook único que lê as views v_kpis_*_oficial (verdade oficial Meta Sun).
 * Substitui cálculo paralelo no client para qualquer dashboard/analytics.
 *
 * Regras:
 *  - Views são SQL declarativo sobre v_reconciliacao_*; nunca calculamos
 *    KPI no JS quando existe view oficial.
 *  - Cada KPI traz status (OK | Atencao | Critico), origem provável e
 *    divergência vs valor_dashboard — permite drill-down e auditoria.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type KpiOficialStatus = "OK" | "Atencao" | "Critico" | string;

export interface KpiOficialRow {
  indicador: string;
  valor: number;
  valor_dashboard: number | null;
  diferenca: number | null;
  perc_divergencia: number | null;
  status: KpiOficialStatus;
  origem_provavel: string | null;
  sugestao: string | null;
  verificado_em: string;
}

export type KpiArea =
  | "financeiro"
  | "comercial"
  | "engenharia"
  | "estoque"
  | "aprovacoes"
  | "financiamentos";

const VIEW_BY_AREA: Record<KpiArea, string> = {
  financeiro:     "v_kpis_financeiro_oficial",
  comercial:      "v_kpis_comercial_oficial",
  engenharia:     "v_kpis_engenharia_oficial",
  estoque:        "v_kpis_estoque_oficial",
  aprovacoes:     "v_kpis_aprovacoes_oficial",
  financiamentos: "v_kpis_financiamentos_oficial",
};

const COMMON = { staleTime: 60_000, refetchOnWindowFocus: false } as const;

async function fetchArea(area: KpiArea): Promise<KpiOficialRow[]> {
  const view = VIEW_BY_AREA[area];
  const { data, error } = await supabase
    .from(view as any)
    .select("indicador,valor,valor_dashboard,diferenca,perc_divergencia,status,origem_provavel,sugestao,verificado_em")
    .order("indicador", { ascending: true });
  if (error) throw error;
  return (data ?? []) as KpiOficialRow[];
}

/** Lê os KPIs oficiais de uma área específica. */
export function useKpisOficiais(area: KpiArea) {
  return useQuery({
    queryKey: ["kpis-oficiais", area],
    queryFn: () => fetchArea(area),
    ...COMMON,
  });
}

/** Mapa indicador → KpiOficialRow para lookup direto no componente. */
export function indexByIndicador(rows: KpiOficialRow[] | undefined): Record<string, KpiOficialRow> {
  const acc: Record<string, KpiOficialRow> = {};
  for (const r of rows ?? []) acc[r.indicador] = r;
  return acc;
}

/* ----------------------------- Saúde de Dados ---------------------------- */

export interface SaudeDadosRow {
  modulo: string;
  indicador: string;
  status: KpiOficialStatus;
  perc_divergencia: number | null;
  valor_base: number | null;
  valor_dashboard: number | null;
  diferenca: number | null;
  origem_provavel: string | null;
  sugestao: string | null;
  ultima_verificacao: string;
}

export function useSaudeDados() {
  return useQuery({
    queryKey: ["saude-dados"],
    queryFn: async (): Promise<SaudeDadosRow[]> => {
      const { data, error } = await supabase
        .from("v_saude_dados" as any)
        .select("*")
        .order("modulo", { ascending: true })
        .order("indicador", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SaudeDadosRow[];
    },
    ...COMMON,
  });
}
