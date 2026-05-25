// ============================================================================
// Factory do repositório Financeiro.
//
// Hoje retorna LocalStorageFinanceiroAdapter (protótipo).
// Para alternar fonte sem mexer em telas, basta trocar o retorno desta
// função — ou ler de uma feature flag (`fin.repository.source`).
//
// Uso:
//   import { getFinanceiroRepository } from "@/lib/repositories";
//   const repo = getFinanceiroRepository();
//   const titulos = await repo.listarTitulos({ tipo: "AP" });
// ============================================================================
import type { FinanceiroRepository } from "./financeiro-repository";
import { LocalStorageFinanceiroAdapter } from "./financeiro-repository.local";
import { SupabaseFinanceiroAdapter } from "./financeiro-repository.supabase";

export type RepositorySource = "local" | "supabase";

let _instance: FinanceiroRepository | null = null;
let _source: RepositorySource = "local";

export function getFinanceiroRepository(): FinanceiroRepository {
  if (_instance) return _instance;
  _instance = _source === "supabase"
    ? new SupabaseFinanceiroAdapter()
    : new LocalStorageFinanceiroAdapter();
  return _instance;
}

/** Permite alternar a fonte em runtime (testes, feature flag, console). */
export function setFinanceiroRepositorySource(source: RepositorySource) {
  _source = source;
  _instance = null;
}

export function getFinanceiroRepositorySource(): RepositorySource {
  return _source;
}

export type { FinanceiroRepository } from "./financeiro-repository";
export type {
  FiltroTitulos, BaixaInput, CriarTituloInput, RepoError, RepoErrorCode,
  HistoricoEntrada, CalcularEncargosInput,
  ChequeInput, ImportPrevisaoLanc, AnexoInput, CopiaTituloOverrides,
  CadastrosRepository, ParametrosRepository,
  // Re-export de tipos de domínio para uso pelas telas (não importar do store!)
  Titulo, TituloTipo, TituloStatus, Movimento, Rateio, Anexo,
  Renegociacao, RenegociarInput, SimulacaoRenegociacao,
  Rescisao, SimularRescisaoInput, ConfirmarRescisaoInput, SimulacaoRescisao,
  Adiantamento, AdiantamentoTipo, Abatimento,
  RegistrarAdiantamentoInput, AbaterInput,
  Compra, CriarCompraInput,
  ExtratoLancamento, FechamentoMes,
  FluxoPonto, UseFluxoArgs,
  Fornecedor, ContaFinanceira, NaturezaFin,
  GrupoFinanceiro, SubgrupoFinanceiro,
  CentroCustoFin, MeioPagamento, TipoAplicacao,
  ParametrosFinanceiros, EncargosCalculados,
} from "./financeiro-repository";
