// Tipos de aplicação — classifica a finalidade operacional do lançamento/movimento.
// Ex.: separar instalação x manutenção dentro da MESMA obra.
import { useEffect, useSyncExternalStore } from "react";

export type TipoAplicacao = {
  id: string;
  nome: string;
  posVenda: boolean;   // true = conta como pós-venda (manutenção/garantia/retorno)
  ativo: boolean;
};

const KEY = "ms.fin.tipos-aplicacao.v1";
const SEED: TipoAplicacao[] = [
  { id: "TA-01", nome: "Instalação",       posVenda: false, ativo: true },
  { id: "TA-02", nome: "Manutenção",       posVenda: true,  ativo: true },
  { id: "TA-03", nome: "Garantia",         posVenda: true,  ativo: true },
  { id: "TA-04", nome: "Adequação",        posVenda: false, ativo: true },
  { id: "TA-05", nome: "Retorno técnico",  posVenda: true,  ativo: true },
  { id: "TA-06", nome: "Uso interno",      posVenda: false, ativo: true },
  { id: "TA-07", nome: "Administrativo",   posVenda: false, ativo: true },
];

type L = () => void;
const listeners = new Set<L>();
let cache: TipoAplicacao[] | null = null;

function read(): TipoAplicacao[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = SEED; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : SEED;
  } catch { cache = SEED; }
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(cache));
  return cache!;
}
function write(next: TipoAplicacao[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useTiposAplicacao(): TipoAplicacao[] {
  const list = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, read, () => SEED);
  useEffect(() => { read(); }, []);
  return list;
}
export function upsertTipoAplicacao(t: TipoAplicacao) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === t.id);
  if (idx >= 0) { const arr = [...cur]; arr[idx] = t; write(arr); }
  else write([...cur, t]);
}
export function removeTipoAplicacao(id: string) { write(read().filter((x) => x.id !== id)); }
export function newTipoAplicacaoId() { return `TA-${String(read().length + 1).padStart(2, "0")}`; }
export function getTiposAplicacao(): TipoAplicacao[] { return read(); }
