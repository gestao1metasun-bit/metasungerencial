/**
 * Repositório Supabase-first para `projetos_contrato`.
 *
 * Padrão alinhado a `leads-repo.ts` / `propostas-repo.ts`:
 *  - sem localStorage paralelo;
 *  - UUIDs em todos os IDs;
 *  - RLS no Supabase é a fonte da verdade;
 *  - regra de domínio (transições, bloqueios) vem das RPCs SECURITY DEFINER
 *    no Postgres (aprovar_projeto / cancelar_projeto /
 *    enviar_projeto_para_engenharia / recalcular_saldo_contrato).
 *
 * Frontend apenas:
 *   - lê linhas (`fetchByContrato`);
 *   - cria / atualiza (`upsertProjeto`);
 *   - chama RPCs (`aprovar`, `cancelar`, `enviarEngenharia`);
 *   - hidrata saldo (`saldoContrato`).
 *
 * Logs estruturados: [projetos-repo], [projetos-rpc].
 */
import { supabase } from "@/integrations/supabase/client";
import type { ProjetoContratoStatus } from "@/lib/projetosContratoStatus";

const TAG_REPO = "[projetos-repo]";
const TAG_RPC = "[projetos-rpc]";

export type ProjetoContratoRow = {
  id: string;
  contrato_id: string;
  pv_id: string | null;
  obra_id: string | null;
  cliente_id: string | null;
  consultor_id: string | null;
  ordem: number;
  descricao: string;
  valor: number;
  potencia_kwp: number | null;
  modulos_qtd: number | null;
  inv1: string | null;
  inv2: string | null;
  inv3: string | null;
  telhado_tipo: string | null;
  endereco: any;
  dados: any;
  status: ProjetoContratoStatus;
  aprovado_em: string | null;
  aprovado_por: string | null;
  motivo_aprovacao: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SaldoContrato = {
  total: number;
  somado: number;
  aprovado: number;
  saldo: number;
};

export type RepoResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchByContrato(contratoId: string): Promise<RepoResult<ProjetoContratoRow[]>> {
  if (!isUuid(contratoId)) return { error: `contrato_id inválido (esperado UUID): ${contratoId}` };
  const { data, error } = await supabase
    .from("projetos_contrato")
    .select("*")
    .eq("contrato_id", contratoId)
    .is("deleted_at", null)
    .order("ordem", { ascending: true });
  if (error) {
    console.error(TAG_REPO, "fetchByContrato error", error);
    return { error: error.message };
  }
  return { data: (data ?? []) as ProjetoContratoRow[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRIAÇÃO / EDIÇÃO
// ─────────────────────────────────────────────────────────────────────────────

export type CriarProjetoInput = {
  contrato_id: string;
  descricao: string;
  valor: number;
  ordem?: number;
  potencia_kwp?: number | null;
  modulos_qtd?: number | null;
  inv1?: string | null;
  inv2?: string | null;
  inv3?: string | null;
  telhado_tipo?: string | null;
  endereco?: any;
  cliente_id?: string | null;
};

export async function criarProjeto(input: CriarProjetoInput): Promise<RepoResult<ProjetoContratoRow>> {
  if (!isUuid(input.contrato_id)) return { error: "contrato_id inválido" };
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    console.error(TAG_REPO, "criarProjeto sem sessão", userErr);
    return { error: `auth: ${userErr?.message ?? "sem sessão"}` };
  }
  const row = {
    contrato_id: input.contrato_id,
    consultor_id: userData.user.id,
    cliente_id: input.cliente_id ?? null,
    descricao: input.descricao,
    valor: input.valor,
    ordem: input.ordem ?? 1,
    potencia_kwp: input.potencia_kwp ?? null,
    modulos_qtd: input.modulos_qtd ?? null,
    inv1: input.inv1 ?? null,
    inv2: input.inv2 ?? null,
    inv3: input.inv3 ?? null,
    telhado_tipo: input.telhado_tipo ?? null,
    endereco: input.endereco ?? {},
    status: "RASCUNHO" as ProjetoContratoStatus,
  };
  const { data, error } = await supabase
    .from("projetos_contrato")
    .insert(row)
    .select("*")
    .single();
  if (error) {
    console.error(TAG_REPO, "criarProjeto error", error, { row });
    return { error: error.message };
  }
  console.info(TAG_REPO, "criarProjeto ok", { id: data.id, contrato_id: input.contrato_id });
  return { data: data as ProjetoContratoRow };
}

export type AtualizarProjetoInput = Partial<
  Pick<
    ProjetoContratoRow,
    | "descricao"
    | "valor"
    | "ordem"
    | "potencia_kwp"
    | "modulos_qtd"
    | "inv1"
    | "inv2"
    | "inv3"
    | "telhado_tipo"
    | "endereco"
  >
>;

export async function atualizarProjeto(
  projetoId: string,
  patch: AtualizarProjetoInput,
): Promise<RepoResult<ProjetoContratoRow>> {
  if (!isUuid(projetoId)) return { error: "projeto_id inválido" };
  const { data, error } = await supabase
    .from("projetos_contrato")
    .update(patch)
    .eq("id", projetoId)
    .select("*")
    .single();
  if (error) {
    // pc_protege_aprovado dispara aqui (42501) — repassamos a mensagem.
    console.error(TAG_REPO, "atualizarProjeto error", error, { projetoId });
    return { error: error.message };
  }
  console.info(TAG_REPO, "atualizarProjeto ok", { id: projetoId });
  return { data: data as ProjetoContratoRow };
}

// ─────────────────────────────────────────────────────────────────────────────
// RPCs (regra real)
// ─────────────────────────────────────────────────────────────────────────────

export async function aprovarProjeto(
  projetoId: string,
  motivo?: string,
): Promise<RepoResult<string>> {
  if (!isUuid(projetoId)) return { error: "projeto_id inválido" };
  const { data, error } = await supabase.rpc("aprovar_projeto", {
    _projeto_id: projetoId,
    _motivo: motivo ?? undefined,
  });
  if (error) {
    console.error(TAG_RPC, "aprovar_projeto error", error, { projetoId });
    return { error: error.message };
  }
  console.info(TAG_RPC, "aprovar_projeto ok", { id: data });
  return { data: data as string };
}

export async function cancelarProjeto(
  projetoId: string,
  motivo: string,
): Promise<RepoResult<true>> {
  if (!isUuid(projetoId)) return { error: "projeto_id inválido" };
  if (!motivo || motivo.trim().length < 3) {
    return { error: "Motivo obrigatório (mínimo 3 caracteres)." };
  }
  const { error } = await supabase.rpc("cancelar_projeto", {
    _projeto_id: projetoId,
    _motivo: motivo.trim(),
  });
  if (error) {
    console.error(TAG_RPC, "cancelar_projeto error", error, { projetoId });
    return { error: error.message };
  }
  console.info(TAG_RPC, "cancelar_projeto ok", { id: projetoId });
  return { data: true };
}

export async function enviarParaEngenharia(
  projetoId: string,
): Promise<RepoResult<string>> {
  if (!isUuid(projetoId)) return { error: "projeto_id inválido" };
  const { data, error } = await supabase.rpc("enviar_projeto_para_engenharia", {
    _projeto_id: projetoId,
  });
  if (error) {
    console.error(TAG_RPC, "enviar_projeto_para_engenharia error", error, { projetoId });
    return { error: error.message };
  }
  console.info(TAG_RPC, "enviar_projeto_para_engenharia ok", { projetoId, obraId: data });
  return { data: data as string };
}

export async function recalcularSaldoContrato(
  contratoId: string,
): Promise<RepoResult<SaldoContrato>> {
  if (!isUuid(contratoId)) return { error: "contrato_id inválido" };
  const { data, error } = await supabase.rpc("recalcular_saldo_contrato", {
    _contrato_id: contratoId,
  });
  if (error) {
    console.error(TAG_RPC, "recalcular_saldo_contrato error", error, { contratoId });
    return { error: error.message };
  }
  const s = (data ?? {}) as Partial<SaldoContrato>;
  return {
    data: {
      total: Number(s.total ?? 0),
      somado: Number(s.somado ?? 0),
      aprovado: Number(s.aprovado ?? 0),
      saldo: Number(s.saldo ?? 0),
    },
  };
}
