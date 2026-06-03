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
  qc.invalidateQueries({ queryKey: ["aditivos"] });
}

export function useAprovarProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { propostaId: string; observacao?: string }) =>
      call<string>("rpc_proposta_aprovar", {
        p_proposta_id: i.propostaId,
        p_observacao: i.observacao ?? null,
      }),
    onSuccess: () => {
      toast.success("Proposta aprovada com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao aprovar: ${e.message}`),
  });
}

export function useReprovarProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { propostaId: string; motivo: string }) =>
      call<string>("rpc_proposta_reprovar", {
        p_proposta_id: i.propostaId,
        p_motivo: i.motivo,
      }),
    onSuccess: () => {
      toast.success("Proposta reprovada com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao reprovar: ${e.message}`),
  });
}

export function useCancelarProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { propostaId: string; motivo: string }) =>
      call<string>("rpc_proposta_cancelar", {
        p_proposta_id: i.propostaId,
        p_motivo: i.motivo,
      }),
    onSuccess: () => {
      toast.success("Proposta cancelada com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao cancelar: ${e.message}`),
  });
}

export function useReabrirProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { propostaId: string; motivo: string }) =>
      call<string>("rpc_proposta_reabrir", {
        p_proposta_id: i.propostaId,
        p_motivo: i.motivo,
      }),
    onSuccess: () => {
      toast.success("Proposta reaberta com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao reabrir: ${e.message}`),
  });
}

export function useGerarContratoDaProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { propostaId: string }) =>
      call<string>("rpc_proposta_gerar_contrato", { p_proposta_id: i.propostaId }),
    onSuccess: () => {
      toast.success("Contrato gerado com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao gerar contrato: ${e.message}`),
  });
}

export function useEnviarContratoEngenharia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string }) =>
      call<string>("rpc_contrato_enviar_engenharia", { p_contrato_id: i.contratoId }),
    onSuccess: () => {
      toast.success("Obra criada com sucesso na Engenharia.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao enviar para Engenharia: ${e.message}`),
  });
}

export function useEnviarContratoFinanciamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string; observacao?: string }) =>
      call<string>("rpc_contrato_enviar_financiamento", {
        p_contrato_id: i.contratoId,
        p_observacao: i.observacao ?? null,
      }),
    onSuccess: () => {
      toast.success("Pendência de financiamento criada com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao enviar para Financiamentos: ${e.message}`),
  });
}

export function useGerarComissaoDeContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string }) =>
      call<string>("rpc_comissao_gerar_de_contrato", { p_contrato_id: i.contratoId }),
    onSuccess: () => {
      toast.success("Comissão gerada com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao gerar comissão: ${e.message}`),
  });
}

export function useEnviarContratoAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string; observacao?: string }) =>
      call<string>("rpc_contrato_enviar_assinatura", {
        p_contrato_id: i.contratoId,
        p_observacao: i.observacao ?? null,
      }),
    onSuccess: () => {
      toast.success("Contrato enviado para assinatura com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao enviar assinatura: ${e.message}`),
  });
}

export function useGerarAditivoContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { contratoId: string; descricao: string; tipo?: string; valorDelta?: number }) =>
      call<string>("rpc_contrato_gerar_aditivo", {
        p_contrato_id: i.contratoId,
        p_descricao: i.descricao,
        p_tipo: i.tipo ?? "Comercial",
        p_valor_delta: i.valorDelta ?? 0,
      }),
    onSuccess: () => {
      toast.success("Aditivo gerado com sucesso.");
      invalidateComercial(qc);
    },
    onError: (e: Error) => toast.error(`Falha ao gerar aditivo: ${e.message}`),
  });
}

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
    try {
      await fn(it);
      ok++;
    } catch {
      falhas++;
    }
  }
  if (falhas === 0) toast.success(`${label}: ${ok} registro(s) processados.`);
  else toast.warning(`${label}: ${ok} OK, ${falhas} falha(s).`);
  return { ok, falhas };
}
