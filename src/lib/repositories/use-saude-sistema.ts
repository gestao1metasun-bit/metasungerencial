/**
 * D15 Onda 8 — Hook para visão consolidada de saúde do sistema.
 * Lê da view oficial `v_saude_sistema`.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SaudeSistema {
  auditoria_24h: number;
  auditoria_7d: number;
  governance_pendentes: number;
  integracao_titulos_erro: number;
  integracao_parcelas_erro: number;
  integracao_mov_erro: number;
  anexos_orfaos_titulos: number;
  titulos_em_aberto: number;
  titulos_vencidos: number;
  aprovacoes_pendentes: number;
  aprovacoes_atrasadas: number;
  titulos_alta_edicao: number;
  gerado_em: string;
}

export function useSaudeSistema() {
  return useQuery({
    queryKey: ['saude-sistema'],
    queryFn: async (): Promise<SaudeSistema | null> => {
      const { data, error } = await supabase
        .from('v_saude_sistema' as never)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as SaudeSistema) ?? null;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
