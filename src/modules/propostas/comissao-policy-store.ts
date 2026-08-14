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
  /** Parâmetro de referência (R$/kWp) a partir do qual há bônus sobre o excedente. */
  parametroBase: number;
  /** % do valor a maior (acima do parâmetro base) pago ao consultor, além da comissão. */
  bonusExcedentePct: number;
};

const KEY = "ms.fv.comissao_policy.v2";

const DEFAULT: ComissaoPolicy = {
  base: "VALOR_FINAL",
  percentualAcima: 6,
  parametroBase: 2500,
  bonusExcedentePct: 50,
  faixas: [
    { id: "f1", ateParametro: 2100, percentual: 3 },
    { id: "f2", ateParametro: 2300, percentual: 4 },
    { id: "f3", ateParametro: 2440, percentual: 5 },
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

/**
 * Calcula a comissão prevista da proposta.
 *
 * Regra oficial:
 * - percentual da faixa aplicado sobre o valor do sistema NO PARÂMETRO BASE
 *   (parametroBase × potência, padrão R$ 2.500/kWp);
 * - mais `bonusExcedentePct`% (padrão 50%) de tudo que for vendido acima
 *   desse valor base.
 *
 * Ex.: base R$ 10.000 → 6% = R$ 600. Vendido por R$ 12.000 → R$ 600 + R$ 1.000.
 */
export function calcularComissao(
  parametro: number,
  valorFinal: number,
  valorBruto: number,
  pol: ComissaoPolicy = read(),
  potenciaKwp = 0,
): { percentual: number; base: number; valor: number; excedente: number; bonus: number; total: number } {
  const percentual = percentualParaParametro(parametro, pol);
  const referencia = pol.base === "VALOR_BRUTO" ? valorBruto : valorFinal;
  const base = potenciaKwp > 0 ? pol.parametroBase * potenciaKwp : referencia;
  const valor = (base * percentual) / 100;
  const excedente = Math.max(0, referencia - base);
  const bonus = (excedente * pol.bonusExcedentePct) / 100;
  return { percentual, base, valor, excedente, bonus, total: valor + bonus };
}


