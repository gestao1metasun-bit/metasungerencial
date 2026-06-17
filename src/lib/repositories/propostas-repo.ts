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
  const d = (r.dados as Record<string, any> | null) ?? {};

  // D18.6 — Binding compat para massas salvas em snake_case (ex.: HOMOLOGACAO_FIXA_D18).
  // Mapeia colunas tabulares (r.*) e chaves snake_case dentro de `dados` para
  // os campos camelCase usados pela grid (Lead.consultor, consumoMedio,
  // modulosQtd, moduloPotenciaWp, valorFinalManual, inversores, cidade/estado).
  const consultorTxt =
    (base as any).consultor ?? d.consultor_nome ?? d.consultorNome ?? d.vendedor ?? undefined;
  const modulosQtdNum =
    (base as any).modulosQtd ?? r.modulos_qtd ?? d.modulos_qtd ?? d.quantidade_modulos ?? undefined;
  const moduloWp =
    (base as any).moduloPotenciaWp ?? d.potencia_modulo_wp ?? d.modulo_wp ?? undefined;
  const consumoNum =
    (base as any).consumoMedio ?? d.consumo_kwh ?? d.consumo_medio ?? d.consumo_mensal ?? undefined;
  // valor_final é a fonte de verdade no Supabase; usamos valorFinalManual para
  // que calcPrecificacao().valorFinal devolva esse número sem mascarar com `|| 0`.
  const valorFinalNum =
    (base as any).valorFinalManual ?? r.valor_final ?? d.valor_total ?? d.valor_proposta ?? undefined;
  const cidadeTxt = (base as any).cidade ?? d.cidade ?? undefined;
  const ufTxt = (base as any).estado ?? d.uf ?? d.estado ?? undefined;
  // Inversor: `dados` pode trazer string ("Sofar 20k") ou array já estruturado.
  let inversoresArr: any[] | undefined = (base as any).inversores;
  let inversorMarcaTxt: string | undefined = (base as any).inversorMarca;
  if ((!inversoresArr || inversoresArr.length === 0) && (d.inversor || d.modelo_inversor)) {
    const txt = String(d.inversor ?? d.modelo_inversor);
    inversorMarcaTxt = inversorMarcaTxt ?? txt;
    inversoresArr = [{ inversorId: txt, quantidade: 1 }];
  }

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
    // Binding D18.6
    consultor: consultorTxt,
    modulosQtd: modulosQtdNum != null ? Number(modulosQtdNum) : (base as any).modulosQtd,
    moduloPotenciaWp: moduloWp != null ? Number(moduloWp) : (base as any).moduloPotenciaWp,
    consumoMedio: consumoNum != null ? Number(consumoNum) : (base as any).consumoMedio,
    valorFinalManual: valorFinalNum != null ? Number(valorFinalNum) : (base as any).valorFinalManual,
    cidade: cidadeTxt,
    estado: ufTxt,
    clienteCidade: (base as any).clienteCidade ?? cidadeTxt,
    clienteUf: (base as any).clienteUf ?? ufTxt,
    inversores: inversoresArr ?? [],
    inversorMarca: inversorMarcaTxt,
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
