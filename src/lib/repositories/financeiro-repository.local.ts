// ============================================================================
// LocalStorageFinanceiroAdapter — implementação PROVISÓRIA do
// FinanceiroRepository usando os stores localStorage atuais.
//
// ATENÇÃO: localStorage é tratado como camada temporária de protótipo.
// NÃO é fonte de verdade para uso operacional real. Para homologação, a
// fábrica em `./index.ts` deve passar a retornar SupabaseFinanceiroAdapter.
// ============================================================================
import {
  getTitulos, getTitulo,
  criarTitulo as storeCriar,
  atualizarTitulo as storeAtualizar,
  cancelarTitulo as storeCancelar,
  registrarBaixa as storeBaixa,
  estornarMovimento as storeEstorno,
} from "@/lib/fin-titulos-store";
import type {
  FinanceiroRepository, FiltroTitulos, BaixaInput, CriarTituloInput,
  Titulo, Movimento, Anexo,
} from "./financeiro-repository";
import { repoError } from "./financeiro-repository";

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

export class LocalStorageFinanceiroAdapter implements FinanceiroRepository {
  async listarTitulos(filtro?: FiltroTitulos): Promise<Titulo[]> {
    return aplicarFiltro(getTitulos(), filtro);
  }

  async obterTitulo(id: string): Promise<Titulo | null> {
    return getTitulo(id) ?? null;
  }

  async criarTitulo(input: CriarTituloInput): Promise<Titulo> {
    try {
      return storeCriar(input as Parameters<typeof storeCriar>[0]);
    } catch (e) {
      throw repoError("VALIDATION", (e as Error).message);
    }
  }

  async atualizarTitulo(id: string, patch: Partial<Titulo>, motivo: string): Promise<Titulo> {
    try {
      const r = storeAtualizar(id, patch, motivo);
      if (!r) throw repoError("NOT_FOUND", "Título não encontrado.");
      return r;
    } catch (e) {
      const err = e as Error;
      if (/fechamento/i.test(err.message)) throw repoError("PERIOD_LOCKED", err.message);
      throw repoError("VALIDATION", err.message);
    }
  }

  async cancelarTitulo(id: string, motivo: string): Promise<void> {
    storeCancelar(id, motivo);
  }

  async registrarBaixa(input: BaixaInput): Promise<Movimento> {
    try {
      return storeBaixa(input.tituloId, input);
    } catch (e) {
      const err = e as Error;
      if (/fechamento/i.test(err.message)) throw repoError("PERIOD_LOCKED", err.message);
      throw repoError("VALIDATION", err.message);
    }
  }

  async estornarBaixa(tituloId: string, movimentoId: string, motivo: string): Promise<void> {
    storeEstorno(tituloId, movimentoId, motivo);
  }

  async listarAnexos(tituloId: string): Promise<Anexo[]> {
    return getTitulo(tituloId)?.anexos ?? [];
  }

  async anexar(): Promise<Anexo> {
    throw repoError("VALIDATION", "Anexos locais não suportados nesta camada — use anexos.functions.");
  }

  async removerAnexo(): Promise<void> {
    throw repoError("VALIDATION", "Anexos locais não suportados nesta camada — use anexos.functions.");
  }
}
