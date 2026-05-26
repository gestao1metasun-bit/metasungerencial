// ============================================================================
// Hook reativo para Títulos Financeiros — Onda D1/D2.
// Supabase-first, sem mock. Toda mutação invalida queries relacionadas.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type TFStatus =
  | "PENDENTE"
  | "PARCIAL"
  | "RECEBIDO"
  | "ATRASADO"
  | "CANCELADO"
  | "RENEGOCIADO";

export type OrigemTipo =
  | "contrato"
  | "projeto"
  | "pedido_venda"
  | "obra"
  | "cliente"
  | "fornecedor"
  | "aditivo"
  | "estoque"
  | "manual_controlado";

export type TituloFinanceiro =
  Database["public"]["Tables"]["titulos_financeiros"]["Row"];
export type ParcelaFinanceira =
  Database["public"]["Tables"]["parcelas_financeiras"]["Row"];
export type MovimentacaoFinanceira =
  Database["public"]["Tables"]["movimentacoes_financeiras"]["Row"];

const QK = {
  list: ["titulos_financeiros", "list"] as const,
  byId: (id: string) => ["titulos_financeiros", "byId", id] as const,
  parcelas: (id: string) => ["titulos_financeiros", "parcelas", id] as const,
  movimentacoes: (id: string) => ["titulos_financeiros", "mov", id] as const,
  contas: ["contas_financeiras"] as const,
  centros: ["centros_resultado"] as const,
};

export function useTitulosFinanceiros(filtros?: {
  status?: TFStatus | "TODOS";
  origemTipo?: OrigemTipo | "TODOS";
}) {
  return useQuery({
    queryKey: [
      ...QK.list,
      filtros?.status ?? "TODOS",
      filtros?.origemTipo ?? "TODOS",
    ],
    queryFn: async () => {
      let q = supabase
        .from("titulos_financeiros")
        .select("*")
        .is("deleted_at", null)
        .order("vencimento", { ascending: true, nullsFirst: false });
      if (filtros?.status && filtros.status !== "TODOS")
        q = q.eq("status", filtros.status);
      if (filtros?.origemTipo && filtros.origemTipo !== "TODOS")
        q = q.eq("origem_tipo", filtros.origemTipo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TituloFinanceiro[];
    },
  });
}

export function useTituloFinanceiro(id: string | undefined) {
  return useQuery({
    queryKey: QK.byId(id ?? "__none__"),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("titulos_financeiros")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as TituloFinanceiro | null;
    },
  });
}

export function useParcelasTitulo(id: string | undefined) {
  return useQuery({
    queryKey: QK.parcelas(id ?? "__none__"),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas_financeiras")
        .select("*")
        .eq("titulo_id", id!)
        .order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ParcelaFinanceira[];
    },
  });
}

export function useMovimentacoesTitulo(id: string | undefined) {
  return useQuery({
    queryKey: QK.movimentacoes(id ?? "__none__"),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_financeiras")
        .select("*")
        .eq("titulo_id", id!)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MovimentacaoFinanceira[];
    },
  });
}

export function useContasFinanceiras() {
  return useQuery({
    queryKey: QK.contas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_financeiras")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function invalidate(
  qc: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  qc.invalidateQueries({ queryKey: ["titulos_financeiros"] });
  if (id) {
    qc.invalidateQueries({ queryKey: QK.byId(id) });
    qc.invalidateQueries({ queryKey: QK.parcelas(id) });
    qc.invalidateQueries({ queryKey: QK.movimentacoes(id) });
  }
}

export function useGerarTitulosDoPV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      pvId: string;
      parcelas?: Array<{ vencimento: string; valor: number }>;
    }) => {
      const { data, error } = await supabase.rpc("gerar_titulos_do_pv", {
        _pv_id: args.pvId,
        _parcelas: (args.parcelas as any) ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (titId) => {
      invalidate(qc, titId);
      qc.invalidateQueries({ queryKey: ["pedidos_venda"] });
      toast.success("Títulos financeiros gerados.");
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Erro ao gerar títulos."),
  });
}

export function useReceberParcela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      parcelaId: string;
      tituloId: string;
      valor: number;
      contaId?: string;
      data?: string;
      formaPagamento?: string;
      observacao?: string;
    }) => {
      const { error } = await supabase.rpc("receber_parcela", {
        _parcela_id: args.parcelaId,
        _valor: args.valor,
        _conta_id: args.contaId ?? undefined,
        _data: args.data ?? new Date().toISOString(),
        _forma_pagamento: args.formaPagamento ?? undefined,
        _obs: args.observacao ?? undefined,
      });
      if (error) throw error;
      return args.tituloId;
    },
    onSuccess: (titId) => {
      invalidate(qc, titId);
      toast.success("Recebimento registrado.");
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Erro no recebimento."),
  });
}

export function useCancelarTitulo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { tituloId: string; motivo: string }) => {
      const { error } = await supabase.rpc("cancelar_titulo", {
        _titulo_id: args.tituloId,
        _motivo: args.motivo,
      });
      if (error) throw error;
      return args.tituloId;
    },
    onSuccess: (id) => {
      invalidate(qc, id);
      toast.success("Título cancelado.");
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Erro ao cancelar título."),
  });
}

export const TF_STATUS_LABEL: Record<TFStatus, string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  RECEBIDO: "Recebido",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
  RENEGOCIADO: "Renegociado",
};

export const TF_STATUS_TONE: Record<TFStatus, string> = {
  PENDENTE: "bg-muted text-muted-foreground",
  PARCIAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  RECEBIDO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  ATRASADO: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  CANCELADO: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  RENEGOCIADO: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
};

export const ORIGEM_LABEL: Record<OrigemTipo, string> = {
  contrato: "Contrato",
  projeto: "Projeto",
  pedido_venda: "Pedido de Venda",
  obra: "Obra",
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  aditivo: "Aditivo",
  estoque: "Estoque",
  manual_controlado: "Manual",
};
