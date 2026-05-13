import { useEffect, useState } from "react";

export type FinPendencia = {
  id: string;            // contrato id (ex.: 143/2026)
  cliente: string;
  vendedor: string;
  valor: number;
  kwp: number;
  dataCadastro: string;
  banco?: string;        // definido aqui em financiamentos
  status: "Pendente" | "Encaminhado";
};

const KEY = "ms.fin.pendencias.v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function read(): FinPendencia[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(v: FinPendencia[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(v));
  listeners.forEach((l) => l());
}

export function addPendencia(p: FinPendencia) {
  const cur = read();
  if (cur.some((x) => x.id === p.id)) return;
  write([p, ...cur]);
}
export function updatePendencia(id: string, patch: Partial<FinPendencia>) {
  write(read().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}
export function removePendencia(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function useFinPendencias(): [FinPendencia[], (id: string, patch: Partial<FinPendencia>) => void, (id: string) => void] {
  const [state, setState] = useState<FinPendencia[]>([]);
  useEffect(() => {
    setState(read());
    const fn = () => setState(read());
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
  }, []);
  return [state, updatePendencia, removePendencia];
}
