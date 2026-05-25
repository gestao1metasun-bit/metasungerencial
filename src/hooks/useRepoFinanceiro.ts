// ============================================================================
// Hooks reativos do FinanceiroRepository.
//
// Onda 1: estes hooks são a porta de entrada que as telas DEVEM passar a
// usar (substituindo `useTitulos`, `useRenegociacoes`, etc.). Por baixo
// dos panos, hoje, eles piggybackam nos hooks dos stores localStorage —
// então o front continua reativo SEM nenhuma mudança visual. Quando o
// adapter Supabase entrar, basta:
//
//   1. setFinanceiroRepositorySource("supabase")
//   2. Trocar a implementação interna destes hooks por `useQuery` +
//      `repo.subscribe()` (postgres_changes).
//
// Importante: nenhuma tela deve mais importar `@/lib/fin-*-store` direto.
// ============================================================================
import { useMemo } from "react";
import { useTitulos } from "@/lib/fin-titulos-store";
import { useRenegociacoes } from "@/lib/fin-renegociacao-store";
import { useRescisoes } from "@/lib/fin-rescisao-store";
import { useAdiantamentos } from "@/lib/fin-adiantamentos-store";
import { useCompras } from "@/lib/fin-compras-store";
import { useExtrato } from "@/lib/fin-conciliacao-store";
import { useFechamentos } from "@/lib/fin-fechamento-store";
import { useFluxoCaixa } from "@/lib/fin-fluxo-caixa";
import { useParametrosFinanceiros } from "@/lib/fin-parametros-financeiros-store";
import { useFornecedores } from "@/lib/fin-fornecedores-store";
import { useContasFinanceiras } from "@/lib/fin-contas-store";
import { useNaturezasFin } from "@/lib/fin-naturezas-store";
import { useCentrosCustoFin } from "@/lib/fin-centros-custo-store";
import { useMeiosPagamento } from "@/lib/fin-meios-pagamento-store";
import { useTiposAplicacao } from "@/lib/fin-tipos-aplicacao-store";
import { useGrupos, useSubgrupos } from "@/lib/fin-grupos-store";
import { getFinanceiroRepository } from "@/lib/repositories";

import type {
  FinanceiroRepository,
  Titulo, FiltroTitulos, Renegociacao, Rescisao, Adiantamento,
  Compra, ExtratoLancamento, FechamentoMes, FluxoPonto, UseFluxoArgs,
  ParametrosFinanceiros,
  Fornecedor, ContaFinanceira, NaturezaFin,
  CentroCustoFin, MeioPagamento, TipoAplicacao,
  GrupoFinanceiro, SubgrupoFinanceiro,
} from "@/lib/repositories/financeiro-repository";

/**
 * Hook canônico para acessar o repositório financeiro nos handlers de UI.
 * Use sempre que precisar disparar uma mutação (criar/atualizar/baixar/…)
 * sem importar diretamente de `@/lib/fin-*-store`.
 */
export function useFinanceiroRepo(): FinanceiroRepository {
  return getFinanceiroRepository();
}

function aplicar(filtro: FiltroTitulos | undefined, lista: Titulo[]): Titulo[] {
  if (!filtro) return lista;
  return lista.filter((t) => {
    if (filtro.tipo && t.tipo !== filtro.tipo) return false;
    if (filtro.status && !filtro.status.includes(t.status)) return false;
    if (filtro.contratoId && t.contratoId !== filtro.contratoId) return false;
    if (filtro.obraId && t.obraId !== filtro.obraId) return false;
    if (filtro.fornecedor && t.fornecedor !== filtro.fornecedor) return false;
    if (filtro.cliente && t.cliente !== filtro.cliente) return false;
    if (filtro.competencia && t.competencia !== filtro.competencia) return false;
    const venc = filtro.usarVencimentoReal ? (t.vencimentoReal ?? t.vencimento) : t.vencimento;
    if (filtro.vencimentoDe && venc < filtro.vencimentoDe) return false;
    if (filtro.vencimentoAte && venc > filtro.vencimentoAte) return false;
    return true;
  });
}

/** Lista reativa de títulos, com filtro opcional (mesma semântica do repo). */
export function useRepoTitulos(filtro?: FiltroTitulos): Titulo[] {
  const all = useTitulos();
  return useMemo(() => aplicar(filtro, all), [
    all, filtro?.tipo, filtro?.contratoId, filtro?.obraId, filtro?.fornecedor,
    filtro?.cliente, filtro?.competencia, filtro?.vencimentoDe, filtro?.vencimentoAte,
    filtro?.usarVencimentoReal, filtro?.status?.join(","),
  ]);
}

export function useRepoRenegociacoes(tituloId?: string): Renegociacao[] {
  const all = useRenegociacoes();
  return useMemo(
    () => (tituloId ? all.filter((r) => r.tituloOriginalId === tituloId) : all),
    [all, tituloId],
  );
}

export function useRepoRescisoes(): Rescisao[] { return useRescisoes(); }
export function useRepoAdiantamentos(): Adiantamento[] { return useAdiantamentos(); }
export function useRepoCompras(): Compra[] { return useCompras(); }
export function useRepoExtrato(): ExtratoLancamento[] { return useExtrato(); }
export function useRepoFechamentos(): FechamentoMes[] { return useFechamentos(); }
export function useRepoFluxoCaixa(args: UseFluxoArgs): FluxoPonto[] { return useFluxoCaixa(args); }
export function useRepoParametros(): ParametrosFinanceiros { return useParametrosFinanceiros(); }
