// Modelo base de contrato: armazena uma lista de "cláusulas personalizadas"
// (substituir / adicionar / remover) que vale como padrão para TODO novo contrato.
// As edições por contrato continuam isoladas — a base só é COPIADA no momento
// da redação. Quando o usuário altera a base, vale para os próximos contratos.
import { useEffect, useState } from "react";
import type { ContratoFull } from "./contratos-store";

const KEY = "contrato-base-overrides-v1";

export type BaseClausula = NonNullable<ContratoFull["clausulasCustom"]>[number];

function load(): BaseClausula[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

let cache: BaseClausula[] = load();
const subs = new Set<() => void>();
function emit() { subs.forEach((fn) => fn()); }

export function getContratoBase(): BaseClausula[] {
  return cache.map((c) => ({ ...c }));
}

export function setContratoBase(next: BaseClausula[]) {
  cache = next.map((c) => ({ ...c }));
  localStorage.setItem(KEY, JSON.stringify(cache));
  emit();
}

export function useContratoBase(): [BaseClausula[], (n: BaseClausula[]) => void] {
  const [v, setV] = useState<BaseClausula[]>(() => getContratoBase());
  useEffect(() => {
    const fn = () => setV(getContratoBase());
    subs.add(fn);
    return () => { subs.delete(fn); };
  }, []);
  return [v, setContratoBase];
}
