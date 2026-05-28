/**
 * D15.3.c — Repositório oficial de Renegociações (leitura Supabase).
 *
 * Leitura: view `v_renegociacoes_enriquecido` (security_invoker).
 * Escrita: já coberta por `renegociar_titulos_lote` (RenegociarLoteDialog)
 *          e por `rpc_renegociacao_aplicar` para acordos unitários.
 *
 * Substitui qualquer leitura de `ms.fin.renegociacoes.v1`.
 */
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface RenegociacaoRow {
  id: string;
  tipo: string;
  titulo_novo_id: string;
  titulo_novo_codigo: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  motivo: string;
  juros_aplicado: number;
  multa_aplicada: number;
  desconto_aplicado: number;
  valor_original_total: number;
  valor_renegociado_total: number;
  qtd_titulos_consolidados: number;
  observacao: string | null;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
}

export const renegociacoesRepo = {
  async listar(): Promise<RenegociacaoRow[]> {
    const { data, error } = await supabase
      .from("v_renegociacoes_enriquecido" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RenegociacaoRow[];
  },
};

export function useRenegociacoes() {
  return useQuery({
    queryKey: ["renegociacoes"],
    queryFn: () => renegociacoesRepo.listar(),
    staleTime: 30_000,
  });
}
