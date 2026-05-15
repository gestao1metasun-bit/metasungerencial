// ============================================================================
// Histórico/auditoria universal — todas as ações sensíveis (criação, troca de
// consultor, alteração de origem, geração/aprovação de proposta, geração de
// contrato, anexo, envio para engenharia, cancelamento, reabertura, etc.)
// devem registrar via pushAudit().
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";

export type AuditEntidade = "lead" | "proposta" | "contrato" | "obra";

export type AuditEntry = {
  id: string;
  entidade: AuditEntidade;
  entidadeId: string;
  acao: string;            // ex.: "CRIACAO", "TROCA_CONSULTOR", "STATUS"
  data: string;            // ISO
  usuario?: string;        // email/nome
  campo?: string;
  valorAnterior?: string;
  valorNovo?: string;
  motivo?: string;
  detalhe?: string;
};

const KEY = "ms.audit.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: AuditEntry[] | null = null;

function read(): AuditEntry[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw) as AuditEntry[]; return cache!; }
  } catch {}
  cache = [];
  return cache;
}

function write(next: AuditEntry[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return read(); }
function getServerSnapshot(): AuditEntry[] { return []; }

export function useAudit(): AuditEntry[] {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { read(); }, []);
  return list;
}

export function pushAudit(entry: Omit<AuditEntry, "id" | "data"> & { data?: string }) {
  const e: AuditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    data: entry.data ?? new Date().toISOString(),
    ...entry,
  };
  write([e, ...read()]);
  return e;
}

export function getHistorico(entidade: AuditEntidade, entidadeId: string): AuditEntry[] {
  return read().filter((x) => x.entidade === entidade && x.entidadeId === entidadeId);
}

export function useHistorico(entidade: AuditEntidade, entidadeId: string): AuditEntry[] {
  const all = useAudit();
  return all.filter((x) => x.entidade === entidade && x.entidadeId === entidadeId);
}
