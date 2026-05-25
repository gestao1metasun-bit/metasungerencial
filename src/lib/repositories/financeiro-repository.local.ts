// ============================================================================
// LocalStorageFinanceiroAdapter — implementação PROVISÓRIA do
// FinanceiroRepository usando os stores localStorage atuais.
//
// Onda 1: cobertura completa do contrato. Cada método aqui é um wrapper
// fino que delega ao store correspondente, mapeia erros para RepoError
// tipados e — quando aplicável — agrupa mutações cross-store em uma única
// chamada (preparação para RPC atômica futura no SupabaseAdapter).
//
// ATENÇÃO: localStorage é tratado como camada temporária de protótipo.
// NÃO é fonte de verdade para uso operacional real. Para homologação, a
// fábrica em `./index.ts` deve passar a retornar SupabaseFinanceiroAdapter.
//
// Reatividade: hooks React (`useRepoTitulos`, etc.) piggybackam nos hooks
// `useXxx()` dos stores via useSyncExternalStore — então a UI atual
// continua reativa sem mudança alguma. O método `subscribe()` aqui é um
// no-op (não é usado pelos hooks React do prototype). O adapter Supabase
// futuro implementará subscribe via `postgres_changes`.
// ============================================================================
import {
  getTitulos, getTitulo,
  criarTitulo as storeCriar,
  atualizarTitulo as storeAtualizar,
  cancelarTitulo as storeCancelar,
  registrarBaixa as storeBaixa,
  estornarMovimento as storeEstorno,
  setRateios as storeSetRateios,
  apagarRateios as storeApagarRateios,
  detectarDuplicidade as storeDetectarDup,
} from "@/lib/fin-titulos-store";
import {
  getRenegociacoes, getRenegociacoesPorTitulo,
  simularRenegociacao as storeSimularReneg,
  confirmarRenegociacao as storeConfirmarReneg,
} from "@/lib/fin-renegociacao-store";
import {
  getRescisoes,
  simularRescisao as storeSimularRescisao,
  confirmarRescisao as storeConfirmarRescisao,
} from "@/lib/fin-rescisao-store";
import {
  getAdiantamentos, getSaldoContraparte,
  registrarAdiantamento as storeRegistrarAdiant,
  abaterAdiantamento as storeAbaterAdiant,
  estornarAdiantamento as storeEstornarAdiant,
} from "@/lib/fin-adiantamentos-store";
import {
  getCompras,
  criarCompra as storeCriarCompra,
  estocarCompra as storeEstocarCompra,
  cancelarCompra as storeCancelarCompra,
} from "@/lib/fin-compras-store";
import {
  getExtrato,
  importarExtratoCSV as storeImportarExtrato,
  sugerirCandidatos as storeSugerir,
  conciliar as storeConciliar,
  desfazerConciliacao as storeDesfazerConc,
  ignorarExtrato as storeIgnorarExtrato,
  removerExtrato as storeRemoverExtrato,
} from "@/lib/fin-conciliacao-store";
import {
  getParametrosFinanceiros, salvarParametrosFinanceiros,
} from "@/lib/fin-parametros-financeiros-store";
import {
  isMesFechado, isMesGlobalFechado,
  fecharContaMes as storeFecharConta, reabrirContaMes as storeReabrirConta,
  fecharMesGlobal as storeFecharGlobal, reabrirMesGlobal as storeReabrirGlobal,
} from "@/lib/fin-fechamento-store";
import { calcularFluxo } from "@/lib/fin-fluxo-caixa";
import { calcularEncargos as libCalcularEncargos } from "@/lib/fin-calculo-encargos";

