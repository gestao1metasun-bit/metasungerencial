// Store reativo de bancos — cadastro / edição / ativação compartilhados entre módulos.
import { useEffect, useSyncExternalStore } from "react";
import { bancos as bancosSeed } from "./mock-data";

export type Banco = {
  id: string;
  nome: string;
  operacoes: number;
  total: number;
  status: string; // "Ativo" | "Inativo"
};

const KEY = "ms.bancos.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Banco[] | null = null;

function read(): Banco[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = bancosSeed.map((b) => ({ ...b })); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch {}
  cache = bancosSeed.map((b) => ({ ...b }));
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  return cache;
}

function write(next: Banco[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT = bancosSeed.map((b) => ({ ...b }));
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useBancos(): Banco[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

/** Lista somente os bancos ativos (para selects de financiamento). */
export function useBancosAtivos(): Banco[] {
  return useBancos().filter((b) => (b.status || "").toLowerCase() === "ativo");
}

export function setBancos(next: Banco[]) { write(next); }

export function upsertBanco(b: Banco) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === b.id);
  if (idx >= 0) {
    const next = [...cur]; next[idx] = b; write(next);
  } else {
    write([...cur, b]);
  }
}

export function removeBanco(id: string) {
  write(read().filter((x) => x.id !== id));
}

export function toggleBancoAtivo(id: string) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const next = [...cur];
  next[idx] = { ...next[idx], status: next[idx].status === "Ativo" ? "Inativo" : "Ativo" };
  write(next);
}
