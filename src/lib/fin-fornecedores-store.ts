// Cadastro simples de fornecedores (localStorage + reativo).
import { useEffect, useSyncExternalStore } from "react";

export type Fornecedor = {
  id: string;
  nome: string;
  documento?: string;
  contato?: string;
  telefone?: string;
  email?: string;
  observacao?: string;
  ativo: boolean;
};

const KEY = "ms.fin.fornecedores.v1";
const SEED: Fornecedor[] = [
  { id: "F-001", nome: "Canadian Solar", documento: "12.345.678/0001-00", ativo: true },
  { id: "F-002", nome: "WEG Inversores",  ativo: true },
  { id: "F-003", nome: "Transportadora Norte", ativo: true },
];

type L = () => void;
const listeners = new Set<L>();
let cache: Fornecedor[] | null = null;

function read(): Fornecedor[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = SEED; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : SEED;
  } catch { cache = SEED; }
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(cache));
  return cache!;
}
function write(next: Fornecedor[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useFornecedores(): Fornecedor[] {
  const list = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, read, () => SEED);
  useEffect(() => { read(); }, []);
  return list;
}

export function upsertFornecedor(f: Fornecedor) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === f.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = f; write(arr); }
  else write([...cur, f]);
}
export function removeFornecedor(id: string) { write(read().filter((x) => x.id !== id)); }
export function newFornecedorId() { return `F-${String(read().length + 1).padStart(3, "0")}`; }
export function getFornecedores(): Fornecedor[] { return read(); }
