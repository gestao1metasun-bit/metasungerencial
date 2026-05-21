// Store reativo de Usuários do sistema.
import { useEffect, useSyncExternalStore } from "react";
import { usuarios as usuariosSeed } from "./mock-data";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string; // "Ativo" | "Inativo"
};

const KEY = "ms.usuarios.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Usuario[] | null = null;

function read(): Usuario[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = usuariosSeed.map((u) => ({ ...u })); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch {}
  cache = usuariosSeed.map((u) => ({ ...u }));
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  return cache;
}

function write(next: Usuario[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
function getServerSnapshot() { return usuariosSeed.map((u) => ({ ...u })); }

export function useUsuarios(): Usuario[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

export function setUsuarios(next: Usuario[]) { write(next); }

export function upsertUsuario(u: Usuario) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === u.id);
  if (idx >= 0) { const next = [...cur]; next[idx] = u; write(next); }
  else write([...cur, u]);
}

export function removeUsuario(id: string) {
  write(read().filter((x) => x.id !== id));
}
