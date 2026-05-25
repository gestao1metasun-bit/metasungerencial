// ============================================================================
// FinanceiroRepository — INTERFACE de persistência do módulo Financeiro.
//
// Onda 1 (fundação): contrato expandido cobrindo TODAS as operações
// financeiras do ERP. Adapter local hoje delega aos stores localStorage;
// o adapter Supabase será preenchido na fase de migração real.
//
// Regras arquiteturais:
//   - Telas NÃO devem mais importar stores diretamente. Toda leitura/escrita
//     financeira passa por aqui (ou pelos hooks `useRepoXxx`).
//   - Toda operação assume contexto autenticado (userId/roles do server).
//   - Auditoria, bloqueio de período, validações e regras de cálculo são
//     responsabilidade do repositório (ou de um service intermediário),
//     nunca da UI.
//   - Mutações cross-store (renegociação, rescisão, compras → títulos)
//     são expostas como UM método único, preparando RPC atômica futura.
//   - Métodos retornam DTOs simples — nunca instâncias com métodos.
//   - Erros conhecidos viram exceções tipadas (`RepoError.code`).
// ============================================================================
import type {
  Titulo, TituloTipo, TituloStatus, Movimento, Rateio, Anexo,
  BaixaInput as StoreBaixaInput,
  CriarTituloInput as StoreCriarTituloInput,
} from "@/lib/fin-titulos-store";
import type {
  Renegociacao, RenegociarInput, SimulacaoRenegociacao,
} from "@/lib/fin-renegociacao-store";
import type {
  Rescisao, SimularInput as SimularRescisaoInput,
  ConfirmarRescisaoInput, SimulacaoRescisao,
} from "@/lib/fin-rescisao-store";
import type {
  Adiantamento, AdiantamentoTipo, Abatimento,
  RegistrarAdiantamentoInput, AbaterInput,
} from "@/lib/fin-adiantamentos-store";
import type {
  Compra, CriarCompraInput,
} from "@/lib/fin-compras-store";
import type {
  ExtratoLancamento, ExtratoStatus,
} from "@/lib/fin-conciliacao-store";
import type {
  FechamentoMes,
} from "@/lib/fin-fechamento-store";
import type { FluxoPonto, UseFluxoArgs } from "@/lib/fin-fluxo-caixa";
import type { Fornecedor } from "@/lib/fin-fornecedores-store";
import type { ContaFinanceira } from "@/lib/fin-contas-store";
import type { NaturezaFin } from "@/lib/fin-naturezas-store";
import type { GrupoFinanceiro, SubgrupoFinanceiro } from "@/lib/fin-grupos-store";
import type { CentroCustoFin } from "@/lib/fin-centros-custo-store";
import type { MeioPagamento } from "@/lib/fin-meios-pagamento-store";
import type { TipoAplicacao } from "@/lib/fin-tipos-aplicacao-store";
import type { ParametrosFinanceiros } from "@/lib/fin-parametros-financeiros-store";
import type { EncargosCalculados } from "@/lib/fin-calculo-encargos";

// Re-exports para que as telas importem tipos a partir do repositório,
// nunca diretamente dos stores.
export type {
  Titulo, TituloTipo, TituloStatus, Movimento, Rateio, Anexo,
  Renegociacao, RenegociarInput, SimulacaoRenegociacao,
  Rescisao, SimularRescisaoInput, ConfirmarRescisaoInput, SimulacaoRescisao,
  Adiantamento, AdiantamentoTipo, Abatimento,
  RegistrarAdiantamentoInput, AbaterInput,
  Compra, CriarCompraInput,
  ExtratoLancamento, ExtratoStatus,
  FechamentoMes,
  FluxoPonto, UseFluxoArgs,
  Fornecedor, ContaFinanceira, NaturezaFin,
  GrupoFinanceiro, SubgrupoFinanceiro,
  CentroCustoFin, MeioPagamento, TipoAplicacao,
  ParametrosFinanceiros, EncargosCalculados,
};

// ---------------------------------------------------------------- DTOs / Inputs
export type CriarTituloInput = StoreCriarTituloInput;
export type BaixaInput = StoreBaixaInput & { tituloId: string };

export type FiltroTitulos = {
  tipo?: TituloTipo;
  status?: TituloStatus[];
  contratoId?: string;
  obraId?: string;
  fornecedor?: string;
  cliente?: string;
  competencia?: string;       // YYYY-MM
  vencimentoDe?: string;      // YYYY-MM-DD
  vencimentoAte?: string;     // YYYY-MM-DD
  /** Quando true, usa vencimentoReal em vez de vencimento nominal. */
  usarVencimentoReal?: boolean;
};

export type HistoricoEntrada = {
  data: string;
  usuario: string;
  acao: string;
  detalhes?: string;
  valorAnterior?: unknown;
  valorNovo?: unknown;
};

