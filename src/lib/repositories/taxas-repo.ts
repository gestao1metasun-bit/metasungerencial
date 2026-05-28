/**
 * D15.3.c — Repositório oficial de Taxas de título (Supabase).
 *
 * Leitura: view `v_taxas_titulo` (security_invoker).
 * Escrita:
 *   - `rpc_taxa_aplicar` (motivo obrigatório, audit, idempotente)
 *   - `rpc_taxa_estornar` (soft delete auditado)
 *
 * Toda alteração de taxa é um evento permanente; não há edição silenciosa.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { novoRequestId } from "./idempotencia-repo";

export type TaxaTipo =
  | "juros" | "multa" | "desconto" | "tarifa"
  | "iof" | "encargo" | "imposto" | "outro";

export type TaxaCategoria =
  | "ENCARGO" | "DESCONTO" | "TARIFA"
  | "IMPOSTO" | "CUSTO_FINANCEIRO" | "OUTRO";

export interface TaxaRow {
  id: string;
  titulo_id: string;
  titulo_codigo: string | null;
  titulo_tipo: string | null;
  parcela_id: string | null;
  parcela_numero: number | null;
  tipo: TaxaTipo;
  categoria: TaxaCategoria | null;
  valor: number;
  percentual: number | null;
  data_aplicacao: string;
  motivo: string | null;
  observacao: string | null;
  natureza_id: string | null;
  natureza_nome: string | null;
  centro_resultado_id: string | null;
  centro_resultado_nome: string | null;
  origem: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
}

export interface AplicarTaxaInput {
  titulo_id: string;
  tipo: TaxaTipo;
  valor: number;
  motivo: string;
  parcela_id?: string | null;
  categoria?: TaxaCategoria | null;
  natureza_id?: string | null;
  centro_resultado_id?: string | null;
  percentual?: number | null;
  observacao?: string | null;
  data_aplicacao?: string | null;
}

export interface EstornarTaxaInput {
  taxa_id: string;
  motivo: string;
}

export const taxasRepo = {
  async listarPorTitulo(titulo_id: string, incluirEstornadas = false): Promise<TaxaRow[]> {
    let q = supabase
      .from("v_taxas_titulo" as never)
      .select("*")
      .eq("titulo_id", titulo_id)
      .order("data_aplicacao", { ascending: false });
    if (!incluirEstornadas) q = q.is("deleted_at", null);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as TaxaRow[];
  },

  async aplicar(input: AplicarTaxaInput, requestId?: string): Promise<string> {
    const reqId = requestId ?? novoRequestId();
    const { data, error } = await supabase.rpc("rpc_taxa_aplicar", {
      _titulo_id: input.titulo_id,
      _tipo: input.tipo,
      _valor: input.valor,
      _motivo: input.motivo,
      _parcela_id: input.parcela_id ?? null,
      _categoria: input.categoria ?? null,
      _natureza_id: input.natureza_id ?? null,
      _centro_resultado_id: input.centro_resultado_id ?? null,
      _percentual: input.percentual ?? null,
      _observacao: input.observacao ?? null,
      _data_aplicacao: input.data_aplicacao ?? null,
      _request_id: reqId,
    } as never);
    if (error) throw error;
    return (data as { taxa_id: string }).taxa_id;
  },

  async estornar(input: EstornarTaxaInput, requestId?: string): Promise<void> {
    const reqId = requestId ?? novoRequestId();
    const { error } = await supabase.rpc("rpc_taxa_estornar", {
      _taxa_id: input.taxa_id,
      _motivo: input.motivo,
      _request_id: reqId,
    } as never);
    if (error) throw error;
  },
};

export function useTaxasTitulo(titulo_id: string | null, incluirEstornadas = false) {
  return useQuery({
    queryKey: ["taxas", titulo_id ?? "none", incluirEstornadas],
    queryFn: () => (titulo_id ? taxasRepo.listarPorTitulo(titulo_id, incluirEstornadas) : Promise.resolve([])),
    enabled: !!titulo_id,
    staleTime: 30_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["taxas"] });
  qc.invalidateQueries({ queryKey: ["titulos"] });
  qc.invalidateQueries({ queryKey: ["titulos_financeiros"] });
}

export function useAplicarTaxa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AplicarTaxaInput) => taxasRepo.aplicar(input),
    onSuccess: () => invalidate(qc),
  });
}

export function useEstornarTaxa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EstornarTaxaInput) => taxasRepo.estornar(input),
    onSuccess: () => invalidate(qc),
  });
}
