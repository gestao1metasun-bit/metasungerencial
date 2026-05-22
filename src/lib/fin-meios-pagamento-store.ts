// Meios de pagamento — usados em lançamentos e títulos.
import { useEffect, useSyncExternalStore } from "react";

export type MeioPagamento = {
  id: string;
  nome: string;
  tipo: "PIX" | "Boleto" | "Cartão crédito" | "Cartão débito" | "Transferência" | "Dinheiro" | "Reembolso";
  ativo: boolean;
};

const KEY = "ms.fin.meios.v1";
const SEED: MeioPagamento[] = [
  { id: "MP-01", nome: "PIX",             tipo: "PIX",             ativo: true },
  { id: "MP-02", nome: "Boleto",          tipo: "Boleto",          ativo: true },
  { id: "MP-03", nome: "Cartão crédito",  tipo: "Cartão crédito",  ativo: true },
  { id: "MP-04", nome: "Cartão débito",   tipo: "Cartão débito",   ativo: true },
  { id: "MP-05", nome: "Transferência",   tipo: "Transferência",   ativo: true },
  { id: "MP-06", nome: "Dinheiro",        tipo: "Dinheiro",        ativo: true },
  { id: "MP-07", nome: "Reembolso",       tipo: "Reembolso",       ativo: true },
];

type L = () => void;
const listeners = new Set<L>();
let cache: MeioPagamento[] | null = null;

function read(): MeioPagamento[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = SEED; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : SEED;
  } catch { cache = SEED; }
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(cache));
  return cache!;
}
function write(next: MeioPagamento[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useMeiosPagamento(): MeioPagamento[] {
  const list = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, read, () => SEED);
  useEffect(() => { read(); }, []);
  return list;
}
export function upsertMeio(m: MeioPagamento) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === m.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = m; write(arr); }
  else write([...cur, m]);
}
export function removeMeio(id: string) { write(read().filter((x) => x.id !== id)); }
export function newMeioId() { return `MP-${String(read().length + 1).padStart(2, "0")}`; }
