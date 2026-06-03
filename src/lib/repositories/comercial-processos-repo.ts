/**
 * D27.COM.3.b — Repositório oficial dos processos operacionais do Comercial.
 *
 * Todas as ações chamam RPCs oficiais (SECURITY DEFINER). Nenhuma muta
 * status diretamente. Auditoria/permissão/idempotência é responsabilidade
 * da RPC. UI só dispara, captura erro e atualiza caches.
 *
 * Ondas D27.COM.3:
 *   .a backend (esta turn)
 *   .b wire propostas (esta turn)
 *   .b2 wire contratos (necessita migrar contratos LS → Supabase)
 *   .c reprovar/cancelar/reabrir/aditivo/assinatura
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withPerf } from "@/lib/perf";
import { toast } from "sonner";

type Json = Record<string, unknown>;

async function call<T = unknown>(rpc: string, args: Json): Promise<T> {
  const { data, error } = await withPerf(`rpc.${rpc}`, () =>
    supabase.rpc(rpc as never, args as never),
  );
  if (error) throw new Error(error.message);
  return data as T;
}

function invalidateComercial(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["propostas"] });
  qc.invalidateQueries({ queryKey: ["contratos"] });
  qc.invalidateQueries({ queryKey: ["obras"] });
  qc.invalidateQueries({ queryKey: ["comissoes"] });
  qc.invalidateQueries({ queryKey: ["financiamentos_pendencias"] });
}

/** rpc_proposta_aprovar(p_proposta_id, p_observacao?) */
export function useAprovarProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { propostaId: string; observacao?: string }) =>
      call<string>("rpc_proposta_aprovar", {
        p_proposta_id: i.propostaId,
        p_observacao: i.observacao ?? null,
      }),
    onSuccess: () => {
      toast.success("Proposta aprovada.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao aprovar: ${e.message}`),
  });
}

/** rpc_proposta_gerar_contrato(p_proposta_id) → contrato_id */
export function useGerarContratoDaProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { propostaId: string }) =>
      call<string>("rpc_proposta_gerar_contrato", { p_proposta_id: i.propostaId }),
    onSuccess: (contratoId) => {
      toast.success(`Contrato gerado (${contratoId.slice(0, 8)}…).`);
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao gerar contrato: ${e.message}`),
  });
}

/** rpc_contrato_enviar_engenharia(p_contrato_id) → obra_id */
export function useEnviarContratoEngenharia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string }) =>
      call<string>("rpc_contrato_enviar_engenharia", { p_contrato_id: i.contratoId }),
    onSuccess: (obraId) => {
      toast.success(`Obra criada e enviada para Engenharia (${obraId.slice(0, 8)}…).`);
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao enviar para Engenharia: ${e.message}`),
  });
}

/** rpc_contrato_enviar_financiamento(p_contrato_id, p_observacao?) → pendencia_id */
export function useEnviarContratoFinanciamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string; observacao?: string }) =>
      call<string>("rpc_contrato_enviar_financiamento", {
        p_contrato_id: i.contratoId,
        p_observacao: i.observacao ?? null,
      }),
    onSuccess: () => {
      toast.success("Contrato enviado para Financiamentos.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao enviar para Financiamentos: ${e.message}`),
  });
}

/** rpc_comissao_gerar_de_contrato(p_contrato_id) → comissao_id */
export function useGerarComissaoDeContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string }) =>
      call<string>("rpc_comissao_gerar_de_contrato", { p_contrato_id: i.contratoId }),
    onSuccess: () => {
      toast.success("Comissão gerada.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao gerar comissão: ${e.message}`),
  });
}

/** Helpers de lote (sequencial, com summary final). */
export async function executarEmLote<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  label: string,
): Promise<{ ok: number; falhas: number }> {
  if (items.length === 0) {
    toast.info(`${label}: nenhum item selecionado.`);
    return { ok: 0, falhas: 0 };
  }
  if (items.length > 100) {
    toast.error(`${label}: máximo 100 por execução.`);
    return { ok: 0, falhas: items.length };
  }
  let ok = 0;
  let falhas = 0;
  for (const it of items) {
    try { await fn(it); ok++; } catch { falhas++; }
  }
  if (falhas === 0) toast.success(`${label}: ${ok} registro(s) processados.`);
  else toast.warning(`${label}: ${ok} OK, ${falhas} falha(s).`);
  return { ok, falhas };
}
