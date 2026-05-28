/**
 * D15 Onda 4 — Repositório oficial de Anexos Universais
 *
 * Substitui qualquer leitura/escrita direta na tabela `anexos`.
 * Suporta as 26 entidades canônicas validadas no CHECK constraint.
 */
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type EntidadeAnexavel =
  | 'clientes' | 'fornecedores' | 'contratos' | 'aditivos' | 'propostas'
  | 'pedidos_venda' | 'projetos_contrato' | 'obras' | 'titulos_financeiros'
  | 'parcelas_financeiras' | 'movimentacoes_financeiras' | 'boletos'
  | 'adiantamentos' | 'rescisoes_contrato' | 'extrato_banco'
  | 'workflow_aprovacoes' | 'estoque_movimentos' | 'estoque_reservas'
  | 'estoque_entregas' | 'ordens_compra' | 'cotacoes_compra'
  | 'solicitacoes_material' | 'financiamentos' | 'produtos' | 'leads' | 'tarefas';

export interface Anexo {
  id: string;
  entidade_tipo: EntidadeAnexavel;
  entidade_id: string;
  categoria: string;
  storage_path: string;
  nome: string;
  mime: string;
  tamanho: number;
  observacao: string | null;
  owner_id: string;
  created_at: string;
}

export const anexosRepo = {
  async listar(entidade: EntidadeAnexavel, entidadeId: string): Promise<Anexo[]> {
    const { data, error } = await supabase
      .from('anexos')
      .select('*')
      .eq('entidade_tipo', entidade)
      .eq('entidade_id', entidadeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Anexo[];
  },

  async upload(
    entidade: EntidadeAnexavel,
    entidadeId: string,
    file: File,
    opts?: { categoria?: string; observacao?: string }
  ): Promise<Anexo> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão requerida.');
    const path = `${entidade}/${entidadeId}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from('anexos').upload(path, file, { upsert: false });
    if (up.error) throw up.error;
    const { data, error } = await supabase
      .from('anexos')
      .insert({
        entidade_tipo: entidade,
        entidade_id: entidadeId,
        categoria: opts?.categoria ?? 'outros',
        storage_path: path,
        nome: file.name,
        mime: file.type || 'application/octet-stream',
        tamanho: file.size,
        observacao: opts?.observacao ?? null,
        owner_id: user.id,
      })
      .select()
      .single();
    if (error) {
      await supabase.storage.from('anexos').remove([path]);
      throw error;
    }
    return data as Anexo;
  },

  async remover(id: string, motivo: string): Promise<void> {
    if (!motivo || motivo.trim().length < 3) {
      throw new Error('Motivo obrigatório (mínimo 3 caracteres).');
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('anexos')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id, deleted_reason: motivo })
      .eq('id', id);
    if (error) throw error;
  },

  async getSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
    const { data, error } = await supabase.storage.from('anexos').createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },
};

// React Query helpers
export function useAnexos(entidade: EntidadeAnexavel, entidadeId?: string | null) {
  return useQuery({
    queryKey: ['anexos', entidade, entidadeId],
    queryFn: () => anexosRepo.listar(entidade, entidadeId!),
    enabled: !!entidadeId,
  });
}

export function useUploadAnexo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { entidade: EntidadeAnexavel; entidadeId: string; file: File; categoria?: string; observacao?: string }) =>
      anexosRepo.upload(p.entidade, p.entidadeId, p.file, { categoria: p.categoria, observacao: p.observacao }),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: ['anexos', p.entidade, p.entidadeId] }),
  });
}

export function useRemoverAnexo(entidade: EntidadeAnexavel, entidadeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; motivo: string }) => anexosRepo.remover(p.id, p.motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anexos', entidade, entidadeId] }),
  });
}
