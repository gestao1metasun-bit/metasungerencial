// Política de comissionamento por faixa de parâmetro (R$/kWp).
// Regra: "até X R$/kWp paga Y% de comissão".
// Editável em /configuracoes#tab=comissionamento (Admin).
import { useEffect, useSyncExternalStore } from "react";

export type FaixaComissao = {
  id: string;
  /** Limite superior do parâmetro (R$/kWp). Vale para parâmetro <= ateParametro. */
  ateParametro: number;
  /** Percentual de comissão aplicado sobre o valor final. */
  percentual: number;
};

export type ComissaoPolicy = {
  faixas: FaixaComissao[];
  /** Percentual aplicado quando o parâmetro é maior que todas as faixas. */
  percentualAcima: number;
  /** Base de cálculo da comissão. */
  base: "VALOR_FINAL" | "VALOR_BRUTO";
};

const KEY = "ms.fv.comissao_policy.v1";

const DEFAULT: ComissaoPolicy = {
  base: "VALOR_FINAL",
  percentualAcima: 5,
  faixas: [
    { id: "f1", ateParametro: 2200, percentual: 1 },
    { id: "f2", ateParametro: 2500, percentual: 2 },
    { id: "f3", ateParametro: 2800, percentual: 3 },
    { id: "f4", ateParametro: 3200, percentual: 4 },
  ],
};

const listeners = new Set<() => void>();
let cache: ComissaoPolicy | null = null;

function read(): ComissaoPolicy {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = DEFAULT; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = { ...DEFAULT, ...JSON.parse(raw) }; return cache!; }
  } catch { /* noop */ }
  cache = DEFAULT;
  return cache;
}

export function getComissaoPolicy(): ComissaoPolicy { return read(); }

export function setComissaoPolicy(patch: Partial<ComissaoPolicy>) {
  const next = { ...read(), ...patch };
  next.faixas = [...next.faixas].sort((a, b) => a.ateParametro - b.ateParametro);
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useComissaoPolicy(): ComissaoPolicy {
  const v = useSyncExternalStore(subscribe, () => read(), () => DEFAULT);
  useEffect(() => { read(); }, []);
  return v;
}

/** Percentual de comissão para um parâmetro (R$/kWp). */
export function percentualParaParametro(parametro: number, pol: ComissaoPolicy = read()): number {
  const faixas = [...pol.faixas].sort((a, b) => a.ateParametro - b.ateParametro);
  for (const f of faixas) if (parametro <= f.ateParametro) return f.percentual;
  return pol.percentualAcima;
}

/** Calcula a comissão prevista da proposta. */
export function calcularComissao(
  parametro: number,
  valorFinal: number,
  valorBruto: number,
  pol: ComissaoPolicy = read(),
): { percentual: number; base: number; valor: number } {
  const percentual = percentualParaParametro(parametro, pol);
  const base = pol.base === "VALOR_BRUTO" ? valorBruto : valorFinal;
  return { percentual, base, valor: (base * percentual) / 100 };
}
