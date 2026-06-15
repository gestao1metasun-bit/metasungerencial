// ============================================================================
// Store de Leads — primeira etapa da cadeia comercial:
// Lead → Proposta → Contrato → Engenharia.
//
// FONTE DE VERDADE: Supabase (tabela `public.leads`, RLS por consultor).
// Cache síncrono em memória mantém compat com `useSyncExternalStore` e
// chamadas síncronas (`getLeads`, `findLeadByDoc`, etc).
//
// Hidratação acontece via `hydrateLeads()` chamado pelo auth-store ao
// detectar sessão Supabase.
// ============================================================================
import { useSyncExternalStore } from "react";
import { LEAD_STATUS, type LeadStatus, type OrigemLead } from "@/lib/status-catalog";
import { pushAudit } from "@/lib/audit-store";
import { fetchAllLeads, upsertLeads, deleteLeads } from "@/lib/repositories/leads-repo";
import { toast } from "sonner";

export type Lead = {
  id: string;                 // UUID gerado client-side
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
  // Vínculo com cadastro de cliente (CRM). Quando preenchido, este lead refere-se a um cliente já cadastrado (CPF/CNPJ único).
  clienteId?: string;
  doc?: string;               // CPF/CNPJ (mascarado)
};

type Listener = () => void;
const listeners = new Set<Listener>();
const EMPTY: Lead[] = Object.freeze([]) as unknown as Lead[];
let cache: Lead[] = [];
let hydrated = false;

function emit() { listeners.forEach((l) => l()); }

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnap(): Lead[] {
  if (typeof window === "undefined") return EMPTY;
  return cache;
}
function getServerSnap(): Lead[] { return EMPTY; }

export function useLeads(): Lead[] {
  return useSyncExternalStore(subscribe, getSnap, getServerSnap);
}

export function getLeads(): Lead[] { return cache; }
export function getLead(id: string): Lead | undefined {
  return cache.find((x) => x.id === id);
}

/** Hidrata o cache lendo do Supabase. Chamado pelo auth-store após login. */
export async function hydrateLeads(): Promise<void> {
  try {
    const list = await fetchAllLeads();
    cache = list;
    hydrated = true;
    emit();
  } catch (e) {
    console.error("[leads] hydrate falhou", e);
  }
}

export function resetLeadsCache(): void {
  cache = [];
  hydrated = false;
  emit();
}

export function isLeadsHydrated(): boolean { return hydrated; }

/** Diff e sincroniza com Supabase. Fire-and-forget; em erro, mostra toast. */
async function syncWrite(prev: Lead[], next: Lead[]) {
  const prevMap = new Map(prev.map((x) => [x.id, x]));
  const nextMap = new Map(next.map((x) => [x.id, x]));
  const upserts: Lead[] = [];
  const deletes: string[] = [];
  for (const [id, item] of nextMap) {
    const old = prevMap.get(id);
    if (!old || JSON.stringify(old) !== JSON.stringify(item)) upserts.push(item);
  }
  for (const [id] of prevMap) {
    if (!nextMap.has(id)) deletes.push(id);
  }
  const errs: string[] = [];
  console.info("[lead-save] syncWrite diff", { upserts: upserts.length, deletes: deletes.length });
  if (upserts.length) {
    console.info("[lead-save] chamando upsertLeads", { count: upserts.length });
    const { error } = await upsertLeads(upserts);
    console.info("[lead-save] upsertLeads retornou", { error: error ?? null });
    if (error) errs.push(error);
  }
  if (deletes.length) {
    const { error } = await deleteLeads(deletes);
    if (error) errs.push(error);
  }
  if (errs.length) {
    toast.error("Falha ao sincronizar lead com o servidor", {
      description: errs.join(" • "),
    });
  }
}

function write(next: Lead[]) {
  const prev = cache;
  cache = next;
  emit();
  void syncWrite(prev, next);
}

