/**
 * D15.3.b — Repositório oficial de Adiantamentos (Supabase).
 *
 * Leitura:  view `v_adiantamentos_enriquecido` (security_invoker).
 * Escrita:
 *   - `rpc_adiantamento_registrar` (criação)
 *   - `rpc_adiantamento_abater`    (abatimento contra parcela)
 *   - `rpc_adiantamento_estornar`  (estorno só se não houver abatimentos)
 *
 * Substitui qualquer leitura/escrita de `ms.fin.adiantamentos.v1`.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withPerf } from "@/lib/perf";
import { novoRequestId } from "./idempotencia-repo";

export type AdiantamentoDirecao = "RECEBIDO" | "PAGO";
export type AdiantamentoStatus = "ABERTO" | "PARCIAL" | "QUITADO" | "CANCELADO" | "ESTORNADO";
export type AdiantamentoTipoUI = "cliente" | "fornecedor";

export interface AdiantamentoRow {
  id: string;
  codigo: string | null;
  natureza: string;
  direcao: AdiantamentoDirecao;
  status: AdiantamentoStatus;
  data_movimento: string;
  competencia: string | null;
  valor: number;
  valor_abatido: number;
  saldo: number;
  observacao: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  contrato_id: string | null;
  pv_id: string | null;
  conta_id: string | null;
  conta_nome: string | null;
  forma_pagamento: string | null;
  documento: string | null;
  created_at: string;
  created_by: string | null;
  abatimentos_count: number;
}

export interface NovoAdiantamentoInput {
  tipo: AdiantamentoTipoUI;
  valor: number;
  data: string;
  conta_id: string;
  cliente_id?: string | null;
  fornecedor_id?: string | null;
  contrato_id?: string | null;
  competencia?: string | null;
  observacao?: string | null;
}

export interface AbaterAdiantamentoInput {
  adiantamento_id: string;
  parcela_id: string;
  valor: number;
  observacao?: string | null;
}

export interface EstornarAdiantamentoInput {
  adiantamento_id: string;
  motivo: string;
}

export interface ParcelaCandidata {
  id: string;
  titulo_id: string;
  numero: number | null;
  valor: number;
  saldo: number;
  vencimento: string;
  status: string | null;
  titulo_codigo: string | null;
  titulo_tipo: string;
}

export const adiantamentosRepo = {
  async listar(tipo?: AdiantamentoTipoUI): Promise<AdiantamentoRow[]> {
    let q = supabase
      .from("v_adiantamentos_enriquecido" as never)
      .select("*")
      .order("data_movimento", { ascending: false });
    if (tipo === "cliente") q = q.eq("direcao", "RECEBIDO");
    if (tipo === "fornecedor") q = q.eq("direcao", "PAGO");
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as AdiantamentoRow[];
  },

  async registrar(input: NovoAdiantamentoInput, requestId?: string): Promise<string> {
    const reqId = requestId ?? novoRequestId();
    const direcao = input.tipo === "cliente" ? "RECEBER" : "PAGAR";
    const { data, error } = await withPerf("rpc.adiantamento_registrar", () => supabase.rpc("rpc_adiantamento_registrar", {
      _direcao: direcao,
      _valor: input.valor,
      _data: input.data,
      _conta_id: input.conta_id,
      _cliente_id: input.cliente_id ?? null,
      _fornecedor_id: input.fornecedor_id ?? null,
      _contrato_id: input.contrato_id ?? null,
      _competencia: input.competencia ?? null,
      _observacao: input.observacao ?? null,
      _request_id: reqId,
    } as never));
    if (error) throw error;
    return (data as { adiantamento_id: string }).adiantamento_id;
  },

  async abater(input: AbaterAdiantamentoInput, requestId?: string): Promise<void> {
    const reqId = requestId ?? novoRequestId();
    const { error } = await withPerf("rpc.adiantamento_abater", () => supabase.rpc("rpc_adiantamento_abater", {
      _adiantamento_id: input.adiantamento_id,
      _parcela_id: input.parcela_id,
      _valor: input.valor,
      _observacao: input.observacao ?? null,
      _request_id: reqId,
    } as never));
    if (error) throw error;
  },

  async estornar(input: EstornarAdiantamentoInput, requestId?: string): Promise<void> {
    const reqId = requestId ?? novoRequestId();
    const { error } = await withPerf("rpc.adiantamento_estornar", () => supabase.rpc("rpc_adiantamento_estornar", {
      _adiantamento_id: input.adiantamento_id,
      _motivo: input.motivo,
      _request_id: reqId,
    } as never));
    if (error) throw error;
  },

  /**
   * Parcelas em aberto compatíveis com o adiantamento.
   * - Adiantamento de cliente (RECEBIDO) → títulos AR do mesmo cliente.
   * - Adiantamento a fornecedor (PAGO)   → títulos AP do mesmo fornecedor.
   */
  async listarParcelasCompativeis(ad: AdiantamentoRow): Promise<ParcelaCandidata[]> {
    const isCliente = ad.direcao === "RECEBIDO";
    const tipoTitulo = isCliente ? "AR" : "AP";
    const contraFilter = isCliente
      ? { col: "cliente_id", val: ad.cliente_id }
      : { col: "fornecedor_id", val: ad.fornecedor_id };
    if (!contraFilter.val) return [];

    const { data: titulos, error: e1 } = await supabase
      .from("titulos_financeiros")
      .select("id, codigo, tipo, status")
      .eq("tipo", tipoTitulo)
      .eq(contraFilter.col, contraFilter.val)
      .neq("status", "CANCELADO")
      .is("deleted_at", null);
    if (e1) throw e1;
    const ids = (titulos ?? []).map((t) => t.id);
    if (ids.length === 0) return [];

    const { data: parcelas, error: e2 } = await supabase
      .from("parcelas_financeiras")
      .select("id, titulo_id, numero, valor, saldo, vencimento, status")
      .in("titulo_id", ids)
      .gt("saldo", 0.001)
      .order("vencimento", { ascending: true });
    if (e2) throw e2;

    const tMap = new Map(
      (titulos ?? []).map((t) => [t.id, { codigo: t.codigo ?? null, tipo: t.tipo as string }]),
    );
    return (parcelas ?? []).map((p) => ({
      id: p.id,
      titulo_id: p.titulo_id,
      numero: p.numero ?? null,
      valor: Number(p.valor),
      saldo: Number(p.saldo),
      vencimento: p.vencimento,
      status: p.status ?? null,
      titulo_codigo: tMap.get(p.titulo_id)?.codigo ?? null,
      titulo_tipo: tMap.get(p.titulo_id)?.tipo ?? tipoTitulo,
    }));
  },
};

// ---------- React Query hooks ----------

const KEY = ["adiantamentos"] as const;

export function useAdiantamentosSupabase(tipo?: AdiantamentoTipoUI) {
  return useQuery({
    queryKey: [...KEY, tipo ?? "todos"],
    queryFn: () => adiantamentosRepo.listar(tipo),
    staleTime: 30_000,
  });
}

export function useParcelasCompativeis(ad: AdiantamentoRow | null) {
  return useQuery({
    queryKey: [...KEY, "parcelas", ad?.id ?? "none"],
    queryFn: () => (ad ? adiantamentosRepo.listarParcelasCompativeis(ad) : Promise.resolve([])),
    enabled: !!ad,
    staleTime: 15_000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ["lancamentos"] });
  qc.invalidateQueries({ queryKey: ["titulos"] });
  qc.invalidateQueries({ queryKey: ["saude-sistema"] });
}

export function useRegistrarAdiantamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NovoAdiantamentoInput) => adiantamentosRepo.registrar(input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAbaterAdiantamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AbaterAdiantamentoInput) => adiantamentosRepo.abater(input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useEstornarAdiantamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EstornarAdiantamentoInput) => adiantamentosRepo.estornar(input),
    onSuccess: () => invalidateAll(qc),
  });
}