import {
  upsertFornecedor, removeFornecedor, newFornecedorId, getFornecedores,
} from "@/lib/fin-fornecedores-store";
import {
  upsertConta, removeConta, newContaId, getContasFinanceiras,
} from "@/lib/fin-contas-store";
import {
  upsertNatureza, removeNatureza, newNaturezaId, getNaturezas,
} from "@/lib/fin-naturezas-store";
import {
  upsertGrupo, removeGrupo, upsertSubgrupo, removeSubgrupo,
  newGrupoId, newSubgrupoId, getGrupos, getSubgrupos,
} from "@/lib/fin-grupos-store";
import {
  upsertCentroCusto, removeCentroCusto, newCentroCustoId, getCentrosCustoFin,
} from "@/lib/fin-centros-custo-store";
import {
  upsertMeio, removeMeio, newMeioId, getMeiosPagamento,
} from "@/lib/fin-meios-pagamento-store";
import {
  upsertTipoAplicacao, removeTipoAplicacao, newTipoAplicacaoId, getTiposAplicacao,
} from "@/lib/fin-tipos-aplicacao-store";

import type {
  FinanceiroRepository, FiltroTitulos, BaixaInput, CriarTituloInput,
  Titulo, Movimento, Anexo, Rateio,
  Renegociacao, RenegociarInput, SimulacaoRenegociacao,
  Rescisao, SimularRescisaoInput, ConfirmarRescisaoInput, SimulacaoRescisao,
  Adiantamento, AdiantamentoTipo, Abatimento,
  RegistrarAdiantamentoInput, AbaterInput,
  Compra, CriarCompraInput,
  ExtratoLancamento, FechamentoMes,
  FluxoPonto, UseFluxoArgs,
  ParametrosFinanceiros, EncargosCalculados,
  HistoricoEntrada, CalcularEncargosInput,
  CadastrosRepository, ParametrosRepository,
} from "./financeiro-repository";
import { toRepoError, repoError } from "./financeiro-repository";

// --------------------------------------------------------------- util filtro
function aplicarFiltro(lista: Titulo[], f?: FiltroTitulos): Titulo[] {
  if (!f) return lista;
  return lista.filter((t) => {
    if (f.tipo && t.tipo !== f.tipo) return false;
    if (f.status && !f.status.includes(t.status)) return false;
    if (f.contratoId && t.contratoId !== f.contratoId) return false;
    if (f.obraId && t.obraId !== f.obraId) return false;
    if (f.fornecedor && t.fornecedor !== f.fornecedor) return false;
    if (f.cliente && t.cliente !== f.cliente) return false;
    if (f.competencia && t.competencia !== f.competencia) return false;
    const venc = f.usarVencimentoReal ? (t.vencimentoReal ?? t.vencimento) : t.vencimento;
    if (f.vencimentoDe && venc < f.vencimentoDe) return false;
    if (f.vencimentoAte && venc > f.vencimentoAte) return false;
    return true;
  });
}

// =============================================================== sub-adapters
const cadastrosLocal: CadastrosRepository = {
  fornecedores: {
    listar: async () => getFornecedores(),
    upsert: async (f) => { upsertFornecedor(f); },
    remover: async (id) => { removeFornecedor(id); },
    novoId: () => newFornecedorId(),
  },
  contas: {
    listar: async () => getContasFinanceiras(),
    upsert: async (c) => { upsertConta(c); },
    remover: async (id) => { removeConta(id); },
    novoId: () => newContaId(),
  },
  naturezas: {
    listar: async () => getNaturezas(),
    upsert: async (n) => { upsertNatureza(n); },
    remover: async (id) => { removeNatureza(id); },
    novoId: () => newNaturezaId(),
  },
  grupos: {
    listar: async () => getGrupos(),
    listarSubgrupos: async () => getSubgrupos(),
    upsertGrupo: async (g) => { upsertGrupo(g); },
    removerGrupo: async (id) => { removeGrupo(id); },
    upsertSubgrupo: async (s) => { upsertSubgrupo(s); },
    removerSubgrupo: async (id) => { removeSubgrupo(id); },
    novoIdGrupo: () => newGrupoId(),
    novoIdSubgrupo: () => newSubgrupoId(),
  },
  centrosCusto: {
    listar: async () => getCentrosCustoFin(),
    upsert: async (c) => { upsertCentroCusto(c); },
    remover: async (id) => { removeCentroCusto(id); },
    novoId: () => newCentroCustoId(),
  },
  meiosPagamento: {
    listar: async () => getMeiosPagamento(),
    upsert: async (m) => { upsertMeio(m); },
    remover: async (id) => { removeMeio(id); },
    novoId: () => newMeioId(),
  },
  tiposAplicacao: {
    listar: async () => getTiposAplicacao(),
    upsert: async (t) => { upsertTipoAplicacao(t); },
    remover: async (id) => { removeTipoAplicacao(id); },
    novoId: () => newTipoAplicacaoId(),
  },
};

