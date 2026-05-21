// Store reativo de Equipes de instalação, persistido em localStorage.
// Compartilhado entre Cadastros e Engenharia.
import { useEffect, useSyncExternalStore } from "react";
import { equipes as equipesSeed } from "./mock-data";

export type Equipe = {
  id: string;
  nome: string;
  lider: string;
  membros: number;
  obrasAtivas: number;
  status: string;
};

const KEY = "ms.equipes.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Equipe[] | null = null;

function seed(): Equipe[] {
  return equipesSeed.map((e) => ({ ...e }));
}

function read(): Equipe[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = seed(); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch {}
  cache = seed();
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  return cache;
}

function write(next: Equipe[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT = seed();
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useEquipes(): Equipe[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

export function setEquipes(next: Equipe[]) { write(next); }

export function upsertEquipe(e: Equipe) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === e.id);
  if (idx >= 0) { const next = [...cur]; next[idx] = e; write(next); }
  else write([...cur, e]);
}

export function removeEquipe(id: string) {
  write(read().filter((x) => x.id !== id));
}
