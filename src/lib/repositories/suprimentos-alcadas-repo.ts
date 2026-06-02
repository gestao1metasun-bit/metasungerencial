/**
 * D20.SUP.7 — Repositório de Alçadas + Dashboard de Suprimentos.
 *
 * Toda mutação passa por RPCs SECURITY DEFINER (rpc_sup_alcada_*,
 * rpc_sup_pedido_preparar_financeiro, rpc_sup_pedido_bloquear/desbloquear).
 * Esta camada apenas encaminha payloads e invalida cache.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "suprimentos-alcadas";
const DASH_KEY = "suprimentos-dashboard";

export type AlcadaEtapa = "REQUISICAO" | "COTACAO" | "PEDIDO";
export type AlcadaDecisao = "APROVADO" | "REPROVADO" | "RETORNADO";

export type Alcada = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  prioridade: number;
  etapa: AlcadaEtapa;
  tipo: "MATERIAL" | "SERVICO" | null;
  valor_min: number | null;
  valor_max: number | null;
  setor: string | null;
  natureza_id: string | null;
  centro_custo_id: string | null;
  centro_resultado_id: string | null;
  fornecedor_id: string | null;
  prioridade_req: "BAIXA" | "NORMAL" | "ALTA" | "URGENTE" | null;
  destino: "ALMOXARIFADO" | "OS" | "OBRA" | "PROJETO" | null;
  aprovador_tipo: "PERMISSAO" | "ROLE";
  aprovador_valor: string;
  exige_workflow: boolean;
  observacao_obrigatoria: boolean;
  row_version: number;
};

export type AlcadaAplicada = {
  id: string;
  entidade_tipo: AlcadaEtapa;
  entidade_id: string;
  alcada_id: string | null;
  alcada_nome: string | null;
  etapa: AlcadaEtapa;
  decisao: AlcadaDecisao;
  aprovador_user_id: string;
  aprovador_permissao: string | null;
  valor_avaliado: number | null;
  motivo: string | null;
  observacao: string | null;
  data_hora: string;
};

export type AvaliacaoAlcada =
  | { matched: false; etapa: string; valor_avaliado: number; mensagem: string }
  | {
      matched: true;
      alcada_id: string;
      alcada_nome: string;
      etapa: string;
      aprovador_tipo: "PERMISSAO" | "ROLE";
      aprovador_valor: string;
      exige_workflow: boolean;
      observacao_obrigatoria: boolean;
      valor_avaliado: number;
    };

// ── CRUD ──────────────────────────────────────────────────────────────────
export function useAlcadas() {
  return useQuery({
    queryKey: [KEY, "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suprimentos_alcadas" as never)
        .select("*")
        .is("deleted_at", null)
        .order("etapa")
        .order("prioridade");
      if (error) throw error;
      return (data ?? []) as unknown as Alcada[];
    },
    staleTime: 60_000,
  });
}

export function useUpsertAlcada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Alcada> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase
          .from("suprimentos_alcadas" as never)
          .update(payload as never)
          .eq("id", payload.id);
        if (error) throw error;
        return payload.id;
      }
      const { data, error } = await supabase
        .from("suprimentos_alcadas" as never)
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useToggleAlcada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("suprimentos_alcadas" as never)
        .update({ ativo: args.ativo } as never)
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

// ── Avaliação + Decisão ───────────────────────────────────────────────────
export function useAvaliarAlcada() {
  return useMutation({
    mutationFn: async (args: {
      entidade_tipo: AlcadaEtapa;
      entidade_id: string;
      etapa: AlcadaEtapa;
      valor?: number | null;
    }): Promise<AvaliacaoAlcada> => {
      const { data, error } = await supabase.rpc("rpc_sup_alcada_avaliar" as never, {
        p_entidade_tipo: args.entidade_tipo,
        p_entidade_id: args.entidade_id,
        p_etapa: args.etapa,
        p_valor: args.valor ?? null,
      } as never);
      if (error) throw error;
      return data as unknown as AvaliacaoAlcada;
    },
  });
}

export function useRegistrarDecisaoAlcada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      entidade_tipo: AlcadaEtapa;
      entidade_id: string;
      etapa: AlcadaEtapa;
      decisao: AlcadaDecisao;
      alcada_id?: string | null;
      motivo?: string | null;
      observacao?: string | null;
      valor_avaliado?: number | null;
    }) => {
      const { data, error } = await supabase.rpc("rpc_sup_alcada_registrar_decisao" as never, {
        p_entidade_tipo: args.entidade_tipo,
        p_entidade_id: args.entidade_id,
        p_etapa: args.etapa,
        p_decisao: args.decisao,
        p_alcada_id: args.alcada_id ?? null,
        p_motivo: args.motivo ?? null,
        p_observacao: args.observacao ?? null,
        p_valor_avaliado: args.valor_avaliado ?? null,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "aplicadas"] }),
  });
}

export function useAlcadasAplicadas(args: { entidade_tipo: AlcadaEtapa; entidade_id: string | null }) {
  return useQuery({
    enabled: !!args.entidade_id,
    queryKey: [KEY, "aplicadas", args.entidade_tipo, args.entidade_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suprimentos_alcadas_aplicadas" as never)
        .select("*")
        .eq("entidade_tipo", args.entidade_tipo)
        .eq("entidade_id", args.entidade_id!)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AlcadaAplicada[];
    },
    staleTime: 15_000,
  });
}

// ── Preparação financeira do pedido ───────────────────────────────────────
export function usePrepararPedidoFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      pedido_id: string;
      condicao_pagamento: string;
      data_prevista_pagamento: string;
      documento_fiscal?: string | null;
      valor_aprovado_final: number;
      financeiro_observacao?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("rpc_sup_pedido_preparar_financeiro" as never, {
        p_pedido_id: args.pedido_id,
        p_payload: {
          condicao_pagamento: args.condicao_pagamento,
          data_prevista_pagamento: args.data_prevista_pagamento,
          documento_fiscal: args.documento_fiscal ?? null,
          valor_aprovado_final: args.valor_aprovado_final,
          financeiro_observacao: args.financeiro_observacao ?? null,
        },
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suprimentos-compras"] });
      qc.invalidateQueries({ queryKey: [DASH_KEY] });
    },
  });
}

export function useBloquearPedidoFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pedido_id: string; motivo: string }) => {
      const { data, error } = await supabase.rpc("rpc_sup_pedido_bloquear_financeiro" as never, {
        p_pedido_id: args.pedido_id,
        p_motivo: args.motivo,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suprimentos-compras"] });
      qc.invalidateQueries({ queryKey: [DASH_KEY] });
    },
  });
}

export function useDesbloquearPedidoFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pedido_id: string; motivo: string }) => {
      const { data, error } = await supabase.rpc("rpc_sup_pedido_desbloquear_financeiro" as never, {
        p_pedido_id: args.pedido_id,
        p_motivo: args.motivo,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suprimentos-compras"] });
      qc.invalidateQueries({ queryKey: [DASH_KEY] });
    },
  });
}

// ── D21 — Gerar Conta a Pagar a partir do pedido ──────────────────────────
export type GerarTituloApResult = {
  titulo_id: string;
  codigo: string | null;
  criado_agora: boolean;
};

export function useGerarTituloAP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pedido_id: string }): Promise<GerarTituloApResult> => {
      const { data, error } = await supabase.rpc("rpc_sup_pedido_gerar_titulo_ap" as never, {
        p_pedido_id: args.pedido_id,
      } as never);
      if (error) throw error;
      return data as unknown as GerarTituloApResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suprimentos-compras"] });
      qc.invalidateQueries({ queryKey: [DASH_KEY] });
      qc.invalidateQueries({ queryKey: ["sup-prontos-financeiro"] });
      qc.invalidateQueries({ queryKey: ["titulos"] });
    },
  });
}

export type PedidoProntoFinanceiro = {
  pedido_id: string;
  pedido_numero: number;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  valor: number;
  vencimento_previsto: string | null;
  condicao_pagamento: string | null;
  documento_fiscal: string | null;
  natureza_id: string | null;
  natureza_codigo: string | null;
  natureza_nome: string | null;
  centro_custo_id: string | null;
  cc_codigo: string | null;
  cc_nome: string | null;
  centro_resultado_id: string | null;
  cr_codigo: string | null;
  cr_nome: string | null;
  os_id: string | null;
  obra_id: string | null;
  projeto_id: string | null;
  requisicao_id: string;
  cotacao_id: string | null;
  atualizado_em: string;
};

export function usePedidosProntosFinanceiro() {
  return useQuery({
    queryKey: ["sup-prontos-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_sup_pedidos_prontos_financeiro" as never)
        .select("*")
        .order("vencimento_previsto", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PedidoProntoFinanceiro[];
    },
    staleTime: 30_000,
  });
}

// ── Dashboard + Alertas ───────────────────────────────────────────────────
export type DashboardKpis = {
  abertas: number;
  aprovadas: number;
  rejeitadas: number;
  atrasadas: number;
  valor_solicitado: number;
  valor_aprovado: number;
  valor_em_compra: number;
  valor_recebido: number;
  estoque_reservado: number;
  itens_criticos: number;
};

export function useDashboardKpis() {
  return useQuery({
    queryKey: [DASH_KEY, "kpis"],
    queryFn: async (): Promise<DashboardKpis> => {
      const { data, error } = await supabase
        .from("v_suprimentos_dashboard_kpis" as never)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        abertas: 0, aprovadas: 0, rejeitadas: 0, atrasadas: 0,
        valor_solicitado: 0, valor_aprovado: 0, valor_em_compra: 0,
        valor_recebido: 0, estoque_reservado: 0, itens_criticos: 0,
      }) as unknown as DashboardKpis;
    },
    staleTime: 30_000,
  });
}

export function useDashboardPorFornecedor() {
  return useQuery({
    queryKey: [DASH_KEY, "fornecedor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_suprimentos_dashboard_por_fornecedor" as never)
        .select("*")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ fornecedor_id: string | null; fornecedor_nome: string | null; pedidos: number; valor_total: number }>;
    },
    staleTime: 60_000,
  });
}

export function useDashboardPorNatureza() {
  return useQuery({
    queryKey: [DASH_KEY, "natureza"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_suprimentos_dashboard_por_natureza" as never)
        .select("*")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ natureza_id: string | null; natureza_codigo: string | null; natureza_nome: string | null; pedidos: number; valor_total: number }>;
    },
    staleTime: 60_000,
  });
}

export function useDashboardPorCC() {
  return useQuery({
    queryKey: [DASH_KEY, "cc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_suprimentos_dashboard_por_cc" as never)
        .select("*")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ centro_custo_id: string | null; cc_codigo: string | null; cc_nome: string | null; pedidos: number; valor_total: number }>;
    },
    staleTime: 60_000,
  });
}

export type AlertaSup = {
  tipo_alerta: string;
  entidade_tipo: string;
  entidade_id: string;
  entidade_ref: string | null;
  severidade: "INFO" | "WARN" | "HIGH";
  mensagem: string;
  criado_em: string;
};

export function useAlertasSuprimentos() {
  return useQuery({
    queryKey: [DASH_KEY, "alertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_suprimentos_alertas" as never)
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AlertaSup[];
    },
    staleTime: 30_000,
  });
}

// ── Catálogos auxiliares (reuso) ──────────────────────────────────────────
export const ETAPA_LABEL: Record<AlcadaEtapa, string> = {
  REQUISICAO: "Requisição",
  COTACAO: "Cotação",
  PEDIDO: "Pedido",
};

export const SEVERIDADE_TONE: Record<AlertaSup["severidade"], string> = {
  INFO: "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  WARN: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  HIGH: "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};
