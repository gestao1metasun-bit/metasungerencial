// ============================================================================
// SupabaseFinanceiroAdapter — STUB para migração futura.
//
// Cada método aqui está intencionalmente NÃO implementado. Quando ativarmos
// a fase de homologação real, este arquivo deve ser preenchido chamando
// server functions (createServerFn) que rodam com requireSupabaseAuth e
// conversam com as tabelas `fin_*` (ver docs/ARQUITETURA_FINANCEIRO.md).
//
// REGRAS de implementação futura:
//   - NENHUMA query direta do componente. Sempre via createServerFn.
//   - RLS ativa em todas as tabelas fin_* — middleware do servidor já
//     escopa por usuário/role.
//   - Período fechado deve ser checado por trigger no Postgres (não pelo
//     adapter) — o adapter apenas captura o erro e mapeia para PERIOD_LOCKED.
//   - Auditoria via trigger `tg_audit_row`.
//   - Mutações cross-store (renegociação, rescisão, compras) viram UMA
//     única RPC atômica no Postgres (BEGIN/COMMIT por chamada).
//   - Realtime via supabase.channel("fin_titulos") em `subscribe()`.
// ============================================================================
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
import { repoError } from "./financeiro-repository";

const NOT_READY = (op: string): never => {
  throw repoError(
    "NOT_IMPLEMENTED",
    `SupabaseFinanceiroAdapter.${op} ainda não foi implementado. ` +
    "Ative apenas após criar as tabelas fin_* e as server functions correspondentes. " +
    "Ver docs/ARQUITETURA_FINANCEIRO.md.",
  );
};

const stubCadastro = (nome: string) => ({
  listar: async () => NOT_READY(`cadastros.${nome}.listar`),
  upsert: async () => NOT_READY(`cadastros.${nome}.upsert`),
  remover: async () => NOT_READY(`cadastros.${nome}.remover`),
  novoId: () => { NOT_READY(`cadastros.${nome}.novoId`); return ""; },
});

const cadastrosStub: CadastrosRepository = {
  fornecedores: stubCadastro("fornecedores") as CadastrosRepository["fornecedores"],
  contas: stubCadastro("contas") as CadastrosRepository["contas"],
  naturezas: stubCadastro("naturezas") as CadastrosRepository["naturezas"],
  grupos: {
    listar: async () => NOT_READY("cadastros.grupos.listar"),
    listarSubgrupos: async () => NOT_READY("cadastros.grupos.listarSubgrupos"),
    upsertGrupo: async () => NOT_READY("cadastros.grupos.upsertGrupo"),
    removerGrupo: async () => NOT_READY("cadastros.grupos.removerGrupo"),
    upsertSubgrupo: async () => NOT_READY("cadastros.grupos.upsertSubgrupo"),
    removerSubgrupo: async () => NOT_READY("cadastros.grupos.removerSubgrupo"),
    novoIdGrupo: () => { NOT_READY("cadastros.grupos.novoIdGrupo"); return ""; },
    novoIdSubgrupo: () => { NOT_READY("cadastros.grupos.novoIdSubgrupo"); return ""; },
  },
  centrosCusto: stubCadastro("centrosCusto") as CadastrosRepository["centrosCusto"],
  meiosPagamento: stubCadastro("meiosPagamento") as CadastrosRepository["meiosPagamento"],
  tiposAplicacao: stubCadastro("tiposAplicacao") as CadastrosRepository["tiposAplicacao"],
};

const parametrosStub: ParametrosRepository = {
  obter: async () => NOT_READY("parametros.obter"),
  salvar: async () => NOT_READY("parametros.salvar"),
};

export class SupabaseFinanceiroAdapter implements FinanceiroRepository {
  readonly cadastros = cadastrosStub;
  readonly parametros = parametrosStub;

  // Títulos
  async listarTitulos(_filtro?: FiltroTitulos): Promise<Titulo[]> { return NOT_READY("listarTitulos"); }
  async obterTitulo(_id: string): Promise<Titulo | null> { return NOT_READY("obterTitulo"); }
  async criarTitulo(_input: CriarTituloInput): Promise<Titulo> { return NOT_READY("criarTitulo"); }
  async atualizarTitulo(_id: string, _patch: Partial<Titulo>, _motivo: string): Promise<Titulo> { return NOT_READY("atualizarTitulo"); }
  async cancelarTitulo(_id: string, _motivo: string): Promise<void> { NOT_READY("cancelarTitulo"); }
  async detectarDuplicidade(_input: Partial<Titulo>): Promise<Titulo[]> { return NOT_READY("detectarDuplicidade"); }
  async gerarCopiaTitulo(_id: string, _o?: unknown, _m?: string): Promise<Titulo> { return NOT_READY("gerarCopiaTitulo"); }
  async cadastrarCheque(_id: string, _c: unknown): Promise<void> { NOT_READY("cadastrarCheque"); }
  async importarPrevisoesDoLegado(_l: unknown): Promise<number> { return NOT_READY("importarPrevisoesDoLegado"); }

  // Baixas
  async registrarBaixa(_input: BaixaInput): Promise<Movimento> { return NOT_READY("registrarBaixa"); }
  async estornarBaixa(_t: string, _m: string, _motivo: string): Promise<void> { NOT_READY("estornarBaixa"); }