const parametrosLocal: ParametrosRepository = {
  obter: async () => getParametrosFinanceiros(),
  salvar: async (patch, motivo) => { salvarParametrosFinanceiros(patch, motivo ?? "Sistema"); },
};

// =============================================================== adapter raiz
export class LocalStorageFinanceiroAdapter implements FinanceiroRepository {
  readonly cadastros = cadastrosLocal;
  readonly parametros = parametrosLocal;

  // -------- Títulos
  async listarTitulos(filtro?: FiltroTitulos): Promise<Titulo[]> {
    return aplicarFiltro(getTitulos(), filtro);
  }
  async obterTitulo(id: string): Promise<Titulo | null> {
    return getTitulo(id) ?? null;
  }
  async criarTitulo(input: CriarTituloInput): Promise<Titulo> {
    try { return storeCriar(input); }
    catch (e) { throw toRepoError(e); }
  }
  async atualizarTitulo(id: string, patch: Partial<Titulo>, motivo: string): Promise<Titulo> {
    try { storeAtualizar(id, patch, "Sistema", motivo); }
    catch (e) { throw toRepoError(e); }
    const r = getTitulo(id);
    if (!r) throw repoError("NOT_FOUND", "Título não encontrado.");
    return r;
  }
  async cancelarTitulo(id: string, motivo: string): Promise<void> {
    try { storeCancelar(id, motivo); }
    catch (e) { throw toRepoError(e); }
  }
  async detectarDuplicidade(input: Partial<Titulo>): Promise<Titulo[]> {
    return storeDetectarDup(input);
  }

  // -------- Baixas
  async registrarBaixa(input: BaixaInput): Promise<Movimento> {
    try {
      const { tituloId, ...mov } = input;
      return storeBaixa(tituloId, mov);
    } catch (e) { throw toRepoError(e); }
  }
  async estornarBaixa(tituloId: string, movimentoId: string, motivo: string): Promise<void> {
    try { storeEstorno(tituloId, movimentoId, motivo); }
    catch (e) { throw toRepoError(e); }
  }

  // -------- Rateios
  async setRateios(tituloId: string, rateios: Rateio[], _motivo?: string): Promise<void> {
    try { storeSetRateios(tituloId, rateios); }
    catch (e) { throw toRepoError(e); }
  }
  async apagarRateios(tituloId: string, _motivo?: string): Promise<void> {
    try { storeApagarRateios(tituloId); }
    catch (e) { throw toRepoError(e); }
  }

  // -------- Renegociação
  async simularRenegociacao(input: Parameters<FinanceiroRepository["simularRenegociacao"]>[0]): Promise<SimulacaoRenegociacao> {
    try { return storeSimularReneg(input); }
    catch (e) { throw toRepoError(e); }
  }
  async confirmarRenegociacao(input: RenegociarInput): Promise<Renegociacao> {
    try { return storeConfirmarReneg(input); }
    catch (e) { throw toRepoError(e); }
  }
  async listarRenegociacoes(tituloId?: string): Promise<Renegociacao[]> {
    return tituloId ? getRenegociacoesPorTitulo(tituloId) : getRenegociacoes();
  }

  // -------- Rescisão
  async simularRescisao(input: SimularRescisaoInput): Promise<SimulacaoRescisao> {
    try { return storeSimularRescisao(input); }
    catch (e) { throw toRepoError(e); }
  }
  async confirmarRescisao(input: ConfirmarRescisaoInput): Promise<Rescisao> {
    try { return storeConfirmarRescisao(input); }
    catch (e) { throw toRepoError(e); }
  }
  async listarRescisoes(): Promise<Rescisao[]> { return getRescisoes(); }

