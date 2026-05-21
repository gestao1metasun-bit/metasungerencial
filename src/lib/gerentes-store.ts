// Store reativo de gerentes — compartilhado entre Cadastros e Financiamentos.
import { useEffect, useSyncExternalStore } from "react";
import { gerentes as gerentesSeed } from "./mock-data";

export type Gerente = {
  id: string;
  nome: string;
  banco: string;
  telefone: string;
  operacoes: number;
  status: string; // "Ativo" | "Inativo"
};

const KEY = "ms.gerentes.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Gerente[] | null = null;

function read(): Gerente[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = gerentesSeed.map((g) => ({ ...g })); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch {}
  cache = gerentesSeed.map((g) => ({ ...g }));
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  return cache;
}

function write(next: Gerente[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT = gerentesSeed.map((g) => ({ ...g }));
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useGerentes(): Gerente[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

export function useGerentesAtivos(): Gerente[] {
  return useGerentes().filter((g) => (g.status || "").toLowerCase() === "ativo");
}

export function setGerentes(next: Gerente[]) { write(next); }

export function upsertGerente(g: Gerente) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === g.id);
  if (idx >= 0) {
    const next = [...cur]; next[idx] = g; write(next);
  } else {
    write([...cur, g]);
  }
}

export function removeGerente(id: string) {
  write(read().filter((x) => x.id !== id));
}
