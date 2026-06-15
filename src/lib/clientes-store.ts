// ============================================================
// ⚠️ LEGADO — NÃO USAR EM NOVOS FLUXOS.
// Fonte oficial de clientes: `src/lib/repositories/clientes-supabase-repo.ts`
// (public.clientes via Supabase, RLS aplicada).
//
// Este store é mantido APENAS por compatibilidade temporária com fluxos
// ainda não migrados (Leads, Financeiro/TitulosTab/Adiantamentos, Engenharia,
// PropostasPage/PropostaList e write-back de contrato em Comercial).
//
// Roadmap de remoção:
//   C-ENT.2          — Leads → Supabase
//   F-ENT.CLIENTES   — Financeiro (TitulosTab/Adiantamentos) → Supabase
//   E-ENT.CLIENTES   — Engenharia → Supabase
//   C-ENT.2+         — Eliminar write-through e excluir este arquivo
//
// Não importar daqui em código novo. Para auditar uso, busque por
// `CLIENTE_STORE_LEGADO` — toda nova adesão acende alarme nas revisões.
// ============================================================
// Store de clientes — cadastro completo (CRM básico) usado pelo Comercial.
// Persiste em localStorage e une seed do mock-data com cadastros novos.
import { useEffect, useState, useSyncExternalStore } from "react";
import { clientes as clientesSeed } from "./mock-data";

/** Marca técnica para grep — adesão nova ao LS legado deve ser revisada. */
export const CLIENTE_STORE_LEGADO =
  "LEGADO: use clientes-supabase-repo.ts em fluxos novos";

export type ClienteSimples = { id: string; nome: string };

export type ClienteRecord = {
  id: string;
  nome: string;
  doc: string;          // CPF/CNPJ
  telefone: string;
  telefone2?: string;
  email?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cidade: string;
  uf: string;
  status?: string;
  atualizado?: string;
};

const KEY = "ms.clientes.full.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: ClienteRecord[] | null = null;

function seedAll(): ClienteRecord[] {
  return clientesSeed.map((c) => ({
    id: c.id, nome: c.nome, doc: c.doc, telefone: c.telefone,
    cidade: c.cidade, uf: c.uf, status: c.status,
    atualizado: c.atualizado,
  }));
}

function read(): ClienteRecord[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = seedAll(); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch {}
  cache = seedAll();
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  return cache;
}

function write(next: ClienteRecord[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
const SERVER_SNAPSHOT = seedAll();
function getServerSnapshot() { return SERVER_SNAPSHOT; }

export function useClientesFull(): ClienteRecord[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

/** Normaliza CPF/CNPJ removendo pontuação. */
const normDoc = (v: string) => (v ?? "").replace(/\D/g, "");

/** Retorna o cliente existente com o mesmo CPF/CNPJ (não conta o próprio id em edição). */
export function findClienteByDoc(doc: string, ignoreId?: string): ClienteRecord | undefined {
  const d = normDoc(doc);
  if (!d) return undefined;
  return read().find((c) => normDoc(c.doc) === d && c.id !== ignoreId);
}

export class DuplicateClienteError extends Error {
  existing: ClienteRecord;
  constructor(existing: ClienteRecord) {
    super("CPF/CNPJ já cadastrado");
    this.existing = existing;
  }
}

export function addClienteFull(input: Omit<ClienteRecord, "id" | "atualizado"> & { id?: string }): ClienteRecord {
  const id = input.id ?? `CLI-X-${Date.now()}`;
  if (input.doc && normDoc(input.doc).length >= 11) {
    const dup = findClienteByDoc(input.doc, id);
    if (dup) throw new DuplicateClienteError(dup);
  }
  const novo: ClienteRecord = {
    ...input, id,
    nome: input.nome.trim(),
    status: input.status ?? "Ativo",
    atualizado: new Date().toISOString().slice(0, 10),
  };
  write([novo, ...read().filter((c) => c.id !== id)]);
  return novo;
}

export function updateClienteFull(id: string, patch: Partial<ClienteRecord>) {
  const cur = read();
  const idx = cur.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const next = [...cur];
  next[idx] = { ...next[idx], ...patch, atualizado: new Date().toISOString().slice(0, 10) };
  write(next);
}

/* ===== compat com versão antiga ===== */

const OLD_KEY = "ms.clientes.extra.v1";
function readOldExtras(): ClienteSimples[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(OLD_KEY) || "[]"); } catch { return []; }
}

export function addCliente(nome: string): ClienteSimples {
  const novo = addClienteFull({ nome, doc: "", telefone: "", cidade: "", uf: "" });
  return { id: novo.id, nome: novo.nome };
}

export function useClientesAll(): ClienteSimples[] {
  const [extra, setExtra] = useState<ClienteSimples[]>([]);
  useEffect(() => {
    setExtra(readOldExtras());
    const fn = () => setExtra(readOldExtras());
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => { if (e.key === OLD_KEY) fn(); };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
  }, []);
  const full = read().map((c) => ({ id: c.id, nome: c.nome }));
  return [...extra, ...full];
}
