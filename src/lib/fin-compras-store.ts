// ============================================================================
// COMPRAS — Lote de compra de material vinculado a um Título AP (Financeiro).
// Fluxo: Compra (NF/Lote) → Entrada em Estoque (custo médio) → Saída para Obra (CMV).
// ============================================================================
import { useSyncExternalStore } from "react";
import { pushAudit } from "./audit-store";
import { registrarEntradaCompra, type EstoqueItem } from "./estoque-store";

export type ItemCompra = {
  itemId: string;          // referência ao EstoqueItem
  qtd: number;
  custoUnit: number;       // R$ por unidade (líquido)
};

export type Compra = {
  id: string;              // CMP-YYYY-NNN
  numeroNF?: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  tituloId?: string;       // vínculo com Título AP
  data: string;            // ISO date (yyyy-mm-dd)
  itens: ItemCompra[];
  valorTotal: number;
  observacao?: string;
  status: "Aberta" | "Estocada" | "Cancelada";
  criadoEm: string;
  criadoPor?: string;
};

const K = "ms.fin.compras.v1";

function loadJSON<T>(k: string, def: T): T {
  if (typeof window === "undefined") return def;
  try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveJSON(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
}

let state: Compra[] = loadJSON<Compra[]>(K, []);
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function persist() { saveJSON(K, state); }
function setState(next: Compra[]) { state = next; persist(); emit(); }

const SERVER: Compra[] = [];
export function useCompras(): Compra[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state,
    () => SERVER,
  );
}

export function getCompras(): Compra[] { return state; }
export function getComprasPorTitulo(tituloId: string): Compra[] {
  return state.filter((c) => c.tituloId === tituloId);
}

function gerarId(): string {
  const ano = new Date().getFullYear();
  const seqDoAno = state.filter((c) => c.id.startsWith(`CMP-${ano}-`)).length + 1;
  return `CMP-${ano}-${String(seqDoAno).padStart(3, "0")}`;
}

export type CriarCompraInput = Omit<Compra, "id" | "criadoEm" | "status" | "valorTotal"> & {
  status?: Compra["status"];
};

export function criarCompra(input: CriarCompraInput, usuario = "Financeiro"): Compra {
  const valorTotal = input.itens.reduce((s, i) => s + i.qtd * i.custoUnit, 0);
  const c: Compra = {
    ...input,
    id: gerarId(),
    valorTotal,
    status: input.status ?? "Aberta",
    criadoEm: new Date().toISOString(),
    criadoPor: usuario,
  };
  setState([c, ...state]);
  pushAudit({ entidade: "obra", entidadeId: c.id, acao: "compra_criada", usuario, detalhe: `${c.itens.length} item(ns) — ${valorTotal.toFixed(2)}` });
  return c;
}

/** Dá entrada no estoque (custo médio ponderado) e marca a compra como Estocada. */
export function estocarCompra(compraId: string, usuario = "Estoque"): boolean {
  const c = state.find((x) => x.id === compraId);
  if (!c || c.status !== "Aberta") return false;
  registrarEntradaCompra(
    c.id,
    c.itens.map((i) => ({ itemId: i.itemId, qtd: i.qtd, custoUnit: i.custoUnit })),
    usuario,
  );
  setState(state.map((x) => (x.id === compraId ? { ...x, status: "Estocada" } : x)));
  pushAudit({ entidade: "obra", entidadeId: compraId, acao: "compra_estocada", usuario });
  return true;
}

export function cancelarCompra(compraId: string, usuario = "Financeiro") {
  const c = state.find((x) => x.id === compraId);
  if (!c || c.status === "Estocada") return false;
  setState(state.map((x) => (x.id === compraId ? { ...x, status: "Cancelada" } : x)));
  pushAudit({ entidade: "obra", entidadeId: compraId, acao: "compra_cancelada", usuario });
  return true;
}

export function vincularTitulo(compraId: string, tituloId: string | undefined) {
  setState(state.map((x) => (x.id === compraId ? { ...x, tituloId } : x)));
}

/** util para UI */
export function resumoCompra(c: Compra, itens: EstoqueItem[]): string {
  return c.itens
    .map((i) => `${i.qtd}× ${itens.find((x) => x.id === i.itemId)?.nome ?? i.itemId}`)
    .join(", ");
}
