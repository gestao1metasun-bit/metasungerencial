// Modelo (template) usado ao gerar/imprimir a proposta.
// Preferência de UI apenas — LS `ui.propostas.modelo.v1`.
import { useEffect, useSyncExternalStore } from "react";

export type ModeloProposta = "META_SUN_2026" | "CLASSICO";

export const MODELOS_PROPOSTA: { id: ModeloProposta; nome: string; descricao: string }[] = [
  { id: "META_SUN_2026", nome: "Meta Sun 2026 (padrão)", descricao: "Layout comercial completo em A4 — capa, projeto, geração, pagamento, garantias e projeção." },
  { id: "CLASSICO", nome: "Clássico simplificado", descricao: "Resumo técnico-comercial em página única." },
];

const KEY = "ui.propostas.modelo.v1";
const DEFAULT: ModeloProposta = "META_SUN_2026";

const listeners = new Set<() => void>();
let cache: ModeloProposta | null = null;

function read(): ModeloProposta {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY) as ModeloProposta | null;
    cache = raw === "CLASSICO" || raw === "META_SUN_2026" ? raw : DEFAULT;
  } catch {
    cache = DEFAULT;
  }
  return cache!;
}

export function getModeloProposta(): ModeloProposta { return read(); }

export function setModeloProposta(m: ModeloProposta) {
  cache = m;
  try { localStorage.setItem(KEY, m); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useModeloProposta(): ModeloProposta {
  const v = useSyncExternalStore(subscribe, () => read(), () => DEFAULT);
  useEffect(() => { read(); }, []);
  return v;
}
