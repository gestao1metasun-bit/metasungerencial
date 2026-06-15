/**
 * C-ENT.4 — Repositório oficial Supabase para Contratos (geração a partir
 * de propostas Supabase, listagem por cliente).
 *
 * Não substitui ContratoStore (LS) ainda — apenas oficializa a operação
 * de "Gerar Contrato" e a leitura por cliente/Workspace 360º.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/repositories/error-log-repo";

export type ContratoSupabase = {
  id: string;
  codigo: string | null;
  cliente_id: string;
  consultor_id: string | null;
  status: string;
  valor_total: number;
  potencia_kwp: number | null;
  modulos_qtde: number | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  dados: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id,codigo,cliente_id,consultor_id,status,valor_total,potencia_kwp,modulos_qtde," +
  "forma_pagamento,observacoes,dados,created_at,updated_at";

function reportError(acao: string, err: unknown, payload?: Record<string, unknown>) {
  const e = err as { message?: string; stack?: string };
  void logError({
    modulo: "comercial",
    tela: "contratos-supabase-repo",
    acao,
    mensagem: e?.message ?? String(err),
    stack: e?.stack,
    payload,
    severidade: "error",
  });
}

export async function listarContratosPorCliente(clienteId: string): Promise<ContratoSupabase[]> {
  const { data, error } = await supabase
    .from("contratos")
    .select(SELECT_COLS)
    .eq("cliente_id", clienteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    reportError("listarContratosPorCliente", error, { clienteId });
    throw error;
  }
  return (data ?? []) as unknown as ContratoSupabase[];
}

export async function gerarContratoDePropostas(propostaIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc("rpc_contrato_gerar_de_propostas", {
    p_proposta_ids: propostaIds,
  });
  if (error) {
    reportError("gerarContratoDePropostas", error, { propostaIds });
    throw error;
  }
  return data as string;
}

/* ============================== HOOKS ============================== */

export function useContratosPorCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ["contratos-supabase", "cliente", clienteId],
    queryFn: () => listarContratosPorCliente(clienteId!),
    enabled: !!clienteId,
    staleTime: 30_000,
  });
}

export function useGerarContratoDePropostas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propostaIds: string[]) => gerarContratoDePropostas(propostaIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contratos-supabase"] });
      void qc.invalidateQueries({ queryKey: ["propostas-supabase"] });
    },
  });
}
