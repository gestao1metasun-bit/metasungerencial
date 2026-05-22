// Acesso às RPCs de KPIs agregadas no Supabase (views materializadas refreshadas
// a cada 15min via pg_cron). Substitui o cálculo no cliente para o dashboard.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type KpiComercialRow = {
  mes: string;
  total_contratos: number;
  assinados: number;
  cancelados: number;
  receita_assinada: number;
  ticket_medio: number;
  taxa_conversao: number;
};

export type KpiEngenhariaRow = {
  mes: string;
  total_obras: number;
  finalizadas: number;
  atrasadas: number;
  em_andamento: number;
  taxa_conclusao: number;
};

export type KpiConsultorRow = {
  consultor_id: string | null;
  consultor_nome: string | null;
  contratos: number;
  assinados: number;
  receita: number;
  ticket_medio: number;
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
  return data as { ok: boolean; duration_ms: number; refreshed_at: string };
}
