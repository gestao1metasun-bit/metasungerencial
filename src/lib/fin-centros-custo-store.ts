// Centros de custo padronizados — base operacional/gerencial.
import { useEffect, useSyncExternalStore } from "react";

export type CentroCustoFin = {
  id: string;
  codigo: string;
  nome: string;
  tipo: "Administrativo" | "Operacional" | "Comercial" | "Obra";
  ativo: boolean;
};

const KEY = "ms.fin.centros.v2";
const SEED: CentroCustoFin[] = [
  { id: "CC-01", codigo: "01", nome: "Engenharia",       tipo: "Operacional",    ativo: true },
  { id: "CC-02", codigo: "02", nome: "Comercial",        tipo: "Comercial",      ativo: true },
  { id: "CC-03", codigo: "03", nome: "Financeiro",       tipo: "Administrativo", ativo: true },
  { id: "CC-04", codigo: "04", nome: "Estoque",          tipo: "Operacional",    ativo: true },
  { id: "CC-05", codigo: "05", nome: "Administrativo",   tipo: "Administrativo", ativo: true },
  { id: "CC-06", codigo: "06", nome: "Diretoria",        tipo: "Administrativo", ativo: true },
  { id: "CC-07", codigo: "07", nome: "Marketing",        tipo: "Comercial",      ativo: true },
  { id: "CC-08", codigo: "08", nome: "Pós-venda",        tipo: "Operacional",    ativo: true },
];

type L = () => void;
const listeners = new Set<L>();
let cache: CentroCustoFin[] | null = null;

function read(): CentroCustoFin[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = SEED; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : SEED;
  } catch { cache = SEED; }
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(cache));
  return cache!;
}
function write(next: CentroCustoFin[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useCentrosCustoFin(): CentroCustoFin[] {
  const list = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, read, () => SEED);
  useEffect(() => { read(); }, []);
  return list;
}
export function upsertCentroCusto(c: CentroCustoFin) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === c.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = c; write(arr); }
  else write([...cur, c]);
}
export function removeCentroCusto(id: string) { write(read().filter((x) => x.id !== id)); }
export function newCentroCustoId() { return `CC-${String(read().length + 1).padStart(2, "0")}`; }