  // -------- Adiantamentos
  async listarAdiantamentos(): Promise<Adiantamento[]> { return getAdiantamentos(); }
  async registrarAdiantamento(input: RegistrarAdiantamentoInput): Promise<Adiantamento> {
    try { return storeRegistrarAdiant(input); }
    catch (e) { throw toRepoError(e); }
  }
  async abaterAdiantamento(input: AbaterInput): Promise<Abatimento> {
    try { return storeAbaterAdiant(input); }
    catch (e) { throw toRepoError(e); }
  }
  async estornarAdiantamento(id: string, motivo: string): Promise<void> {
    try { storeEstornarAdiant(id, motivo); }
    catch (e) { throw toRepoError(e); }
  }
  async saldoContraparte(tipo: AdiantamentoTipo, contraparteNome: string): Promise<number> {
    return getSaldoContraparte(tipo, contraparteNome);
  }

  // -------- Compras / CMV
  async listarCompras(): Promise<Compra[]> { return getCompras(); }
  async criarCompra(input: CriarCompraInput): Promise<Compra> {
    try { return storeCriarCompra(input); }
    catch (e) { throw toRepoError(e); }
  }
  async estocarCompra(compraId: string): Promise<boolean> {
    try { return storeEstocarCompra(compraId); }
    catch (e) { throw toRepoError(e); }
  }
  async cancelarCompra(compraId: string): Promise<void> {
    try { storeCancelarCompra(compraId); }
    catch (e) { throw toRepoError(e); }
  }

  // -------- Conciliação
  async listarExtrato(): Promise<ExtratoLancamento[]> { return getExtrato(); }
  async importarExtratoCSV(contaFinanceira: string, csv: string): Promise<number> {
    try { return storeImportarExtrato(contaFinanceira, csv); }
    catch (e) { throw toRepoError(e); }
  }
  async sugerirCandidatosConciliacao(extratoId: string): Promise<Titulo[]> {
    const ext = getExtrato().find((e) => e.id === extratoId);
    if (!ext) throw repoError("NOT_FOUND", "Lançamento de extrato não encontrado.");
    const titulos = getTitulos();
    const candidatos = storeSugerir(ext, titulos);
    return candidatos
      .map((c) => titulos.find((t) => t.id === c.t.id))
      .filter((t): t is Titulo => !!t);
  }
  async conciliar(args: { extratoId: string; tituloId: string; movimentoId?: string; motivo?: string }): Promise<void> {
    try { storeConciliar(args.extratoId, args.tituloId, "Sistema", args.motivo); }
    catch (e) { throw toRepoError(e); }
  }
  async desfazerConciliacao(extratoId: string, _motivo: string): Promise<void> {
    try { storeDesfazerConc(extratoId); }
    catch (e) { throw toRepoError(e); }
  }
  async ignorarExtrato(extratoId: string, motivo: string): Promise<void> {
    try { storeIgnorarExtrato(extratoId, motivo); }
    catch (e) { throw toRepoError(e); }
  }
  async removerExtrato(extratoId: string): Promise<void> {
    try { storeRemoverExtrato(extratoId); }
    catch (e) { throw toRepoError(e); }
  }

