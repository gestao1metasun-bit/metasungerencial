/**
 * D15 Onda 1.B+1.C — Repositório oficial de Lançamentos.
 *
 * Leitura: view `v_lancamentos_derivados` (Supabase = fonte única).
 * Escrita: RPC `rpc_lancamento_criar` com idempotência obrigatória.
 *
 * Substitui qualquer leitura/escrita de stores LS financeiras (ms.fin.*).
 */
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { novoRequestId } from './idempotencia-repo';

export interface LancamentoDerivado {
  lancamento_id: string;
  origem: 'TITULO' | 'MOVIMENTACAO' | 'ADIANTAMENTO' | 'BOLETO' | 'EXTRATO';
  entidade_id: string;
  tipo_lancamento: string;
  codigo: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  contrato_id: string | null;
  natureza_id: string | null;
  centro_resultado_id: string | null;
  conta_id: string | null;
  valor: number;
  saldo: number;
  competencia: string | null;
  data_referencia: string | null;
  status: string;
  descricao: string | null;
  created_at: string;
  user_id: string | null;
  natureza_temporal: 'previsto' | 'realizado';
}

export interface NovoLancamentoInput {
  tipo: 'receber' | 'pagar';
  valor: number;
  vencimento: string;
  natureza_id: string;
  centro_id: string;
  conta_id: string;
  cliente_id?: string | null;
  fornecedor_id?: string | null;
  contrato_id?: string | null;
  descricao?: string | null;
  competencia?: string | null;
  forma_pagamento?: string | null;
}

export interface ListarLancamentosFiltro {
  origem?: LancamentoDerivado['origem'];
  tipo?: 'receber' | 'pagar';
  natureza_temporal?: 'previsto' | 'realizado';
  de?: string;
  ate?: string;
  limit?: number;
}

export const lancamentosRepo = {
  async listar(f: ListarLancamentosFiltro = {}): Promise<LancamentoDerivado[]> {
    let q = supabase
      .from('v_lancamentos_derivados' as never)
      .select('*')
      .order('data_referencia', { ascending: false, nullsFirst: false })
      .limit(f.limit ?? 200);
    if (f.origem) q = q.eq('origem', f.origem);
    if (f.tipo) q = q.eq('tipo_lancamento', f.tipo);
    if (f.natureza_temporal) q = q.eq('natureza_temporal', f.natureza_temporal);
    if (f.de) q = q.gte('data_referencia', f.de);
    if (f.ate) q = q.lte('data_referencia', f.ate);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as LancamentoDerivado[];
  },

  /** Cria lançamento via RPC oficial (atômico + idempotente). */
  async criar(input: NovoLancamentoInput, requestId?: string): Promise<string> {
    const reqId = requestId ?? novoRequestId();
    // D19.1.fix F5 — instrumentação client-side da RPC crítica.
    const { withPerf } = await import('@/lib/perf');
    const { data, error } = await withPerf('rpc.lancamento_criar', () =>
      supabase.rpc('rpc_lancamento_criar', {
        _request_id: reqId,
        _tipo: input.tipo,
        _valor: input.valor,
        _vencimento: input.vencimento,
        _natureza_id: input.natureza_id,
        _centro_id: input.centro_id,
        _conta_id: input.conta_id,
        _cliente_id: input.cliente_id ?? null,
        _fornecedor_id: input.fornecedor_id ?? null,
        _contrato_id: input.contrato_id ?? null,
        _descricao: input.descricao ?? null,
        _competencia: input.competencia ?? null,
        _forma_pagamento: input.forma_pagamento ?? null,
      } as never),
    );
    if (error) throw error;
    return data as unknown as string;
  },
};

export function useLancamentos(filtro: ListarLancamentosFiltro = {}) {
  return useQuery({
    queryKey: ['lancamentos', filtro],
    queryFn: () => lancamentosRepo.listar(filtro),
    staleTime: 30_000,
  });
}

export function useCriarLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { input: NovoLancamentoInput; requestId?: string }) =>
      lancamentosRepo.criar(p.input, p.requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos'] });
      qc.invalidateQueries({ queryKey: ['titulos'] });
      qc.invalidateQueries({ queryKey: ['saude-sistema'] });
    },
  });
}
