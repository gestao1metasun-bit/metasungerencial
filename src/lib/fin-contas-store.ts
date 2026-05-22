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

const KEY = "ms.fin.contas.v1";
const SEED: ContaFinanceira[] = [
  { id: "CF-001", nome: "Banco do Brasil — CC", tipo: "Banco", banco: "BB", agencia: "1234", conta: "56789-0", saldoInicial: 0, ativo: true },
  { id: "CF-002", nome: "Caixa Interno", tipo: "Caixa", saldoInicial: 0, ativo: true },
];

type L = () => void;
const listeners = new Set<L>();
let cache: ContaFinanceira[] | null = null;

function read(): ContaFinanceira[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = SEED; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : SEED;
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
