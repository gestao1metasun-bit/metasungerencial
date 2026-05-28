/**
 * D15 / Módulo Comercial — Onda C1
 * Repositório oficial dos catálogos configuráveis do Comercial.
 *
 * Cobre:
 *   - comercial_pipeline_etapas
 *   - lead_origens
 *   - motivos_perda
 *   - motivos_ganho
 *
 * Regras:
 *   - SELECT aberto a authenticated.
 *   - INSERT/UPDATE exige `comercial.editar` ou admin (gated pela RLS).
 *   - DELETE só admin.
 *   - row_version controla concorrência otimista; auditoria forward-only.
 *
 * Esta camada NÃO toca assinatura, comissão, reabertura ou disparo paralelo.
 */
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------- Types ----------
export interface PipelineEtapa {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'LEAD' | 'PROPOSTA' | 'CONTRATO';
  ordem: number;
  cor: string | null;
  ativo: boolean;
  descricao: string | null;
  row_version: number;
}

export interface CatalogoSimples {
  id: string;
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  row_version: number;
}

export interface MotivoPerda extends CatalogoSimples {
  exige_observacao: boolean;
}

// ---------- Pipeline ----------
export const pipelineEtapasRepo = {
  async listar(tipo?: PipelineEtapa['tipo']): Promise<PipelineEtapa[]> {
    let q = supabase
      .from('comercial_pipeline_etapas')
      .select('id, codigo, nome, tipo, ordem, cor, ativo, descricao, row_version')
      .is('deleted_at', null)
      .order('ordem', { ascending: true });
    if (tipo) q = q.eq('tipo', tipo);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PipelineEtapa[];
  },
};

export function usePipelineEtapas(tipo?: PipelineEtapa['tipo']) {
  return useQuery({
    queryKey: ['comercial', 'pipeline-etapas', tipo ?? 'ALL'],
    queryFn: () => pipelineEtapasRepo.listar(tipo),
    staleTime: 5 * 60_000,
  });
}

// ---------- Lead origens ----------
export const leadOrigensRepo = {
  async listar(): Promise<CatalogoSimples[]> {
    const { data, error } = await supabase
      .from('lead_origens')
      .select('id, codigo, nome, ordem, ativo, row_version')
      .is('deleted_at', null)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CatalogoSimples[];
  },
};

export function useLeadOrigens() {
  return useQuery({
    queryKey: ['comercial', 'lead-origens'],
    queryFn: () => leadOrigensRepo.listar(),
    staleTime: 5 * 60_000,
  });
}

// ---------- Motivos de perda ----------
export const motivosPerdaRepo = {
  async listar(): Promise<MotivoPerda[]> {
    const { data, error } = await supabase
      .from('motivos_perda')
      .select('id, codigo, nome, ordem, ativo, exige_observacao, row_version')
      .is('deleted_at', null)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MotivoPerda[];
  },
};

export function useMotivosPerda() {
  return useQuery({
    queryKey: ['comercial', 'motivos-perda'],
    queryFn: () => motivosPerdaRepo.listar(),
    staleTime: 5 * 60_000,
  });
}

// ---------- Motivos de ganho ----------
export const motivosGanhoRepo = {
  async listar(): Promise<CatalogoSimples[]> {
    const { data, error } = await supabase
      .from('motivos_ganho')
      .select('id, codigo, nome, ordem, ativo, row_version')
      .is('deleted_at', null)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CatalogoSimples[];
  },
};

export function useMotivosGanho() {
  return useQuery({
    queryKey: ['comercial', 'motivos-ganho'],
    queryFn: () => motivosGanhoRepo.listar(),
    staleTime: 5 * 60_000,
  });
}

// ---------- Toggle ativo (gated por RLS) ----------
type Tabela =
  | 'comercial_pipeline_etapas'
  | 'lead_origens'
  | 'motivos_perda'
  | 'motivos_ganho';

export function useToggleCatalogoAtivo(tabela: Tabela) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; ativo: boolean; row_version: number }) => {
      const { error } = await supabase
        .from(tabela)
        .update({ ativo: p.ativo })
        .eq('id', p.id)
        .eq('row_version', p.row_version);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comercial'] }),
  });
}
