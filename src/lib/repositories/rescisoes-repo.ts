/**
 * D15.3.c — Repositório oficial de Rescisões contratuais (Supabase).
 *
 * Leitura: view `v_rescisoes_enriquecido` (security_invoker).
 * Escrita: RPC `rpc_rescisao_executar` (motivo obrigatório, audit, idempotente).
 *
 * Substitui qualquer leitura/escrita de `ms.fin.rescisoes.v1`.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { novoRequestId } from "./idempotencia-repo";

export interface RescisaoRow {
  id: string;
  codigo: string | null;
  contrato_id: string;
  contrato_codigo: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  data_rescisao: string;
  motivo: string;
  valor_recebido: number;
  multa_tipo: "percentual" | "fixo";
  multa_valor: number;
  multa_calculada: number;
  devolucao_liquida: number;
  titulo_devolucao_id: string | null;
  vencimento_devolucao: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  created_by: string | null;
  titulos_cancelados: number;
}

export interface ContratoElegivelRescisao {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  valor_recebido: number;
  saldo_aberto: number;
  titulos_ar_abertos: number;
}

export interface ExecutarRescisaoInput {
  contrato_id: string;
  multa_tipo: "percentual" | "fixo";
  multa_valor: number;
  motivo: string;
  vencimento_devolucao?: string | null;
  conta_devolucao_id?: string | null;
  observacoes?: string | null;
}

export const rescisoesRepo = {
  async listar(): Promise<RescisaoRow[]> {
    const { data, error } = await supabase
      .from("v_rescisoes_enriquecido" as never)
      .select("*")
      .order("data_rescisao", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RescisaoRow[];
  },

  async listarContratosElegiveis(): Promise<ContratoElegivelRescisao[]> {
    // Contratos com títulos AR abertos e sem rescisão confirmada.
    const { data: rescindidos, error: e0 } = await supabase
      .from("rescisoes_contrato")
      .select("contrato_id")
      .eq("status", "CONFIRMADA")
      .is("deleted_at", null);
    if (e0) throw e0;
    const rescIds = new Set((rescindidos ?? []).map((r: any) => r.contrato_id));

    const { data: titulos, error: e1 } = await supabase
      .from("titulos_financeiros")
      .select("contrato_id, valor_liquido, saldo, tipo, status")
      .eq("tipo", "AR")
      .neq("status", "CANCELADO")
      .not("contrato_id", "is", null)
      .is("deleted_at", null);
    if (e1) throw e1;

    type Agg = { recebido: number; saldo: number; qtd: number };
    const map = new Map<string, Agg>();
    (titulos ?? []).forEach((t: any) => {
      const cid = t.contrato_id as string;
      if (rescIds.has(cid)) return;
      const a = map.get(cid) ?? { recebido: 0, saldo: 0, qtd: 0 };
      a.recebido += Number(t.valor_liquido || 0) - Number(t.saldo || 0);
      a.saldo += Number(t.saldo || 0);
      a.qtd += 1;
      map.set(cid, a);
    });
    const ids = Array.from(map.keys());
    if (ids.length === 0) return [];

    const { data: contratos, error: e2 } = await supabase
      .from("contratos")
      .select("id, codigo, cliente_id, clientes(nome)")
      .in("id", ids)
      .is("deleted_at", null);
    if (e2) throw e2;

    return (contratos ?? []).map((c: any) => {
      const a = map.get(c.id)!;
      return {
        id: c.id,
        codigo: c.codigo ?? null,
        cliente_id: c.cliente_id ?? null,
        cliente_nome: c.clientes?.nome ?? null,
        valor_recebido: a.recebido,
        saldo_aberto: a.saldo,
        titulos_ar_abertos: a.qtd,
      };
    }).sort((a, b) => b.saldo_aberto - a.saldo_aberto);
  },

  async executar(input: ExecutarRescisaoInput, requestId?: string): Promise<{ rescisao_id: string }> {
    const reqId = requestId ?? novoRequestId();
    const { data, error } = await supabase.rpc("rpc_rescisao_executar", {
      _contrato_id: input.contrato_id,
      _multa_tipo: input.multa_tipo,
      _multa_valor: input.multa_valor,
      _motivo: input.motivo,
      _vencimento_devolucao: input.vencimento_devolucao ?? null,
      _conta_devolucao_id: input.conta_devolucao_id ?? null,
      _observacoes: input.observacoes ?? null,
      _request_id: reqId,
    } as never);
    if (error) throw error;
    return data as { rescisao_id: string };
  },
};

const KEY = ["rescisoes"] as const;

export function useRescisoes() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => rescisoesRepo.listar(),
    staleTime: 30_000,
  });
}

export function useContratosElegiveisRescisao() {
  return useQuery({
    queryKey: [...KEY, "elegiveis"],
    queryFn: () => rescisoesRepo.listarContratosElegiveis(),
    staleTime: 30_000,
  });
}

export function useExecutarRescisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExecutarRescisaoInput) => rescisoesRepo.executar(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["titulos"] });
      qc.invalidateQueries({ queryKey: ["titulos_financeiros"] });
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      qc.invalidateQueries({ queryKey: ["saude-sistema"] });
    },
  });
}
