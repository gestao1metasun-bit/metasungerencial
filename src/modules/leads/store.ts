// ============================================================================
// Store de Leads — primeira etapa da cadeia comercial:
// Lead → Proposta → Contrato → Engenharia.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { LEAD_STATUS, type LeadStatus, type OrigemLead } from "@/lib/status-catalog";
import { pushAudit } from "@/lib/audit-store";

export type Lead = {
  id: string;
  numero: string;             // LD-0001
  nome: string;
  telefone: string;
  consumoKwh: number;
  consultorId: string;
  origem: OrigemLead;
  observacao?: string;
  status: LeadStatus;
  criadoEm: string;           // ISO
  criadoPor?: string;
  atualizadoEm: string;
};

const KEY = "ms.leads.v1";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Lead[] | null = null;

function read(): Lead[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = []; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw) as Lead[]; return cache!; }
  } catch {}
  cache = [];
  return cache;
}
function write(next: Lead[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnap() { return read(); }
function getServerSnap(): Lead[] { return []; }

export function useLeads(): Lead[] {
  const list = useSyncExternalStore(subscribe, getSnap, getServerSnap);
  useEffect(() => { read(); }, []);
  return list;
}
export function getLeads(): Lead[] { return read(); }
export function getLead(id: string): Lead | undefined {
  return read().find((x) => x.id === id);
}

function nextNumero(): string {
  const cur = read();
  const n = cur.length + 1;
  return `LD-${String(n).padStart(4, "0")}`;
}

export type NovoLeadInput = {
  nome: string;
  telefone: string;
  consumoKwh: number;
  consultorId: string;
  origem: OrigemLead;
  observacao?: string;
  criadoPor?: string;
};

export function criarLead(input: NovoLeadInput): Lead {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: `LEAD-${Date.now()}`,
    numero: nextNumero(),
    nome: input.nome.trim(),
    telefone: input.telefone.trim(),
    consumoKwh: Number(input.consumoKwh) || 0,
    consultorId: input.consultorId,
    origem: input.origem,
    observacao: input.observacao?.trim() || undefined,
    status: LEAD_STATUS.LEAD_CADASTRADO,
    criadoEm: now,
    atualizadoEm: now,
    criadoPor: input.criadoPor,
  };
  write([lead, ...read()]);
  pushAudit({
    entidade: "lead", entidadeId: lead.id,
    acao: "CRIACAO", usuario: input.criadoPor,
    detalhe: `Lead ${lead.numero} criado para ${lead.nome}.`,
  });
  return lead;
}

export function setLeadStatus(id: string, status: LeadStatus, usuario?: string, motivo?: string) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cur[idx];
  if (old.status === status) return;
  const next = [...cur];
  next[idx] = { ...old, status, atualizadoEm: new Date().toISOString() };
  write(next);
  pushAudit({
    entidade: "lead", entidadeId: id,
    acao: "STATUS", usuario,
    campo: "status", valorAnterior: old.status, valorNovo: status, motivo,
  });
}

export function trocarOrigemLead(
  id: string, novaOrigem: OrigemLead, usuario: string, motivo: string,
) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cur[idx];
  if (old.origem === novaOrigem) return;
  const next = [...cur];
  next[idx] = { ...old, origem: novaOrigem, atualizadoEm: new Date().toISOString() };
  write(next);
  pushAudit({
    entidade: "lead", entidadeId: id,
    acao: "TROCA_ORIGEM", usuario,
    campo: "origem", valorAnterior: old.origem, valorNovo: novaOrigem, motivo,
  });
}

export function trocarConsultorLead(
  id: string, novoConsultorId: string, usuario: string, motivo: string,
) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cur[idx];
  if (old.consultorId === novoConsultorId) return;
  const next = [...cur];
  next[idx] = { ...old, consultorId: novoConsultorId, atualizadoEm: new Date().toISOString() };
  write(next);
  pushAudit({
    entidade: "lead", entidadeId: id,
    acao: "TROCA_CONSULTOR", usuario,
    campo: "consultorId", valorAnterior: old.consultorId, valorNovo: novoConsultorId, motivo,
  });
}

export function atualizarLead(
  id: string, patch: Partial<Pick<Lead, "nome" | "telefone" | "consumoKwh" | "observacao">>,
  usuario?: string,
) {
  const cur = read();
  const idx = cur.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cur[idx];
  const merged = { ...old, ...patch, atualizadoEm: new Date().toISOString() };
  const next = [...cur];
  next[idx] = merged;
  write(next);
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    const before = (old as any)[k];
    const after = (merged as any)[k];
    if (String(before ?? "") !== String(after ?? "")) {
      pushAudit({
        entidade: "lead", entidadeId: id,
        acao: "ALTERACAO", usuario,
        campo: String(k), valorAnterior: String(before ?? ""), valorNovo: String(after ?? ""),
      });
    }
  }
}
