// ============================================================================
// Hook reativo para Pedidos de Venda (PV) — Onda C.
// Supabase-first, sem mock. Toda mutação invalida queries relacionadas.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withPerf } from "@/lib/perf";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type PVStatus =
  | "RASCUNHO"
  | "EM_ANALISE"
  | "APROVADO"
  | "EM_EXECUCAO"
  | "FATURADO"
  | "FINALIZADO"
  | "CANCELADO";

export type PedidoVenda = Database["public"]["Tables"]["pedidos_venda"]["Row"];
export type PVStatusHistorico =
  Database["public"]["Tables"]["pedidos_venda_status_historico"]["Row"];
export type BridgePV = Database["public"]["Views"]["vw_bridge_pv"]["Row"];

const QK = {
  list: ["pedidos_venda", "list"] as const,
  byId: (id: string) => ["pedidos_venda", "byId", id] as const,
  historico: (id: string) => ["pedidos_venda", "historico", id] as const,
  bridge: ["pedidos_venda", "bridge"] as const,
};

export function usePedidosVenda(filtros?: { status?: PVStatus | "TODOS" }) {
  return useQuery({
    queryKey: [...QK.list, filtros?.status ?? "TODOS"],
    queryFn: async () => {
      let q = supabase
        .from("pedidos_venda")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (filtros?.status && filtros.status !== "TODOS") {
        q = q.eq("status", filtros.status);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PedidoVenda[];
    },
  });
}

export function usePedidoVenda(id: string | undefined) {
  return useQuery({
    queryKey: QK.byId(id ?? "__none__"),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_venda")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as PedidoVenda | null;
    },
  });
}

export function useHistoricoPV(id: string | undefined) {
  return useQuery({
    queryKey: QK.historico(id ?? "__none__"),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_venda_status_historico")
        .select("*")
        .eq("pedido_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PVStatusHistorico[];
    },
  });
}

export function useBridgePV() {
  return useQuery({
    queryKey: QK.bridge,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_bridge_pv")
        .select("*")
        .order("pv_criado_em", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as BridgePV[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["pedidos_venda"] });
  if (id) qc.invalidateQueries({ queryKey: QK.byId(id) });
}

export function useGerarPVDoContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      contratoId: string;
      projetoContratoId?: string | null;
    }) => {
      const { data, error } = await withPerf("rpc.gerar_pv_do_contrato", () => supabase.rpc("gerar_pv_do_contrato", {
        _contrato_id: args.contratoId,
        _projeto_contrato_id: args.projetoContratoId ?? undefined,
      }));
      if (error) throw error;
      return data as string;
    },
    onSuccess: (pvId) => {
      invalidate(qc, pvId);
      toast.success("Pedido de Venda criado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao gerar PV."),
  });
}

export function useEnviarPVParaAnalise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pvId: string) => {
      const { error } = await withPerf("rpc.enviar_pv_para_analise", () => supabase.rpc("enviar_pv_para_analise", { _pv_id: pvId }));
      if (error) throw error;
      return pvId;
    },
    onSuccess: (id) => {
      invalidate(qc, id);
      toast.success("PV enviado para análise.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao enviar para análise."),
  });
}

export function useAprovarPV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pvId: string; motivo?: string }) => {
      const { error } = await withPerf("rpc.aprovar_pv", () => supabase.rpc("aprovar_pv", {
        _pv_id: args.pvId,
        _motivo: args.motivo ?? undefined,
      }));
      if (error) throw error;
      return args.pvId;
    },
    onSuccess: (id) => {
      invalidate(qc, id);
      toast.success("PV aprovado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao aprovar PV."),
  });
}

export function useCancelarPV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pvId: string; motivo: string }) => {
      const { error } = await withPerf("rpc.cancelar_pv", () => supabase.rpc("cancelar_pv", {
        _pv_id: args.pvId,
        _motivo: args.motivo,
      }));
      if (error) throw error;
      return args.pvId;
    },
    onSuccess: (id) => {
      invalidate(qc, id);
      toast.success("PV cancelado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao cancelar PV."),
  });
}

export function useEnviarPVParaEngenharia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pvId: string) => {
      const { data, error } = await withPerf("rpc.enviar_pv_para_engenharia", () => supabase.rpc("enviar_pv_para_engenharia", { _pv_id: pvId }));
      if (error) throw error;
      return data as string; // obra_id
    },
    onSuccess: (_obraId, pvId) => {
      invalidate(qc, pvId);
      qc.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Obra criada na Engenharia.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao enviar para engenharia."),
  });
}

export function useUpdatePV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      pvId: string;
      patch: Partial<
        Pick<
          PedidoVenda,
          | "forma_pagamento"
          | "possui_financiamento"
          | "financiamento_banco"
          | "financiamento_valor"
          | "gerente_id"
          | "observacoes"
          | "valor_total"
        >
      >;
    }) => {
      const { error } = await supabase
        .from("pedidos_venda")
        .update(args.patch)
        .eq("id", args.pvId);
      if (error) throw error;
      return args.pvId;
    },
    onSuccess: (id) => {
      invalidate(qc, id);
      toast.success("PV atualizado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar PV."),
  });
}

export const PV_STATUS_LABEL: Record<PVStatus, string> = {
  RASCUNHO: "Rascunho",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  EM_EXECUCAO: "Em execução",
  FATURADO: "Faturado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const PV_STATUS_TONE: Record<PVStatus, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  EM_ANALISE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  APROVADO: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  EM_EXECUCAO: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  FATURADO: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  FINALIZADO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELADO: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};
