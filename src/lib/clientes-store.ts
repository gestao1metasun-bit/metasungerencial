import { useEffect, useState } from "react";
import { clientes as clientesSeed } from "./mock-data";

export type ClienteSimples = { id: string; nome: string };

const KEY = "ms.clientes.extra.v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function read(): ClienteSimples[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(v: ClienteSimples[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(v));
  listeners.forEach((l) => l());
}

export function addCliente(nome: string): ClienteSimples {
  const novo: ClienteSimples = { id: `CLI-X-${Date.now()}`, nome: nome.trim() };
  write([novo, ...read()]);
  return novo;
}

/** Lista combinada: seed + extras cadastrados manualmente. */
export function useClientesAll(): ClienteSimples[] {
  const [extra, setExtra] = useState<ClienteSimples[]>([]);
  useEffect(() => {
    setExtra(read());
    const fn = () => setExtra(read());
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
  }, []);
  const seed = clientesSeed.map((c) => ({ id: c.id, nome: c.nome }));
  return [...extra, ...seed];
}
