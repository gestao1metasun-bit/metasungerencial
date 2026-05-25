// Cadastro de contas financeiras (banco / caixa).
import { useEffect, useSyncExternalStore } from "react";

export type ContaFinanceira = {
  id: string;
  nome: string;
  tipo: "Banco" | "Caixa" | "PIX" | "Cartão";
  banco?: string;
  agencia?: string;
  conta?: string;
  saldoInicial: number;
  ativo: boolean;
};

const KEY = "ms.fin.contas.v2";
const LEGACY_KEY = "ms.fin.contas.v1";
const SEED: ContaFinanceira[] = [
  { id: "CF-001", nome: "Sicredi",        tipo: "Banco",  banco: "Sicredi",         saldoInicial: 0, ativo: true },
  { id: "CF-002", nome: "Basa",           tipo: "Banco",  banco: "BASA",            saldoInicial: 0, ativo: true },
  { id: "CF-003", nome: "Banco do Brasil",tipo: "Banco",  banco: "BB",              saldoInicial: 0, ativo: true },
  { id: "CF-004", nome: "Nubank PJ",      tipo: "Banco",  banco: "Nubank",          saldoInicial: 0, ativo: true },
  { id: "CF-005", nome: "Caixa interno",  tipo: "Caixa",                            saldoInicial: 0, ativo: true },
  { id: "CF-006", nome: "Cartão Itaú",    tipo: "Cartão", banco: "Itaú",            saldoInicial: 0, ativo: true },
  { id: "CF-007", nome: "Cartão Sicredi", tipo: "Cartão", banco: "Sicredi",         saldoInicial: 0, ativo: true },
];

type L = () => void;
const listeners = new Set<L>();
let cache: ContaFinanceira[] | null = null;

function read(): ContaFinanceira[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = SEED; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
    // migra v1 → mantém contas customizadas + injeta novas
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old: ContaFinanceira[] = JSON.parse(legacy);
      const ids = new Set(old.map((x) => x.id));
      const merged = [...old, ...SEED.filter((s) => !ids.has(s.id))];
      cache = merged;
    } else {
      cache = SEED;
    }
  } catch { cache = SEED; }
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(cache));
  return cache!;
}
function write(next: ContaFinanceira[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useContasFinanceiras(): ContaFinanceira[] {
  const list = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, read, () => SEED);
  useEffect(() => { read(); }, []);
  return list;
}
export function upsertConta(c: ContaFinanceira) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === c.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = c; write(arr); }
  else write([...cur, c]);
}
export function removeConta(id: string) { write(read().filter((x) => x.id !== id)); }
export function newContaId() { return `CF-${String(read().length + 1).padStart(3, "0")}`; }
export function getContasFinanceiras(): ContaFinanceira[] { return read(); }
