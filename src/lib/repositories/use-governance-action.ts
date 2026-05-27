/**
 * D14.4 — Governance Action Gating.
 *
 * Consulta a matriz oficial (v_governance_matrix_full) para um par
 * (modulo, acao) e retorna metadados operacionais que toolbars/processos
 * devem respeitar antes de permitir a execução:
 *
 *   - allowed           → permissão atendida (ou admin)
 *   - requiresMotivo    → exige justificativa antes de executar
 *   - requiresWorkflow  → exige passar pelo workflow_aprovacoes
 *   - slaHoras          → SLA esperado
 *   - criticidade       → baixa | media | alta | critica
 *   - audita            → ação deve ser registrada em audit_log
 *   - suportaLote       → pode rodar em lote
 *   - suportaEstorno    → tem estorno definido
 *   - blockedReason     → motivo descritivo quando allowed=false
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyPermissions } from "@/hooks/use-permissions";

export type GovernanceActionInfo = {
  loading: boolean;
  found: boolean;
  allowed: boolean;
  requiresMotivo: boolean;
  requiresWorkflow: boolean;
  audita: boolean;
  suportaLote: boolean;
  suportaEstorno: boolean;
  slaHoras: number | null;
  criticidade: "baixa" | "media" | "alta" | "critica" | null;
  permissao: string | null;
  blockedReason: string | null;
};

const EMPTY: GovernanceActionInfo = {
  loading: false, found: false, allowed: true,
  requiresMotivo: false, requiresWorkflow: false, audita: false,
  suportaLote: false, suportaEstorno: false,
  slaHoras: null, criticidade: null, permissao: null, blockedReason: null,
};

type Row = {
  permissao: string | null;
  requer_motivo: boolean;
  requer_workflow: boolean;
  audita: boolean;
  suporta_lote: boolean;
  suporta_estorno: boolean;
  sla_horas: number | null;
  criticidade: GovernanceActionInfo["criticidade"];
};

/** Cache global da matriz (cai sob useQuery por chave única). */
function useMatrixRow(modulo: string, acao: string) {
  return useQuery({
    queryKey: ["governance", "action", modulo, acao],
    queryFn: async (): Promise<Row | null> => {
      const { data, error } = await supabase
        .from("v_governance_matrix_full" as any)
        .select("permissao,requer_motivo,requer_workflow,audita,suporta_lote,suporta_estorno,sla_horas,criticidade")
        .eq("modulo", modulo)
        .eq("acao", acao)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Row | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useGovernanceAction(modulo: string, acao: string): GovernanceActionInfo {
  const { data: row, isLoading } = useMatrixRow(modulo, acao);
  const perms = useMyPermissions();

  return useMemo<GovernanceActionInfo>(() => {
    if (isLoading) return { ...EMPTY, loading: true };
    if (!row) return { ...EMPTY, found: false };
    const allowed = !row.permissao ? true : perms.can(row.permissao);
    return {
      loading: false,
      found: true,
      allowed,
      requiresMotivo: !!row.requer_motivo,
      requiresWorkflow: !!row.requer_workflow,
      audita: !!row.audita,
      suportaLote: !!row.suporta_lote,
      suportaEstorno: !!row.suporta_estorno,
      slaHoras: row.sla_horas,
      criticidade: row.criticidade,
      permissao: row.permissao,
      blockedReason: allowed ? null
        : `Permissão necessária: ${row.permissao}`,
    };
  }, [row, isLoading, perms]);
}

/* ----------------------------- Pendências ----------------------------- */

export type GovernancePendencia = {
  id: string;
  modulo: string;
  entidade: string;
  acao: string;
  tipo_lacuna: "workflow"|"motivo"|"auditoria"|"sla"|"outro";
  status: "aberta"|"mitigada"|"aceita"|"resolvida";
  criticidade: "baixa"|"media"|"alta"|"critica";
  justificativa: string | null;
  mitigacao: string | null;
  responsavel_id: string | null;
  prazo: string | null;
  created_at: string;
  updated_at: string;
};

export function useGovernancePendencias() {
  return useQuery({
    queryKey: ["governance", "pendencias"],
    queryFn: async (): Promise<GovernancePendencia[]> => {
      const { data, error } = await supabase
        .from("governance_pendencias" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GovernancePendencia[];
    },
    staleTime: 60_000,
  });
}

export type GovernanceGapStatus = {
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
  pendencias_abertas: number;
  pendencias_mitigadas: number;
  status_governanca: "BLOQUEAR"|"DOCUMENTADA"|"MITIGADA"|"PENDENTE";
};

export function useGovernanceGapsStatus() {
  return useQuery({
    queryKey: ["governance", "gaps_status"],
    queryFn: async (): Promise<GovernanceGapStatus[]> => {
      const { data, error } = await supabase
        .from("v_governance_gaps_status" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as GovernanceGapStatus[];
    },
    staleTime: 60_000,
  });
}
