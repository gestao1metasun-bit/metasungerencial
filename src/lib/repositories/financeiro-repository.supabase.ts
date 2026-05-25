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
//   - Auditoria via trigger `tg_audit_row` (já existente em outras tabelas).
//   - Realtime via supabase.channel("fin_titulos") em `subscribe()`.
// ============================================================================
import type {
  FinanceiroRepository, FiltroTitulos, BaixaInput, CriarTituloInput,
  Titulo, Movimento, Anexo,
} from "./financeiro-repository";
import { repoError } from "./financeiro-repository";

const NOT_READY = () => {
  throw repoError(
    "UNKNOWN",
    "SupabaseFinanceiroAdapter ainda não foi implementado. " +
    "Ative apenas após criar as tabelas fin_* e as server functions correspondentes. " +
    "Ver docs/ARQUITETURA_FINANCEIRO.md.",
  );
};

export class SupabaseFinanceiroAdapter implements FinanceiroRepository {
  async listarTitulos(_filtro?: FiltroTitulos): Promise<Titulo[]> { return NOT_READY(); }
  async obterTitulo(_id: string): Promise<Titulo | null> { return NOT_READY(); }
  async criarTitulo(_input: CriarTituloInput): Promise<Titulo> { return NOT_READY(); }
  async atualizarTitulo(_id: string, _patch: Partial<Titulo>, _motivo: string): Promise<Titulo> { return NOT_READY(); }
  async cancelarTitulo(_id: string, _motivo: string): Promise<void> { return NOT_READY(); }
  async registrarBaixa(_input: BaixaInput): Promise<Movimento> { return NOT_READY(); }
  async estornarBaixa(_tituloId: string, _movimentoId: string, _motivo: string): Promise<void> { return NOT_READY(); }
  async listarAnexos(_tituloId: string): Promise<Anexo[]> { return NOT_READY(); }
  async anexar(_tituloId: string, _anexo: Omit<Anexo, "id" | "enviadoEm">): Promise<Anexo> { return NOT_READY(); }
  async removerAnexo(_tituloId: string, _anexoId: string, _motivo: string): Promise<void> { return NOT_READY(); }
}
