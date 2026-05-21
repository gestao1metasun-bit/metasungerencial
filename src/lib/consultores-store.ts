// Store reativo de Consultores de venda.
// Substitui a antiga noção de "Vendedores" — usado em Propostas e Cadastros.
import { useEffect, useSyncExternalStore } from "react";
import { vendedores as vendedoresSeed } from "./mock-data";

export type Consultor = {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  dataCriacao: string;        // ISO date
  dataAtualizacao: string;    // ISO date
};

const KEY = "ms.consultores.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Consultor[] | null = null;

function seed(): Consultor[] {
  const today = new Date().toISOString().slice(0, 10);
  return vendedoresSeed.map((v, i) => ({
    id: v.id ?? `CSL-${i + 1}`,
    nome: (v.nome ?? "").toUpperCase(),
    email: v.email ?? "",
    telefone: "",
    ativo: (v.status ?? "Ativo").toLowerCase() === "ativo",
    dataCriacao: today,
    dataAtualizacao: today,
  }));
}

function read(): Consultor[] {
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

function write(next: Consultor[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT = seed();
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useConsultores(): Consultor[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}
export function useConsultoresAtivos(): Consultor[] {
  return useConsultores().filter((c) => c.ativo);
}

export function upsertConsultor(c: Consultor) {
  const today = new Date().toISOString().slice(0, 10);
  const cur = read();
  const idx = cur.findIndex((x) => x.id === c.id);
  const norm: Consultor = {
    ...c,
    nome: (c.nome ?? "").toUpperCase().trim(),
    dataAtualizacao: today,
    dataCriacao: c.dataCriacao || today,
  };
  if (idx >= 0) { const next = [...cur]; next[idx] = norm; write(next); }
  else write([...cur, norm]);
}

export function removeConsultor(id: string) {
  write(read().filter((x) => x.id !== id));
}

export function novoConsultorVazio(): Consultor {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `CSL-${Date.now()}`,
    nome: "",
    telefone: "",
    email: "",
    ativo: true,
    dataCriacao: today,
    dataAtualizacao: today,
  };
}

/** Máscara BR: (DD) 9 9999-9999 (celular) ou (DD) 9999-9999 (fixo). */
export function formatTelefoneBR(input: string): string {
  const d = (input || "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length === 0) return `(${ddd}) `;
  if (d.length <= 10) {
    // fixo (10 dígitos): (DD) XXXX-XXXX
    if (rest.length <= 4) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  // celular (11 dígitos): (DD) 9 XXXX-XXXX
  const nono = rest.slice(0, 1);
  const meio = rest.slice(1, 5);
  const fim = rest.slice(5, 9);
  if (rest.length <= 1) return `(${ddd}) ${nono}`;
  if (rest.length <= 5) return `(${ddd}) ${nono} ${meio}`;
  return `(${ddd}) ${nono} ${meio}-${fim}`;
}
