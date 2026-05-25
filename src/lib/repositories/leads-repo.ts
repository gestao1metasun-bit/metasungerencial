/**
 * Repositório Supabase para Leads.
 * Espelha o tipo `Lead` em `src/modules/leads/store.ts`.
 * Não é chamado diretamente pela UI — o store síncrono em
 * `src/modules/leads/store.ts` faz hidratação + write-through aqui.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/modules/leads/store";

type Row = {
  id: string;
  numero: string | null;
  nome: string;
  telefone: string | null;
  doc: string | null;
  consumo_kwh: number;
  consultor_id: string | null;
  origem: string | null;
  observacao: string | null;
  status: string;
  cliente_id: string | null;
  dados: any;
  created_at: string;
  updated_at: string;
};

export function rowToLead(r: Row): Lead {
  return {
    id: r.id,
    numero: r.numero ?? "",
    nome: r.nome,
    telefone: r.telefone ?? "",
    doc: r.doc ?? undefined,
    consumoKwh: Number(r.consumo_kwh) || 0,
    consultorId: r.consultor_id ?? "",
    origem: (r.origem as Lead["origem"]) ?? ("OUTROS" as Lead["origem"]),
    observacao: r.observacao ?? undefined,
    status: r.status as Lead["status"],
    clienteId: r.cliente_id ?? undefined,
    criadoEm: r.created_at,
    atualizadoEm: r.updated_at,
    criadoPor: (r.dados as { criadoPor?: string })?.criadoPor,
  };
}

export function leadToRow(l: Lead): Omit<Row, "created_at" | "updated_at"> {
  return {
    id: l.id,
    numero: l.numero || null,
    nome: l.nome,
    telefone: l.telefone || null,
    doc: l.doc || null,
    consumo_kwh: l.consumoKwh || 0,
    consultor_id: l.consultorId || null,
    origem: l.origem || null,
    observacao: l.observacao || null,
    status: l.status,
    cliente_id: l.clienteId || null,
    dados: { criadoPor: l.criadoPor },
  };
}

export async function fetchAllLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[leads-repo] fetchAll error", error);
    return [];
  }
  return (data as unknown as Row[]).map(rowToLead);
}

export async function upsertLeads(leads: Lead[]): Promise<{ error?: string }> {
  if (leads.length === 0) return {};
  const rows = leads.map(leadToRow);
  const { error } = await supabase.from("leads").upsert(rows);
  if (error) {
    console.error("[leads-repo] upsert error", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteLeads(ids: string[]): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { error } = await supabase.from("leads").delete().in("id", ids);
  if (error) {
    console.error("[leads-repo] delete error", error);
    return { error: error.message };
  }
  return {};
}