export type CalcularEncargosInput = {
  saldo: number;
  vencimento: string;
  dataRef?: string;
  jurosMesPct?: number;
  multaPct?: number;
};

export type ChequeInput = {
  numero: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  bom_para?: string;
  titular?: string;
};

export type ImportPrevisaoLanc = {
  id: string;
  data: string;
  descricao: string;
  tipo: "Entrada" | "Saída";
  valor: number;
  camada: string;
  natureza: string;
  centroCusto: string;
  obra?: string;
  contrato?: string;
  cliente?: string;
  formaPagamento?: string;
  parcelaLabel?: string;
  competencia?: string;
};

export type AnexoInput = Partial<Anexo> & Pick<Anexo, "nome" | "mime" | "tamanho">;

export type CandidatoConciliacao = {
  titulo: Titulo;
  dif: number;
  exato: boolean;
  score: number;
};

export type CopiaTituloOverrides = Partial<
  Pick<Titulo, "vencimento" | "competencia" | "valorOriginal" | "descricao">
>;

export type RepoErrorCode =
  | "PERIOD_LOCKED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DUPLICATE"
  | "VALIDATION"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export type RepoError = Error & { code: RepoErrorCode };

// ---------------------------------------------------------------- sub-contratos
export interface CadastrosRepository {
  fornecedores: {
    listar(): Promise<Fornecedor[]>;
    upsert(f: Fornecedor): Promise<void>;
    remover(id: string): Promise<void>;
    novoId(): string;
  };
  contas: {
    listar(): Promise<ContaFinanceira[]>;
    upsert(c: ContaFinanceira): Promise<void>;
    remover(id: string): Promise<void>;
    novoId(): string;
  };
  naturezas: {
    listar(): Promise<NaturezaFin[]>;
    upsert(n: NaturezaFin): Promise<void>;
    remover(id: string): Promise<void>;
    novoId(): string;
  };
  grupos: {
    listar(): Promise<GrupoFinanceiro[]>;
    listarSubgrupos(): Promise<SubgrupoFinanceiro[]>;
    upsertGrupo(g: GrupoFinanceiro): Promise<void>;
    removerGrupo(id: string): Promise<void>;
    upsertSubgrupo(s: SubgrupoFinanceiro): Promise<void>;
    removerSubgrupo(id: string): Promise<void>;
    novoIdGrupo(): string;
    novoIdSubgrupo(): string;
  };
  centrosCusto: {
    listar(): Promise<CentroCustoFin[]>;
    upsert(c: CentroCustoFin): Promise<void>;
    remover(id: string): Promise<void>;
    novoId(): string;
  };
  meiosPagamento: {
    listar(): Promise<MeioPagamento[]>;
    upsert(m: MeioPagamento): Promise<void>;
    remover(id: string): Promise<void>;
    novoId(): string;
  };
  tiposAplicacao: {
    listar(): Promise<TipoAplicacao[]>;
    upsert(t: TipoAplicacao): Promise<void>;
    remover(id: string): Promise<void>;
    novoId(): string;
  };
}

export interface ParametrosRepository {
  obter(): Promise<ParametrosFinanceiros>;
  salvar(patch: Partial<ParametrosFinanceiros>, motivo?: string): Promise<void>;
}

// ============================================================================ raiz
export interface FinanceiroRepository {
  // ---------- Títulos
  listarTitulos(filtro?: FiltroTitulos): Promise<Titulo[]>;
  obterTitulo(id: string): Promise<Titulo | null>;
  criarTitulo(input: CriarTituloInput): Promise<Titulo>;
  atualizarTitulo(id: string, patch: Partial<Titulo>, motivo: string): Promise<Titulo>;
  cancelarTitulo(id: string, motivo: string): Promise<void>;
  detectarDuplicidade(input: Partial<Titulo>): Promise<Titulo[]>;
  gerarCopiaTitulo(
    tituloId: string,
    overrides?: CopiaTituloOverrides,
    motivo?: string,
  ): Promise<Titulo>;
  cadastrarCheque(tituloId: string, cheque: ChequeInput): Promise<void>;
  importarPrevisoesDoLegado(lancs: ImportPrevisaoLanc[]): Promise<number>;

  // ---------- Baixas
  registrarBaixa(input: BaixaInput): Promise<Movimento>;
  estornarBaixa(tituloId: string, movimentoId: string, motivo: string): Promise<void>;


  // ---------- Rateios
  setRateios(tituloId: string, rateios: Rateio[], motivo?: string): Promise<void>;
  apagarRateios(tituloId: string, motivo?: string): Promise<void>;

  // ---------- Renegociação / Parcelamento
  simularRenegociacao(input: {
    tituloId: string;
    dataRef?: string;
    parcelar: boolean;
    numeroParcelas: number;
    primeiroVencimento: string;
    intervaloDias: number;
    desconto?: number;
    descontoPct?: number;
    jurosAplicado?: number;
    multaAplicada?: number;
  }): Promise<SimulacaoRenegociacao>;
  confirmarRenegociacao(input: RenegociarInput): Promise<Renegociacao>;
  listarRenegociacoes(tituloId?: string): Promise<Renegociacao[]>;

