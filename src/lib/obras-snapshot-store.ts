// Snapshot público de obras (Engenharia) consumível por outros módulos (Estoque).
// A Engenharia chama `setObrasSnapshot(...)` toda vez que sua lista muda.
import { useSyncExternalStore } from "react";

export type ObraSnapshot = {
  id: string;
  contrato: string;
  cliente: string;
  status: string;
  modulos: number;
  potencia: number;
  inversor?: string;
  inv2?: string;
  inv3?: string;
  telhadoTipo?: string;
  equipe?: string;
  tipo?: string;
  finalizacao?: string | null;
};

const KEY = "ms.engenharia.obras.snapshot.v1";

function load(): ObraSnapshot[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

let cache: ObraSnapshot[] = load();
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

export function setObrasSnapshot(list: ObraSnapshot[]) {
  cache = list;
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
  emit();
}

export function getObrasSnapshot(): ObraSnapshot[] { return cache; }

const EMPTY: ObraSnapshot[] = [];
export function useObrasSnapshot(): ObraSnapshot[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => cache,
    () => EMPTY,
  );
}
