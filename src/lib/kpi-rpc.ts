// Acesso às RPCs de KPIs agregadas no Supabase (views materializadas refreshadas
// a cada 15min via pg_cron). Substitui o cálculo no cliente para o dashboard.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type KpiComercialRow = {
  mes: string | null;
  total_contratos: number | null;
  assinados: number | null;
  rascunhos: number | null;
  cancelados: number | null;
  receita_assinada: number | null;
  pipeline_total: number | null;
  ticket_medio: number | null;
  kwp_vendido: number | null;
};

export type KpiEngenhariaRow = {
  mes: string | null;
  total_obras: number | null;
  planejadas: number | null;
  em_andamento: number | null;
  finalizadas: number | null;
  atrasadas: number | null;
  kwp_total: number | null;
  modulos_total: number | null;
};

export type KpiConsultorRow = {
  consultor_id: string | null;
  consultor_nome: string | null;
  total_contratos: number | null;
  assinados: number | null;
  cancelados: number | null;
  receita: number | null;
  ticket_medio: number | null;
  conversao_pct: number | null;
  kwp_vendido: number | null;
};

// Stale: 5min (refresh do banco é a cada 15min). Sem refetch agressivo.
const COMMON = { staleTime: 5 * 60_000, refetchOnWindowFocus: false } as const;

export function useKpiComercial() {
  return useQuery({
    queryKey: ["kpi", "comercial"],
    queryFn: async (): Promise<KpiComercialRow[]> => {
      const { data, error } = await supabase.rpc("kpi_comercial");
      if (error) throw error;
      return (data ?? []) as KpiComercialRow[];
    },
    ...COMMON,
  });
}

export function useKpiEngenharia() {
  return useQuery({
    queryKey: ["kpi", "engenharia"],
    queryFn: async (): Promise<KpiEngenhariaRow[]> => {
      const { data, error } = await supabase.rpc("kpi_engenharia");
      if (error) throw error;
      return (data ?? []) as KpiEngenhariaRow[];
    },
    ...COMMON,
  });
}

export function useKpiConsultor() {
  return useQuery({
    queryKey: ["kpi", "consultor"],
    queryFn: async (): Promise<KpiConsultorRow[]> => {
      const { data, error } = await supabase.rpc("kpi_consultor");
      if (error) throw error;
      return (data ?? []) as KpiConsultorRow[];
    },
    ...COMMON,
  });
}

/** Força refresh imediato das views (admin). */
export async function refreshKpisAgora() {
  const { data, error } = await supabase.rpc("refresh_mv_kpis");
  if (error) throw error;
  return data as unknown as { ok: boolean; duration_ms: number; refreshed_at: string };
}
