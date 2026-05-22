// ============================================================================
// COMPRAS EM TRÂNSITO — lançamento manual de compras que foram feitas
// mas ainda NÃO deram entrada no estoque. Usado no painel de seleção
// de compra (Estoque → Obras) para abater da necessidade.
// ============================================================================
import { useSyncExternalStore } from "react";

export type CompraTransito = {
  id: string;
  itemId: string;
  qtd: number;
  fornecedor?: string;
  data: string;   // ISO
  obs?: string;
  criadoEm: string;
  criadoPor?: string;
};

const K = "ms.estoque.compras.transito.v1";

function load(): CompraTransito[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(K) || "[]"); } catch { return []; }
}
function save(v: CompraTransito[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(K, JSON.stringify(v)); } catch { /* noop */ }
}

let state: CompraTransito[] = load();
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function setState(v: CompraTransito[]) { state = v; save(v); emit(); }

const EMPTY: CompraTransito[] = [];
export function useComprasTransito(): CompraTransito[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state,
    () => EMPTY,
  );
}

export function addCompraTransito(input: Omit<CompraTransito, "id" | "criadoEm">, usuario = "Estoque"): CompraTransito {
  const c: CompraTransito = {
    ...input,
    id: `TR-${Date.now().toString(36).toUpperCase()}`,
    criadoEm: new Date().toISOString(),
    criadoPor: usuario,
  };
  setState([c, ...state]);
  return c;
}

export function removeCompraTransito(id: string) {
  setState(state.filter((c) => c.id !== id));
}

export function totalTransitoPorItem(itemId: string, list: CompraTransito[] = state): number {
  return list.filter((c) => c.itemId === itemId).reduce((s, c) => s + c.qtd, 0);
}
