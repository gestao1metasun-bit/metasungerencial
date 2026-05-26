/**
 * Repositório Supabase-first para `obras`.
 *
 * Padrão alinhado a `projetos-contrato-repo.ts` / `leads-repo.ts`:
 *  - sem localStorage paralelo;
 *  - UUIDs em todos os IDs;
 *  - RLS no Supabase é a fonte da verdade;
 *  - obras nascem exclusivamente via RPC `enviar_projeto_para_engenharia`
 *    (não há `criarObra` aqui de propósito — bridge obrigatória pelo Comercial).
 *
 * Frontend apenas:
 *   - lê linhas reais (`fetchAll`, `fetchByContrato`, `fetchById`);
 *   - hidrata kanban / cronograma;
 *   - patch leve em campos operacionais não-protegidos (`atualizarStatus`, `atualizarEquipe`).
 *
 * Logs estruturados: [obras-repo].
 *
 * Onda B — Engenharia Real.
 */
import { supabase } from "@/integrations/supabase/client";

const TAG = "[obras-repo]";
const DEBUG_OBRA_CODIGO = "OBR-20260526-710ec4";

export type ObraRow = {
  id: string;
  codigo: string | null;
  contrato_id: string | null;
  cliente_id: string | null;
  consultor_id: string | null;
  status: string;
  tipo: string | null;
  modulos_qtde: number | null;
  potencia_kwp: number | null;
  inversor: string | null;
  inv2: string | null;
  inv3: string | null;
  telhado_tipo: string | null;
  equipe: string | null;
  observacoes: string | null;
  data_inicio: string | null;
  data_finalizacao: string | null;
  dados: any;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RepoResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}

/** Extrai o projeto_contrato.id de origem (gravado em `dados` pela RPC). */
export function projetoContratoIdOf(row: ObraRow): string | null {
  const v = row?.dados?.projeto_contrato_id;
  return isUuid(v) ? v : null;
}

function debugRow(row: ObraRow | null | undefined) {
  if (!row) return null;
  return {
    obra_id: row.id ?? null,
    codigo: row.codigo ?? null,
    status: row.status ?? null,
    projeto_contrato_id: projetoContratoIdOf(row),
    cliente_id: row.cliente_id ?? null,
    contrato_id: row.contrato_id ?? null,
    consultor_id: row.consultor_id ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAll(): Promise<RepoResult<ObraRow[]>> {
  const { data: sessionData } = await supabase.auth.getSession();
  console.info(TAG, "fetchAll start", {
    hasSession: !!sessionData.session,
    userId: sessionData.session?.user?.id ?? null,
  });
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(TAG, "fetchAll error", error);
    return { error: error.message };
  }
  const rows = (data ?? []) as ObraRow[];
  console.info(TAG, "fetchAll ok", {
    total: rows.length,
    target: debugRow(rows.find((row) => row.codigo === DEBUG_OBRA_CODIGO)),
    rows: rows.map(debugRow),
  });
  return { data: rows };
}

export async function fetchByContrato(contratoId: string): Promise<RepoResult<ObraRow[]>> {
  if (!isUuid(contratoId)) return { error: `contrato_id inválido: ${contratoId}` };
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .eq("contrato_id", contratoId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(TAG, "fetchByContrato error", error);
    return { error: error.message };
  }
  return { data: (data ?? []) as ObraRow[] };
}

export async function fetchById(id: string): Promise<RepoResult<ObraRow | null>> {
  if (!isUuid(id)) return { error: `obra_id inválido: ${id}` };
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error(TAG, "fetchById error", error, { id });
    return { error: error.message };
  }
  return { data: (data ?? null) as ObraRow | null };
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH OPERACIONAL (campos não protegidos por trigger)
// ─────────────────────────────────────────────────────────────────────────────

export type AtualizarObraInput = Partial<
  Pick<ObraRow, "status" | "equipe" | "observacoes" | "data_inicio" | "data_finalizacao">
>;

export async function atualizarObra(
  obraId: string,
  patch: AtualizarObraInput,
): Promise<RepoResult<ObraRow>> {
  if (!isUuid(obraId)) return { error: "obra_id inválido" };
  const { data, error } = await supabase
    .from("obras")
    .update(patch)
    .eq("id", obraId)
    .select("*")
    .single();
  if (error) {
    // tg_guard_operacional / tg_guard_estado_critico podem rejeitar — repassamos.
    console.error(TAG, "atualizarObra error", error, { obraId });
    return { error: error.message };
  }
  console.info(TAG, "atualizarObra ok", { id: obraId, patch });
  return { data: data as ObraRow };
}
