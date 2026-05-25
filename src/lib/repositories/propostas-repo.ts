/**
 * Repositório Supabase para Propostas.
 * Espelha o tipo `PropostaFV` em `src/modules/propostas/store.ts`.
 * Como `PropostaFV` é amplo e evolui, o snapshot completo vai em `dados jsonb`;
 * colunas tipadas guardam apenas o que precisa de query/filtragem operacional.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PropostaFV } from "@/modules/propostas/store";
import { calcPrecificacao, calcDimensionamento } from "@/modules/propostas/store";

type Row = {
  id: string;
  numero: string | null;
  status: string;
  consultor_id: string | null;
  cliente_id: string | null;
  lead_id: string | null;
  contrato_id: string | null;
  cliente_nome: string | null;
  cliente_doc: string | null;
  valor_final: number | null;
  potencia_kwp: number | null;
  modulos_qtd: number | null;
  validade: string | null;
  versao: string | null;
  motivo_status: string | null;
  dados: any;
  created_at: string;
  updated_at: string;
};

function safeNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeKwp(p: PropostaFV): number | null {
  try {
    return safeNumber(calcDimensionamento(p).potenciaFinalKwp);
  } catch {
    return null;
  }
}

function safeValor(p: PropostaFV): number | null {
  try {
    return safeNumber(calcPrecificacao(p).valorFinal);
  } catch {
    return null;
  }
}

export function rowToProposta(r: Row): PropostaFV {
  // `dados` carrega o objeto completo; colunas servem para filtros/relatórios.
  const base = (r.dados as Partial<PropostaFV> | null) ?? {};
  return {
    ...(base as PropostaFV),
    id: r.id,
    numero: r.numero ?? (base.numero ?? ""),
    status: (r.status as PropostaFV["status"]) ?? base.status ?? "RASCUNHO",
    clienteId: r.cliente_id ?? base.clienteId,
    leadId: r.lead_id ?? base.leadId,
    contratoGeradoId: r.contrato_id ?? base.contratoGeradoId,
    clienteNome: r.cliente_nome ?? base.clienteNome ?? "",
    clienteDoc: r.cliente_doc ?? base.clienteDoc,
    versao: r.versao ?? base.versao,
    motivoStatus: r.motivo_status ?? base.motivoStatus,
    validade: r.validade ?? base.validade ?? "",
    criadoEm: base.criadoEm ?? r.created_at,
    atualizadoEm: base.atualizadoEm ?? r.updated_at,
  } as PropostaFV;
}

export function propostaToRow(p: PropostaFV, consultorId: string | null): Omit<Row, "created_at" | "updated_at"> {
  return {
    id: p.id,
    numero: p.numero || null,
    status: p.status,
    consultor_id: consultorId,
    cliente_id: p.clienteId || null,
    lead_id: p.leadId || null,
    contrato_id: p.contratoGeradoId || null,
    cliente_nome: p.clienteNome || null,
    cliente_doc: p.clienteDoc || null,
    valor_final: safeValor(p),
    potencia_kwp: safeKwp(p),
    modulos_qtd: p.modulosQtd ?? null,
    validade: p.validade || null,
    versao: p.versao || null,
    motivo_status: p.motivoStatus || null,
    dados: p as any,
  };
}

export async function fetchAllPropostas(): Promise<PropostaFV[]> {
  const { data, error } = await supabase
    .from("propostas")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[propostas-repo] fetchAll error", error);
    return [];
  }
  return (data as unknown as Row[]).map(rowToProposta);
}

export async function upsertPropostas(propostas: PropostaFV[], consultorId: string | null): Promise<{ error?: string }> {
  if (propostas.length === 0) return {};
  const rows = propostas.map((p) => propostaToRow(p, consultorId));
  const { error } = await supabase.from("propostas").upsert(rows);
  if (error) {
    console.error("[propostas-repo] upsert error", error);
    return { error: error.message };
  }
  return {};
}

export async function deletePropostas(ids: string[]): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { error } = await supabase.from("propostas").delete().in("id", ids);
  if (error) {
    console.error("[propostas-repo] delete error", error);
    return { error: error.message };
  }
  return {};
}