  // ---------- Rescisão
  simularRescisao(input: SimularRescisaoInput): Promise<SimulacaoRescisao>;
  confirmarRescisao(input: ConfirmarRescisaoInput): Promise<Rescisao>;
  listarRescisoes(): Promise<Rescisao[]>;

  // ---------- Adiantamentos
  listarAdiantamentos(): Promise<Adiantamento[]>;
  registrarAdiantamento(input: RegistrarAdiantamentoInput): Promise<Adiantamento>;
  abaterAdiantamento(input: AbaterInput): Promise<Abatimento>;
  estornarAdiantamento(id: string, motivo: string): Promise<void>;
  saldoContraparte(tipo: AdiantamentoTipo, contraparteNome: string): Promise<number>;

  // ---------- Compras / CMV
  listarCompras(): Promise<Compra[]>;
  criarCompra(input: CriarCompraInput): Promise<Compra>;
  estocarCompra(compraId: string): Promise<boolean>;
  cancelarCompra(compraId: string): Promise<void>;

  // ---------- Conciliação
  listarExtrato(): Promise<ExtratoLancamento[]>;
  adicionarLancamentoExtrato(input: Omit<ExtratoLancamento, "id" | "status" | "importadoEm">): Promise<ExtratoLancamento>;
  importarExtratoCSV(contaFinanceira: string, csv: string): Promise<number>;
  sugerirCandidatosConciliacao(extratoId: string): Promise<Titulo[]>;
  conciliar(args: { extratoId: string; tituloId: string; movimentoId?: string; motivo?: string }): Promise<void>;
  desfazerConciliacao(extratoId: string, motivo: string): Promise<void>;
  ignorarExtrato(extratoId: string, motivo: string): Promise<void>;
  removerExtrato(extratoId: string): Promise<void>;

  // ---------- Fechamento de período
  listarFechamentos(): Promise<FechamentoMes[]>;
  isMesFechado(mes: string, contaId?: string): Promise<boolean>;
  isMesGlobalFechado(mes: string): Promise<boolean>;
  fecharContaMes(args: { mes: string; contaId: string; saldoFinal: number; observacao?: string }): Promise<void>;
  reabrirContaMes(args: { mes: string; contaId: string; motivo: string }): Promise<void>;
  fecharMesGlobal(mes: string, observacao?: string): Promise<void>;
  reabrirMesGlobal(mes: string, motivo: string): Promise<void>;

  // ---------- Fluxo de Caixa
  consultarFluxoCaixa(args: UseFluxoArgs): Promise<FluxoPonto[]>;

  // ---------- Anexos
  listarAnexos(tituloId: string): Promise<Anexo[]>;
  anexar(tituloId: string, anexo: AnexoInput): Promise<Anexo>;
  removerAnexo(tituloId: string, anexoId: string, motivo: string): Promise<void>;

  // ---------- Histórico / Auditoria
  historicoTitulo(tituloId: string): Promise<HistoricoEntrada[]>;

  // ---------- Cálculos centralizados (regras de negócio)
  calcularEncargos(input: CalcularEncargosInput): Promise<EncargosCalculados>;

  // ---------- Cadastros auxiliares & parâmetros
  readonly cadastros: CadastrosRepository;
  readonly parametros: ParametrosRepository;

  // ---------- Subscrição reativa (listener interno hoje; Realtime futuro)
  subscribe(cb: () => void): () => void;
  subscribeRenegociacoes?(cb: () => void): () => void;
  subscribeRescisoes?(cb: () => void): () => void;
  subscribeAdiantamentos?(cb: () => void): () => void;
  subscribeCompras?(cb: () => void): () => void;
  subscribeExtrato?(cb: () => void): () => void;
  subscribeFechamentos?(cb: () => void): () => void;
}

/** Helper para criar erros tipados de repositório. */
export function repoError(code: RepoErrorCode, message: string): RepoError {
  const e = new Error(message) as RepoError;
  e.code = code;
  return e;
}

/** Normaliza um erro qualquer em RepoError, mapeando mensagens conhecidas. */
export function toRepoError(e: unknown): RepoError {
  if (e && typeof e === "object" && "code" in e && (e as RepoError).code) {
    return e as RepoError;
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/fechamento|período fechado|mes fechado/i.test(msg)) return repoError("PERIOD_LOCKED", msg);
  if (/duplic/i.test(msg)) return repoError("DUPLICATE", msg);
  if (/n[aã]o encontrad/i.test(msg)) return repoError("NOT_FOUND", msg);
  if (/permiss|forbidden|n[aã]o autorizado/i.test(msg)) return repoError("FORBIDDEN", msg);
  return repoError("VALIDATION", msg);
}
