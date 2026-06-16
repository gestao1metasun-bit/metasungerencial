/**
 * C-ENT.8 — Repositório oficial Supabase para Aditivos.
 * Fonte: public.aditivos. Aplicação atômica via RPC rpc_aditivo_aplicar.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/repositories/error-log-repo";

export type AditivoSupabase = {
  id: string;
  codigo: string | null;
  contrato_id: string;
  projeto_id: string | null;
  tipo_escopo: "PROJETO" | "CONTRATO";
  tipo: string;
  status: "RASCUNHO" | "EM_APROVACAO" | "APLICADO" | "CANCELADO";
  numero: number;
  motivo: string | null;
  descricao: string | null;
  valor_anterior: number | null;
  valor_novo: number | null;
  diferenca_valor: number | null;
  potencia_anterior: number | null;
  potencia_nova: number | null;
  diferenca_potencia: number | null;
  modulos_anterior: number | null;
  modulos_novo: number | null;
  diferenca_modulos: number | null;
  inversor_anterior: string | null;
  inversor_novo: string | null;
  payload_alteracoes: Record<string, unknown> | null;
  dados: Record<string, unknown> | null;
  criado_por: string | null;
  aplicado_por: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  aplicado_em: string | null;
  created_at: string;
  updated_at: string;
  tipo_aditivo: "NORMAL" | "COMPENSATORIO";
  aditivo_origem_id: string | null;
  motivo_compensacao: string | null;
  observacao_compensacao: string | null;
};

const COLS =
  "id,codigo,contrato_id,projeto_id,tipo_escopo,tipo,status,numero,motivo,descricao," +
  "valor_anterior,valor_novo,diferenca_valor,potencia_anterior,potencia_nova,diferenca_potencia," +
  "modulos_anterior,modulos_novo,diferenca_modulos,inversor_anterior,inversor_novo," +
  "payload_alteracoes,dados,criado_por,aplicado_por,aprovado_por,aprovado_em,aplicado_em," +
  "created_at,updated_at," +
  "tipo_aditivo,aditivo_origem_id,motivo_compensacao,observacao_compensacao";

function reportError(acao: string, err: unknown, payload?: Record<string, unknown>) {
  const e = err as { message?: string; stack?: string };
  void logError({
    modulo: "comercial",
    tela: "aditivos-repo",
    acao,
    mensagem: e?.message ?? String(err),
    stack: e?.stack,
    payload,
    severidade: "error",
  });
}

export async function listarAditivosPorContrato(contratoId: string): Promise<AditivoSupabase[]> {
  const { data, error } = await (supabase as any)
    .from("aditivos")
    .select(COLS)
    .eq("contrato_id", contratoId)
    .is("deleted_at", null)
    .order("numero", { ascending: false });
  if (error) {
    reportError("listarAditivosPorContrato", error, { contratoId });
    throw error;
  }
  return (data ?? []) as AditivoSupabase[];
}

export async function listarAditivosPorProjeto(projetoId: string): Promise<AditivoSupabase[]> {
  const { data, error } = await (supabase as any)
    .from("aditivos")
    .select(COLS)
    .eq("projeto_id", projetoId)
    .is("deleted_at", null)
    .order("numero", { ascending: false });
  if (error) {
    reportError("listarAditivosPorProjeto", error, { projetoId });
    throw error;
  }
  return (data ?? []) as AditivoSupabase[];
}

export type AplicarAditivoInput = {
  contrato_id: string;
  tipo_escopo: "PROJETO" | "CONTRATO";
  projeto_id?: string | null;
  motivo: string;
  descricao?: string | null;
  valor_novo?: number | null;
  potencia_nova?: number | null;
  modulos_novo?: number | null;
  inversor_novo?: string | null;
  observacoes?: string | null;
  payload_alteracoes?: Record<string, unknown>;
};

export async function aplicarAditivo(input: AplicarAditivoInput): Promise<string> {
  const { data, error } = await (supabase as any).rpc("rpc_aditivo_aplicar", { _payload: input });
  if (error) {
    reportError("aplicarAditivo", error, input as unknown as Record<string, unknown>);
    throw error;
  }
  return data as string;
}

/* ============================== HOOKS ============================== */

export function useAditivosPorContrato(contratoId: string | null | undefined) {
  return useQuery({
    queryKey: ["aditivos", "contrato", contratoId],
    enabled: !!contratoId,
    queryFn: () => listarAditivosPorContrato(contratoId!),
  });
}

export function useAditivosPorProjeto(projetoId: string | null | undefined) {
  return useQuery({
    queryKey: ["aditivos", "projeto", projetoId],
    enabled: !!projetoId,
    queryFn: () => listarAditivosPorProjeto(projetoId!),
  });
}

export function useAplicarAditivoSupabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aplicarAditivo,
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["aditivos", "contrato", vars.contrato_id] });
      qc.invalidateQueries({ queryKey: ["aditivos"] });
      qc.invalidateQueries({ queryKey: ["contrato", vars.contrato_id] });
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["projetos", "contrato", vars.contrato_id] });
      if (vars.projeto_id) {
        qc.invalidateQueries({ queryKey: ["projeto", vars.projeto_id] });
        qc.invalidateQueries({ queryKey: ["aditivos", "projeto", vars.projeto_id] });
      }
      qc.invalidateQueries({ queryKey: ["timeline", "contrato", vars.contrato_id] });
      if (vars.projeto_id) {
        qc.invalidateQueries({ queryKey: ["timeline", "projeto", vars.projeto_id] });
      }
    },
  });
}
