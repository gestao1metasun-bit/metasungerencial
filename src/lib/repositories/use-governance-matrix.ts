/**
 * D14.3 — Matriz de Governança Enterprise
 * Leitura das views oficiais v_governance_matrix_full / v_governance_gaps / v_governance_resumo.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GovernanceRow = {
  modulo: string;
  entidade: string;
  acao: string;
  perfil: string;
  permissao: string | null;
  requer_workflow: boolean;
  requer_motivo: boolean;
  audita: boolean;
  suporta_lote: boolean;
  suporta_estorno: boolean;
  sla_horas: number | null;
  criticidade: "baixa" | "media" | "alta" | "critica";
  observacao: string | null;
  gap_workflow: boolean;
  gap_motivo: boolean;
  gap_auditoria: boolean;
  gap_sla: boolean;
};

export type GovernanceGap = {
  modulo: string;
  entidade: string;
  acao: string;
  perfil: string;
  criticidade: string;
  gap_workflow: boolean;
  gap_motivo: boolean;
  gap_auditoria: boolean;
  gap_sla: boolean;
  total_gaps: number;
};

export type GovernanceResumo = {
  modulo: string;
  total_acoes: number;
  criticas: number;
  altas: number;
  com_workflow: number;
  com_motivo: number;
  com_auditoria: number;
  com_lote: number;
  com_estorno: number;
  com_sla: number;
};

export function useGovernanceMatrix() {
  return useQuery({
    queryKey: ["governance", "matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_governance_matrix_full" as any)
        .select("*")
        .order("modulo")
        .order("entidade")
        .order("acao");
      if (error) throw error;
      return (data ?? []) as unknown as GovernanceRow[];
    },
    staleTime: 60_000,
  });
}

export function useGovernanceGaps() {
  return useQuery({
    queryKey: ["governance", "gaps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_governance_gaps" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as GovernanceGap[];
    },
    staleTime: 60_000,
  });
}

export function useGovernanceResumo() {
  return useQuery({
    queryKey: ["governance", "resumo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_governance_resumo" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as GovernanceResumo[];
    },
    staleTime: 60_000,
  });
}
