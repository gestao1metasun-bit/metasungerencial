import { useEffect, useState } from "react";
import { liberarFinanciamentoEngenharia } from "@/lib/contratos-store";

export type FinPendenciaStatus =
  | "Pendente"
  | "Em análise"
  | "Pendente banco"
  | "Pendente cliente"
  | "Aguardando documentação"
  | "Aguardando liberação"
  | "Aprovado"
  | "Liberou Engenharia"
  | "Cancelado";

export type FinPendencia = {
  id: string;            // contrato id (ex.: CT-2026-0001 ou 143/2026)
  cliente: string;
  vendedor: string;
  valor: number;
  valorFinanciado?: number;
  kwp: number;
  dataCadastro: string;
  banco?: string;
  gerente?: string;
  andamento?: string;
  observacao?: string;
  status: FinPendenciaStatus;

  /** Quando true → Engenharia muda projeto de Stand-by para Novo projeto. */
  podeLiberarEngenharia?: boolean;
  liberadoEngEm?: string;
  liberadoEngPor?: string;

  motivoCancelamento?: string;
  canceladoEm?: string;
  canceladoPor?: string;
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
  write([{ ...p, status: p.status || "Pendente" }, ...cur]);
}

export function updatePendencia(id: string, patch: Partial<FinPendencia>) {
  write(read().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function removePendencia(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function getPendenciaByContrato(contratoId: string): FinPendencia | undefined {
  return read().find((p) => p.id === contratoId);
}

/**
 * Marca a pendência como "PODE LIBERAR ENGENHARIA" e dispara a liberação no contrato,
 * que faz a Engenharia promover o projeto de Stand-by para Novo projeto.
 */
export function liberarParaEngenharia(id: string, usuario = "Financiamentos") {
  const cur = read();
  const idx = cur.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const now = new Date().toISOString();
  const next = [...cur];
  next[idx] = {
    ...cur[idx],
    podeLiberarEngenharia: true,
    liberadoEngEm: now,
    liberadoEngPor: usuario,
    status: "Liberou Engenharia",
  };
  write(next);
  liberarFinanciamentoEngenharia(id, usuario);
}

/** Cancela a pendência (não apaga — fica visível na aba Cancelados). */
export function cancelarPendenciaFin(id: string, motivo: string, usuario = "Financiamentos") {
  const cur = read();
  const idx = cur.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const next = [...cur];
  next[idx] = {
    ...cur[idx],
    status: "Cancelado",
    motivoCancelamento: motivo,
    canceladoEm: new Date().toISOString(),
    canceladoPor: usuario,
  };
  write(next);
}

export function reativarPendenciaFin(id: string, usuario = "Financiamentos") {
  const cur = read();
  const idx = cur.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const next = [...cur];
  next[idx] = {
    ...cur[idx],
    status: "Pendente",
    motivoCancelamento: undefined,
    canceladoEm: undefined,
    canceladoPor: usuario,
  };
  write(next);
}

export function useFinPendencias(): [
  FinPendencia[],
  (id: string, patch: Partial<FinPendencia>) => void,
  (id: string) => void,
] {
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