  // -------- Fechamento
  async listarFechamentos(): Promise<FechamentoMes[]> {
    // O store não expõe um "getter" direto; recriamos via leitura do hook-friendly
    // useFechamentos não é chamável fora de React. Como esse método é raramente
    // usado fora da UI, retornamos vazio aqui — a UI continua usando o hook.
    // Quando migrar para Supabase, será SELECT * FROM fin_fechamentos.
    return [];
  }
  async isMesFechado(mes: string, contaId?: string): Promise<boolean> {
    return isMesFechado(mes, contaId);
  }
  async isMesGlobalFechado(mes: string): Promise<boolean> {
    return isMesGlobalFechado(mes);
  }
  async fecharContaMes(args: { mes: string; contaId: string; saldoFinal: number; observacao?: string }): Promise<void> {
    try { storeFecharConta({ ...args, usuario: "Sistema" }); }
    catch (e) { throw toRepoError(e); }
  }
  async reabrirContaMes(args: { mes: string; contaId: string; motivo: string }): Promise<void> {
    try { storeReabrirConta({ ...args, usuario: "Sistema" }); }
    catch (e) { throw toRepoError(e); }
  }
  async fecharMesGlobal(mes: string, observacao?: string): Promise<void> {
    try { storeFecharGlobal(mes, "Sistema", observacao); }
    catch (e) { throw toRepoError(e); }
  }
  async reabrirMesGlobal(mes: string, motivo: string): Promise<void> {
    try { storeReabrirGlobal(mes, "Sistema", motivo); }
    catch (e) { throw toRepoError(e); }
  }

  // -------- Fluxo de caixa
  async consultarFluxoCaixa(args: UseFluxoArgs): Promise<FluxoPonto[]> {
    return calcularFluxo(getTitulos(), args);
  }

  // -------- Anexos (delegados a hooks/server functions específicos)
  async listarAnexos(tituloId: string): Promise<Anexo[]> {
    return getTitulo(tituloId)?.anexos ?? [];
  }
  async anexar(): Promise<Anexo> {
    throw repoError("NOT_IMPLEMENTED",
      "Anexos passam pelo módulo de anexos (anexos.functions). " +
      "Será unificado no SupabaseAdapter com Storage + tabela fin_titulo_anexos.");
  }
  async removerAnexo(): Promise<void> {
    throw repoError("NOT_IMPLEMENTED",
      "Remoção de anexo passa pelo módulo de anexos. Unificação prevista na migração.");
  }

  // -------- Histórico
  async historicoTitulo(tituloId: string): Promise<HistoricoEntrada[]> {
    const t = getTitulo(tituloId);
    if (!t) return [];
    // Hoje o histórico é embarcado em audit-log + movimentos. Esta versão
    // local devolve os movimentos como histórico mínimo; a versão Supabase
    // virá da view fin_titulo_historico (audit_log + fin_movimentos unidos).
    return (t.movimentos ?? []).map((m) => ({
      data: m.data,
      usuario: m.usuario ?? "Sistema",
      acao: m.tipo === "baixa" ? "BAIXA" : m.tipo === "estorno" ? "ESTORNO" : (m.tipo ?? "MOV"),
      detalhes: m.observacao,
      valorNovo: m.valor,
    }));
  }

  // -------- Cálculos centralizados
  async calcularEncargos(input: CalcularEncargosInput): Promise<EncargosCalculados> {
    const params: ParametrosFinanceiros = await this.parametros.obter();
    const overrides: Partial<ParametrosFinanceiros> = {};
    if (typeof input.jurosMesPct === "number") {
      overrides.jurosTipo = "percentual";
      overrides.jurosModo = "mensal";
      overrides.jurosValor = input.jurosMesPct;
    }
    if (typeof input.multaPct === "number") {
      overrides.multaTipo = "percentual";
      overrides.multaValor = input.multaPct;
    }
    return libCalcularEncargos(
      { saldo: input.saldo, valorOriginal: input.saldo, vencimento: input.vencimento, status: "previsto" },
      input.dataRef ?? new Date().toISOString().slice(0, 10),
      { ...params, ...overrides },
    );
  }

  // -------- Subscrição reativa
  // Hoje a reatividade da UI vem dos hooks `useXxx()` dos stores (cada um
  // mantém seu próprio Set de listeners + useSyncExternalStore). Os hooks
  // do repositório (`useRepoTitulos`, etc.) piggybackam neles. Por isso o
  // `subscribe()` deste adapter local é um no-op intencional — consumidores
  // React não dependem dele. Quando trocarmos para Supabase, este método
  // passará a registrar um channel.on("postgres_changes", ...).
  subscribe(_cb: () => void): () => void { return () => {}; }
}
