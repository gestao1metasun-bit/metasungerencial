/**
 * D20.SUP.4 — Repositório oficial de Compras (Cotação → Pedido → Recebimento)
 * 100% Supabase. Mutações via RPCs SECURITY DEFINER protegidas por flag
 * `app.via_sup_compras_rpc` (backend).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SupCotStatus = "RASCUNHO" | "ENVIADA" | "EM_ANALISE" | "APROVADA" | "REPROVADA" | "CANCELADA";
export type SupPedStatus = "EMITIDO" | "APROVADO" | "ENVIADO_FORNECEDOR" | "PARCIALMENTE_RECEBIDO" | "RECEBIDO" | "CANCELADO";
export type SupRecStatus = "RASCUNHO" | "CONFIRMADO" | "CANCELADO";

export type CotacaoListaRow = {
  id: string; numero: number; status: SupCotStatus;
  requisicao_id: string; requisicao_numero: number;
  fornecedor_aprovado_id: string | null; fornecedor_aprovado_nome: string | null;
  valor_total: number; qtd_fornecedores: number;
  criado_em: string; atualizado_em: string;
};
export type PedidoListaRow = {
  id: string; numero: number; status: SupPedStatus;
  requisicao_id: string; requisicao_numero: number;
  fornecedor_id: string; fornecedor_nome: string;
  valor_total: number; criado_em: string; atualizado_em: string;
};
export type RecebimentoListaRow = {
  id: string; numero: number; status: SupRecStatus;
  pedido_id: string; pedido_numero: number;
  documento: string | null; data_recebimento: string; criado_em: string;
};

const KEYS = { cot: ["sup-compras-cotacoes"], ped: ["sup-compras-pedidos"], rec: ["sup-compras-recebimentos"], req: ["suprimentos-requisicoes"] };

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEYS.cot });
  qc.invalidateQueries({ queryKey: KEYS.ped });
  qc.invalidateQueries({ queryKey: KEYS.rec });
  qc.invalidateQueries({ queryKey: KEYS.req });
}

// ── LISTAGENS ────────────────────────────────────────────────────────────
export function useCotacoesLista(filtros?: { search?: string; status?: SupCotStatus | null }) {
  return useQuery({
    queryKey: [...KEYS.cot, filtros ?? {}],
    queryFn: async () => {
      let q = supabase.from("v_suprimentos_cotacoes_lista" as never).select("*").order("criado_em", { ascending: false }).limit(500);
      if (filtros?.status) q = q.eq("status", filtros.status);
      const { data, error } = await q;
      if (error) throw error;
      let rows = ((data ?? []) as unknown) as CotacaoListaRow[];
      const s = (filtros?.search ?? "").trim().toLowerCase();
      if (s) rows = rows.filter((r) => String(r.numero).includes(s) || String(r.requisicao_numero).includes(s));
      return rows;
    },
    staleTime: 30_000,
  });
}

export function usePedidosLista(filtros?: { search?: string; status?: SupPedStatus | null }) {
  return useQuery({
    queryKey: [...KEYS.ped, filtros ?? {}],
    queryFn: async () => {
      let q = supabase.from("v_suprimentos_pedidos_lista" as never).select("*").order("criado_em", { ascending: false }).limit(500);
      if (filtros?.status) q = q.eq("status", filtros.status);
      const { data, error } = await q;
      if (error) throw error;
      let rows = ((data ?? []) as unknown) as PedidoListaRow[];
      const s = (filtros?.search ?? "").trim().toLowerCase();
      if (s) rows = rows.filter((r) => String(r.numero).includes(s) || (r.fornecedor_nome ?? "").toLowerCase().includes(s));
      return rows;
    },
    staleTime: 30_000,
  });
}

export function useRecebimentosLista(filtros?: { search?: string; status?: SupRecStatus | null }) {
  return useQuery({
    queryKey: [...KEYS.rec, filtros ?? {}],
    queryFn: async () => {
      let q = supabase.from("v_suprimentos_recebimentos_lista" as never).select("*").order("criado_em", { ascending: false }).limit(500);
      if (filtros?.status) q = q.eq("status", filtros.status);
      const { data, error } = await q;
      if (error) throw error;
      let rows = ((data ?? []) as unknown) as RecebimentoListaRow[];
      const s = (filtros?.search ?? "").trim().toLowerCase();
      if (s) rows = rows.filter((r) => String(r.numero).includes(s) || (r.documento ?? "").toLowerCase().includes(s));
      return rows;
    },
    staleTime: 30_000,
  });
}

// ── DETALHE ──────────────────────────────────────────────────────────────
export function useCotacaoDetalhe(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: [...KEYS.cot, "detalhe", id],
    queryFn: async () => {
      const [head, itens, eventos] = await Promise.all([
        supabase.from("suprimentos_cotacoes" as never).select("*").eq("id", id!).maybeSingle(),
        supabase.from("suprimentos_cotacao_itens" as never).select("*").eq("cotacao_id", id!),
        supabase.from("suprimentos_cotacao_eventos" as never).select("*").eq("cotacao_id", id!).order("data_hora", { ascending: false }),
      ]);
      if (head.error) throw head.error;
      if (itens.error) throw itens.error;
      if (eventos.error) throw eventos.error;
      return { cabecalho: head.data, itens: (itens.data ?? []) as unknown as Array<Record<string, unknown>>, eventos: (eventos.data ?? []) as unknown as Array<Record<string, unknown>> };
    },
    staleTime: 10_000,
  });
}

export function usePedidoDetalhe(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: [...KEYS.ped, "detalhe", id],
    queryFn: async () => {
      const [head, itens, eventos] = await Promise.all([
        supabase.from("suprimentos_pedidos_compra" as never).select("*").eq("id", id!).maybeSingle(),
        supabase.from("suprimentos_pedido_itens" as never).select("*").eq("pedido_id", id!),
        supabase.from("suprimentos_pedido_eventos" as never).select("*").eq("pedido_id", id!).order("data_hora", { ascending: false }),
      ]);
      if (head.error) throw head.error;
      if (itens.error) throw itens.error;
      if (eventos.error) throw eventos.error;
      return { cabecalho: head.data, itens: (itens.data ?? []) as unknown as Array<Record<string, unknown>>, eventos: (eventos.data ?? []) as unknown as Array<Record<string, unknown>> };
    },
    staleTime: 10_000,
  });
}

export function useRecebimentoDetalhe(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: [...KEYS.rec, "detalhe", id],
    queryFn: async () => {
      const [head, itens, eventos] = await Promise.all([
        supabase.from("suprimentos_recebimentos" as never).select("*").eq("id", id!).maybeSingle(),
        supabase.from("suprimentos_recebimento_itens" as never).select("*").eq("recebimento_id", id!),
        supabase.from("suprimentos_recebimento_eventos" as never).select("*").eq("recebimento_id", id!).order("data_hora", { ascending: false }),
      ]);
      if (head.error) throw head.error;
      if (itens.error) throw itens.error;
      if (eventos.error) throw eventos.error;
      return { cabecalho: head.data, itens: (itens.data ?? []) as unknown as Array<Record<string, unknown>>, eventos: (eventos.data ?? []) as unknown as Array<Record<string, unknown>> };
    },
    staleTime: 10_000,
  });
}

// ── MUTATIONS — COTAÇÃO ─────────────────────────────────────────────────
export function useCriarCotacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requisicao_id: string) => {
      const { data, error } = await supabase.rpc("rpc_sup_cotacao_criar" as never, { p_requisicao_id: requisicao_id } as never);
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

function makeRpc<T extends Record<string, unknown>>(rpc: string) {
  return function useFn() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (payload: T) => {
        const { data, error } = await supabase.rpc(rpc as never, payload as never);
        if (error) throw error;
        return data;
      },
      onSuccess: () => invalidateAll(qc),
    });
  };
}

export const useEnviarCotacao = makeRpc<{ p_id: string }>("rpc_sup_cotacao_enviar");
export const useAprovarCotacao = makeRpc<{ p_id: string; p_fornecedor_id: string }>("rpc_sup_cotacao_aprovar");
export const useReprovarCotacao = makeRpc<{ p_id: string; p_motivo: string }>("rpc_sup_cotacao_reprovar");
export const useCancelarCotacao = makeRpc<{ p_id: string; p_motivo: string }>("rpc_sup_cotacao_cancelar");

export function useUpsertCotacaoItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id?: string | null; cotacao_id: string; requisicao_item_id: string;
      fornecedor_id: string; descricao: string; unidade?: string | null;
      quantidade: number; valor_unitario: number;
      prazo_entrega_dias?: number | null; condicao_pagamento?: string | null;
      frete?: number | null; observacao?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("rpc_sup_cotacao_item_upsert" as never, {
        p_id: args.id ?? null,
        p_cotacao_id: args.cotacao_id,
        p_requisicao_item_id: args.requisicao_item_id,
        p_fornecedor_id: args.fornecedor_id,
        p_descricao: args.descricao,
        p_unidade: args.unidade ?? null,
        p_quantidade: args.quantidade,
        p_valor_unitario: args.valor_unitario,
        p_prazo_entrega_dias: args.prazo_entrega_dias ?? null,
        p_condicao_pagamento: args.condicao_pagamento ?? null,
        p_frete: args.frete ?? 0,
        p_observacao: args.observacao ?? null,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

// ── MUTATIONS — PEDIDO ──────────────────────────────────────────────────
export const useGerarPedido = makeRpc<{ p_cotacao_id: string }>("rpc_sup_pedido_gerar");
export const useAprovarPedido = makeRpc<{ p_id: string }>("rpc_sup_pedido_aprovar");
export const useEnviarPedido = makeRpc<{ p_id: string }>("rpc_sup_pedido_enviar");
export const useCancelarPedido = makeRpc<{ p_id: string; p_motivo: string }>("rpc_sup_pedido_cancelar");

// ── MUTATIONS — RECEBIMENTO ─────────────────────────────────────────────
export function useCriarRecebimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pedido_id: string; documento?: string | null; data?: string | null; observacao?: string | null; anexo_url?: string | null }) => {
      const { data, error } = await supabase.rpc("rpc_sup_recebimento_criar" as never, {
        p_pedido_id: args.pedido_id,
        p_documento: args.documento ?? null,
        p_data: args.data ?? new Date().toISOString().slice(0, 10),
        p_observacao: args.observacao ?? null,
        p_anexo_url: args.anexo_url ?? null,
      } as never);
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
export const useConfirmarRecebimento = makeRpc<{ p_id: string }>("rpc_sup_recebimento_confirmar");

// ── HELPERS DE LABEL/TONE ───────────────────────────────────────────────
export const COT_LABEL: Record<SupCotStatus, string> = {
  RASCUNHO: "Rascunho", ENVIADA: "Enviada", EM_ANALISE: "Em análise",
  APROVADA: "Aprovada", REPROVADA: "Reprovada", CANCELADA: "Cancelada",
};
export const PED_LABEL: Record<SupPedStatus, string> = {
  EMITIDO: "Emitido", APROVADO: "Aprovado", ENVIADO_FORNECEDOR: "Enviado",
  PARCIALMENTE_RECEBIDO: "Parcial", RECEBIDO: "Recebido", CANCELADO: "Cancelado",
};
export const REC_LABEL: Record<SupRecStatus, string> = {
  RASCUNHO: "Rascunho", CONFIRMADO: "Confirmado", CANCELADO: "Cancelado",
};

export const COT_STATUS_OPTIONS = (Object.keys(COT_LABEL) as SupCotStatus[]).map((v) => ({ value: v, label: COT_LABEL[v] }));
export const PED_STATUS_OPTIONS = (Object.keys(PED_LABEL) as SupPedStatus[]).map((v) => ({ value: v, label: PED_LABEL[v] }));
export const REC_STATUS_OPTIONS = (Object.keys(REC_LABEL) as SupRecStatus[]).map((v) => ({ value: v, label: REC_LABEL[v] }));