  // Rateios
  async setRateios(_t: string, _r: Rateio[], _m?: string): Promise<void> { NOT_READY("setRateios"); }
  async apagarRateios(_t: string, _m?: string): Promise<void> { NOT_READY("apagarRateios"); }

  // Renegociação
  async simularRenegociacao(_i: Parameters<FinanceiroRepository["simularRenegociacao"]>[0]): Promise<SimulacaoRenegociacao> { return NOT_READY("simularRenegociacao"); }
  async confirmarRenegociacao(_i: RenegociarInput): Promise<Renegociacao> { return NOT_READY("confirmarRenegociacao"); }
  async listarRenegociacoes(_t?: string): Promise<Renegociacao[]> { return NOT_READY("listarRenegociacoes"); }

  // Rescisão
  async simularRescisao(_i: SimularRescisaoInput): Promise<SimulacaoRescisao> { return NOT_READY("simularRescisao"); }
  async confirmarRescisao(_i: ConfirmarRescisaoInput): Promise<Rescisao> { return NOT_READY("confirmarRescisao"); }
  async listarRescisoes(): Promise<Rescisao[]> { return NOT_READY("listarRescisoes"); }

  // Adiantamentos
  async listarAdiantamentos(): Promise<Adiantamento[]> { return NOT_READY("listarAdiantamentos"); }
  async registrarAdiantamento(_i: RegistrarAdiantamentoInput): Promise<Adiantamento> { return NOT_READY("registrarAdiantamento"); }
  async abaterAdiantamento(_i: AbaterInput): Promise<Abatimento> { return NOT_READY("abaterAdiantamento"); }
  async estornarAdiantamento(_id: string, _m: string): Promise<void> { NOT_READY("estornarAdiantamento"); }
  async saldoContraparte(_t: AdiantamentoTipo, _n: string): Promise<number> { return NOT_READY("saldoContraparte"); }

  // Compras
  async listarCompras(): Promise<Compra[]> { return NOT_READY("listarCompras"); }
  async criarCompra(_i: CriarCompraInput): Promise<Compra> { return NOT_READY("criarCompra"); }
  async estocarCompra(_id: string): Promise<boolean> { return NOT_READY("estocarCompra"); }
  async cancelarCompra(_id: string): Promise<void> { NOT_READY("cancelarCompra"); }

  // Conciliação
  async listarExtrato(): Promise<ExtratoLancamento[]> { return NOT_READY("listarExtrato"); }
  async importarExtratoCSV(_c: string, _csv: string): Promise<number> { return NOT_READY("importarExtratoCSV"); }
  async sugerirCandidatosConciliacao(_e: string): Promise<Titulo[]> { return NOT_READY("sugerirCandidatosConciliacao"); }
  async conciliar(_a: { extratoId: string; tituloId: string; movimentoId?: string; motivo?: string }): Promise<void> { NOT_READY("conciliar"); }
  async desfazerConciliacao(_e: string, _m: string): Promise<void> { NOT_READY("desfazerConciliacao"); }
  async ignorarExtrato(_e: string, _m: string): Promise<void> { NOT_READY("ignorarExtrato"); }
  async removerExtrato(_e: string): Promise<void> { NOT_READY("removerExtrato"); }

  // Fechamento
  async listarFechamentos(): Promise<FechamentoMes[]> { return NOT_READY("listarFechamentos"); }
  async isMesFechado(_m: string, _c?: string): Promise<boolean> { return NOT_READY("isMesFechado"); }
  async isMesGlobalFechado(_m: string): Promise<boolean> { return NOT_READY("isMesGlobalFechado"); }
  async fecharContaMes(_a: { mes: string; contaId: string; saldoFinal: number; observacao?: string }): Promise<void> { NOT_READY("fecharContaMes"); }
  async reabrirContaMes(_a: { mes: string; contaId: string; motivo: string }): Promise<void> { NOT_READY("reabrirContaMes"); }
  async fecharMesGlobal(_m: string, _o?: string): Promise<void> { NOT_READY("fecharMesGlobal"); }
  async reabrirMesGlobal(_m: string, _motivo: string): Promise<void> { NOT_READY("reabrirMesGlobal"); }

  // Fluxo de caixa
  async consultarFluxoCaixa(_a: UseFluxoArgs): Promise<FluxoPonto[]> { return NOT_READY("consultarFluxoCaixa"); }

  // Anexos
  async listarAnexos(_t: string): Promise<Anexo[]> { return NOT_READY("listarAnexos"); }
  async anexar(_t: string, _a: Omit<Anexo, "id" | "enviadoEm">): Promise<Anexo> { return NOT_READY("anexar"); }
  async removerAnexo(_t: string, _a: string, _m: string): Promise<void> { NOT_READY("removerAnexo"); }

  // Histórico
  async historicoTitulo(_t: string): Promise<HistoricoEntrada[]> { return NOT_READY("historicoTitulo"); }

  // Cálculos
  async calcularEncargos(_i: CalcularEncargosInput): Promise<EncargosCalculados> { return NOT_READY("calcularEncargos"); }

  // Subscrição
  subscribe(_cb: () => void): () => void {
    NOT_READY("subscribe");
    return () => {};
  }
}
