// ============================================================================
// FinanceiroRepository — INTERFACE de persistência do módulo Financeiro.
//
// Objetivo arquitetural:
//   As telas (TitulosTab, FluxoCaixa, Renegociação, Fechamento, etc.) NÃO
//   devem mais conhecer "localStorage" nem "supabase". Elas conversam apenas
//   com este contrato. Hoje a implementação ativa é LocalStorageAdapter
//   (provisória, somente para protótipo). Amanhã trocamos a fábrica em
//   `./index.ts` para SupabaseAdapter sem reescrever nenhuma tela.
//
// Regras:
//   - Toda operação assume contexto autenticado (userId + roles vêm do server).
//   - Auditoria é responsabilidade do repositório (não da tela).
//   - Bloqueio de período (mês fechado) é responsabilidade do repositório.
//   - Métodos retornam DTOs simples — nunca instâncias com métodos.
//   - Erros conhecidos viram exceções com `code` (PERIOD_LOCKED, FORBIDDEN,
//     NOT_FOUND, DUPLICATE, VALIDATION).
// ============================================================================
import type {
  Titulo,
  TituloTipo,
  TituloStatus,
  Movimento,
  Rateio,
  Anexo,
} from "@/lib/fin-titulos-store";

export type { Titulo, TituloTipo, TituloStatus, Movimento, Rateio, Anexo };

// ---------------------------------------------------------------- DTOs de input
export type CriarTituloInput = Omit<
  Titulo,
  "id" | "status" | "valorPago" | "saldo" | "movimentos" | "criadoEm"
> & {
  status?: TituloStatus;
};

export type BaixaInput = {
  tituloId: string;
  data: string;            // YYYY-MM-DD
  valor: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  contaFinanceira?: string;
  meioPagamento?: string;
  observacao?: string;
};

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

export type RepoError = Error & {
  code:
    | "PERIOD_LOCKED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "DUPLICATE"
    | "VALIDATION"
    | "UNKNOWN";
};

// ---------------------------------------------------------------- contrato
export interface FinanceiroRepository {
  // — Títulos
  listarTitulos(filtro?: FiltroTitulos): Promise<Titulo[]>;
  obterTitulo(id: string): Promise<Titulo | null>;
  criarTitulo(input: CriarTituloInput): Promise<Titulo>;
  atualizarTitulo(id: string, patch: Partial<Titulo>, motivo: string): Promise<Titulo>;
  cancelarTitulo(id: string, motivo: string): Promise<void>;

  // — Baixas (pagamento/recebimento)
  registrarBaixa(input: BaixaInput): Promise<Movimento>;
  estornarBaixa(tituloId: string, movimentoId: string, motivo: string): Promise<void>;

  // — Anexos
  listarAnexos(tituloId: string): Promise<Anexo[]>;
  anexar(tituloId: string, anexo: Omit<Anexo, "id" | "enviadoEm">): Promise<Anexo>;
  removerAnexo(tituloId: string, anexoId: string, motivo: string): Promise<void>;

  // — Subscrição reativa (opcional). Implementação local usa listener;
  //   implementação Supabase usará Realtime (postgres_changes).
  subscribe?(cb: () => void): () => void;
}

/** Helper para criar erros tipados de repositório. */
export function repoError(code: RepoError["code"], message: string): RepoError {
  const e = new Error(message) as RepoError;
  e.code = code;
  return e;
}