function nextNumero(): string {
  const n = cache.length + 1;
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
  clienteId?: string;
  doc?: string;
};

/** Procura lead existente pelo CPF/CNPJ (somente dígitos). */
export function findLeadByDoc(doc: string): Lead | undefined {
  const d = (doc ?? "").replace(/\D/g, "");
  if (!d) return undefined;
  return cache.find((l) => (l.doc ?? "").replace(/\D/g, "") === d);
}

/** Procura lead com mesmo telefone criado nos últimos `dias` (default 90). */
export function findLeadByTelefoneRecent(telefone: string, dias = 90): Lead | undefined {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (!d) return undefined;
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  return cache.find((l) => {
    const td = (l.telefone ?? "").replace(/\D/g, "");
    if (td !== d) return false;
    const t = new Date(l.criadoEm).getTime();
    return Number.isFinite(t) && t >= limite;
  });
}

function newUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (tests, SSR): pseudo-UUID v4-ish
  return "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");
}

export function criarLead(input: NovoLeadInput): Lead {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: newUUID(),
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
    clienteId: input.clienteId,
    doc: input.doc?.trim() || undefined,
  };
  write([lead, ...cache]);
  pushAudit({
    entidade: "lead", entidadeId: lead.id,
    acao: "CRIACAO", usuario: input.criadoPor,
    detalhe: `Lead ${lead.numero} criado para ${lead.nome}${input.clienteId ? ` (cliente ${input.clienteId})` : ""}.`,
  });
  return lead;
}

export function setLeadStatus(id: string, status: LeadStatus, usuario?: string, motivo?: string) {
  const idx = cache.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cache[idx];
  if (old.status === status) return;
  const next = [...cache];
  next[idx] = { ...old, status, atualizadoEm: new Date().toISOString() };
  write(next);
  pushAudit({
    entidade: "lead", entidadeId: id,
    acao: "STATUS", usuario,
    campo: "status", valorAnterior: old.status, valorNovo: status, motivo,
  });
}

/**
 * C-ENT.2.b — Cancelamento governado do Lead.
 * Não exclui dados. Apenas muda status para CANCELADO e registra auditoria
 * com motivo + observação opcional.
 */
export function cancelarLead(
  id: string,
  motivo: string,
  observacao: string | undefined,
  usuario?: string,
): { ok: boolean; erro?: string } {
  const idx = cache.findIndex((x) => x.id === id);
  if (idx < 0) return { ok: false, erro: "Lead não encontrado." };
  const old = cache[idx];
  if (old.status === LEAD_STATUS.CANCELADO) {
    return { ok: false, erro: "Lead já está cancelado." };
  }
  if (old.status === LEAD_STATUS.CONVERTIDO_EM_CONTRATO) {
    return { ok: false, erro: "Lead já convertido em contrato — cancelamento bloqueado." };
  }
  const detalhe = observacao && observacao.trim()
    ? `${motivo} — ${observacao.trim()}`
    : motivo;
  const next = [...cache];
  next[idx] = { ...old, status: LEAD_STATUS.CANCELADO, atualizadoEm: new Date().toISOString() };
  write(next);
  pushAudit({
    entidade: "lead", entidadeId: id,
    acao: "CANCELAMENTO", usuario,
    campo: "status", valorAnterior: old.status, valorNovo: LEAD_STATUS.CANCELADO,
    motivo: detalhe,
  });
  return { ok: true };
}

export function trocarOrigemLead(
  id: string, novaOrigem: OrigemLead, usuario: string, motivo: string,
) {
  const idx = cache.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cache[idx];
  if (old.origem === novaOrigem) return;
  const next = [...cache];
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
  const idx = cache.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cache[idx];
  if (old.consultorId === novoConsultorId) return;
  const next = [...cache];
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
  const idx = cache.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const old = cache[idx];
  const merged = { ...old, ...patch, atualizadoEm: new Date().toISOString() };
  const next = [...cache];
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
