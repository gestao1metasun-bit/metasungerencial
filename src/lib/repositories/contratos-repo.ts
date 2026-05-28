/**
 * D15 Onda 3 — Repositório oficial de Contratos.
 *
 * Substitui leituras LS de contratos por Supabase direto.
 * Para soft-delete, usar RPC oficial `soft_delete_entidade('contratos', id, motivo)`.
 */
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Contrato {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  consultor_id: string | null;
  status: string;
  valor_total: number | null;
  data_assinatura: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export const contratosRepo = {
  async listar(opts?: { status?: string; clienteId?: string; limit?: number }): Promise<Contrato[]> {
    let q = supabase
      .from('contratos')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(opts?.limit ?? 200);
    if (opts?.status) q = q.eq('status', opts.status);
    if (opts?.clienteId) q = q.eq('cliente_id', opts.clienteId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Contrato[];
  },

  async obter(id: string): Promise<Contrato | null> {
    const { data, error } = await supabase.from('contratos').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Contrato) ?? null;
  },

  async softDelete(id: string, motivo: string): Promise<void> {
    if (!motivo || motivo.trim().length < 3) throw new Error('Motivo obrigatório.');
    const { error } = await supabase.rpc('soft_delete_entidade', { _modulo: 'contratos', _id: id, _motivo: motivo });
    if (error) throw error;
  },
};

export function useContratos(opts?: { status?: string; clienteId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['contratos', opts],
    queryFn: () => contratosRepo.listar(opts),
    staleTime: 60_000,
  });
}

export function useContrato(id?: string | null) {
  return useQuery({
    queryKey: ['contrato', id],
    queryFn: () => contratosRepo.obter(id!),
    enabled: !!id,
  });
}

export function useSoftDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; motivo: string }) => contratosRepo.softDelete(p.id, p.motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contratos'] }),
  });
}
