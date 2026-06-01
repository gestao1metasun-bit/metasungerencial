/**
 * D15 / Módulo Comercial — Onda C2
 * Repositório oficial dos fluxos de Revisão / Renovação / Vencimento de Propostas.
 *
 * Toda mutação passa pelas RPCs do Supabase (auditadas, com flag interna
 * `app.via_revisao_proposta` que destrava o bloqueio de edição). Edição
 * direta de proposta APROVADA/ASSINADA/EM_REVISAO/VENCIDA/CANCELADA é
 * recusada pelo trigger `tg_propostas_bloqueia_edicao_aprovada`.
 */
import { supabase } from '@/integrations/supabase/client';
import { withPerf } from '@/lib/perf';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const propostasRevisaoRepo = {
  /** Abre revisão formal: marca original EM_REVISAO e clona em nova versão RASCUNHO. Retorna o id da nova proposta. */
  async solicitarRevisao(id: string, motivo: string): Promise<string> {
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Motivo da revisão obrigatório (mínimo 5 caracteres).');
    }
    const { data, error } = await withPerf('rpc.proposta_solicitar_revisao', () => supabase.rpc('rpc_proposta_solicitar_revisao', {
      _id: id,
      _motivo: motivo.trim(),
    }));
    if (error) throw error;
    return data as unknown as string;
  },

  /** Renova validade (default 45 dias). Exige permissão comercial.proposta.aprovar_excecao. */
  async renovarValidade(id: string, motivo: string, dias = 45): Promise<void> {
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Motivo da renovação obrigatório (mínimo 5 caracteres).');
    }
    const { error } = await withPerf('rpc.proposta_renovar_validade', () => supabase.rpc('rpc_proposta_renovar_validade', {
      _id: id,
      _motivo: motivo.trim(),
      _dias: dias,
    }));
    if (error) throw error;
  },

  /** Varredura idempotente: marca como VENCIDA propostas com validade < hoje. */
  async marcarVencidas(): Promise<number> {
    const { data, error } = await withPerf('rpc.proposta_marcar_vencidas', () => supabase.rpc('rpc_proposta_marcar_vencidas'));
    if (error) throw error;
    return Number(data ?? 0);
  },
};

export function useSolicitarRevisaoProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; motivo: string }) =>
      propostasRevisaoRepo.solicitarRevisao(p.id, p.motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propostas'] }),
  });
}

export function useRenovarValidadeProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; motivo: string; dias?: number }) =>
      propostasRevisaoRepo.renovarValidade(p.id, p.motivo, p.dias ?? 45),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propostas'] }),
  });
}

export function useMarcarPropostasVencidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => propostasRevisaoRepo.marcarVencidas(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propostas'] }),
  });
}
