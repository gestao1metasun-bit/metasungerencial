/**
 * Repositório Supabase para Leads.
 * Espelha o tipo `Lead` em `src/modules/leads/store.ts`.
 * Não é chamado diretamente pela UI — o store síncrono em
 * `src/modules/leads/store.ts` faz hidratação + write-through aqui.
 *
 * Regra de domínio importante:
 *   `leads.consultor_id` (coluna uuid) representa o OWNER no Supabase
 *   (auth.uid()) e é exigido pela RLS `leads_insert_auth`.
 *   A UI legada usa IDs locais tipo "CSL-1" (entidade Consultor de venda)
 *   que NÃO são UUIDs. Preservamos esse ID em `dados.consultorLegadoId`
 *   e forçamos `consultor_id = auth.uid()` no upsert.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function rowToLead(r: Row): Lead {
  const dados = (r.dados ?? {}) as { criadoPor?: string; consultorLegadoId?: string };
  return {
    id: r.id,
    numero: r.numero ?? "",
    nome: r.nome,
    telefone: r.telefone ?? "",
    doc: r.doc ?? undefined,
    consumoKwh: Number(r.consumo_kwh) || 0,
    // Preferir consultor legado (UI atual usa IDs CSL-*); fallback para owner UUID
    consultorId: dados.consultorLegadoId ?? r.consultor_id ?? "",
    origem: (r.origem as Lead["origem"]) ?? ("OUTROS" as Lead["origem"]),
    observacao: r.observacao ?? undefined,
    status: r.status as Lead["status"],
    clienteId: r.cliente_id ?? undefined,
    criadoEm: r.created_at,
    atualizadoEm: r.updated_at,
    criadoPor: dados.criadoPor,
  };
}

function leadToRow(l: Lead, ownerUuid: string): Omit<Row, "created_at" | "updated_at"> {
  const legado = l.consultorId && !UUID_RE.test(l.consultorId) ? l.consultorId : undefined;
  return {
    id: l.id,
    numero: l.numero || null,
    nome: l.nome,
    telefone: l.telefone || null,
    doc: l.doc || null,
    consumo_kwh: l.consumoKwh || 0,
    // RLS exige consultor_id = auth.uid(). Consultor legado preservado em dados.
    consultor_id: ownerUuid,
    origem: l.origem || null,
    observacao: l.observacao || null,
    status: l.status,
    cliente_id: l.clienteId || null,
    dados: { criadoPor: l.criadoPor, consultorLegadoId: legado },
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
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    const msg = userErr?.message ?? "Sessão não disponível";
    console.error("[leads-repo] upsert abortado: sem sessão", msg);
    return { error: `auth: ${msg}` };
  }
  const ownerUuid = userData.user.id;
  const rows = leads.map((l) => leadToRow(l, ownerUuid));
  const { error } = await supabase.from("leads").upsert(rows);
  if (error) {
    console.error("[leads-repo] upsert error", error, { sample: rows[0] });
    return { error: error.message };
  }
  console.info("[leads-repo] upsert ok", { count: rows.length, owner: ownerUuid });
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
