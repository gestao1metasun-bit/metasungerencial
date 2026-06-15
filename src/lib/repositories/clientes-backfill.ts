/**
 * C-ENT.1.g — Backfill controlado de clientes LS → Supabase.
 *
 * Regras de pedra:
 *  - LEITURA do LS jamais é destrutiva.
 *  - Cliente já existente em Supabase (doc/email/telefone) NÃO é recriado.
 *  - Similaridade ≥80 com mesmo doc → JA_EXISTE.
 *  - Similaridade em [50,80) → POSSIVEL_DUPLICIDADE (não cria, registra).
 *  - Sem match → CRIAR (apenas no modo execute).
 *  - Supabase é fonte oficial; LS é fonte legada. Em conflito, vence Supabase.
 *  - Origem registrada em `codigo_externo` + `sistema_destino='LEGADO_LS'`.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ClienteRecord } from "@/lib/clientes-store";
import { logError } from "@/lib/repositories/error-log-repo";

export type BackfillItemStatus =
  | "CRIAR"
  | "JA_EXISTE"
  | "POSSIVEL_DUPLICIDADE"
  | "INVALIDO"
  | "JA_TEM_UUID";

export type BackfillSimilar = {
  id: string;
  nome: string;
  doc: string | null;
  score: number;
  motivo: string;
};

export type BackfillItem = {
  lsId: string;
  nome: string;
  doc: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  status: BackfillItemStatus;
  motivo: string;
  similares: BackfillSimilar[];
};

export type BackfillSummary = {
  totalLs: number;
  jaTemUuid: number;
  jaExiste: number;
  criar: number;
  possivelDuplicidade: number;
  invalido: number;
  itens: BackfillItem[];
  geradoEm: string;
};

export type BackfillExecResult = {
  iniciadoEm: string;
  finalizadoEm: string;
  duracaoMs: number;
  tentados: number;
  criados: number;
  ignorados: number;
  falhas: number;
  erros: Array<{ lsId: string; nome: string; mensagem: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

function normEmail(v: string): string {
  const t = (v ?? "").trim().toLowerCase();
  return t.includes("@") ? t : "";
}

function isLsId(id: string): boolean {
  return !UUID_RE.test(id ?? "");
}

function isInvalido(c: ClienteRecord): { ok: false; motivo: string } | { ok: true } {
  const nome = (c.nome ?? "").trim();
  if (!nome || nome.length < 2) return { ok: false, motivo: "Nome ausente/curto" };
  const doc = onlyDigits(c.doc ?? "");
  const tel = onlyDigits(c.telefone ?? "");
  const email = normEmail(c.email ?? "");
  // Precisa ter ao menos UM identificador além do nome para evitar lixo.
  if (!doc && !tel && !email) return { ok: false, motivo: "Sem doc/telefone/email" };
  // Doc inválido (com tamanho fora do padrão BR) NÃO é bloqueante — vira candidato sem doc.
  return { ok: true };
}

type SimilarRow = {
  id: string;
  nome: string;
  doc: string | null;
  email: string | null;
  telefone: string | null;
  tipo_pessoa: string | null;
  status: string | null;
  score: number;
  motivo: string;
};

async function buscarSimilares(c: ClienteRecord): Promise<SimilarRow[]> {
  const doc = onlyDigits(c.doc ?? "");
  const tel = onlyDigits(c.telefone ?? "");
  const email = normEmail(c.email ?? "");
  const nome = (c.nome ?? "").trim();

  const { data, error } = await supabase.rpc("rpc_cliente_buscar_similar", {
    p_doc: doc || undefined,
    p_email: email || undefined,
    p_telefone: tel || undefined,
    p_nome: nome || undefined,
  });
  if (error) {
    logError({
      modulo: "comercial",
      tela: "clientes-backfill",
      acao: "cliente.buscar_similar",
      mensagem: error.message,
      severidade: "warn",
      payload: { lsId: c.id },
    });
    return [];
  }
  return (data ?? []) as SimilarRow[];
}

/** Modo dry-run: classifica cada cliente LS sem gravar nada. */
export async function analisarBackfill(
  lsList: ClienteRecord[],
): Promise<BackfillSummary> {
  const itens: BackfillItem[] = [];

  for (const c of lsList) {
    const base = {
      lsId: c.id,
      nome: c.nome ?? "",
      doc: c.doc ?? "",
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      cidade: c.cidade ?? "",
      uf: c.uf ?? "",
      similares: [] as BackfillSimilar[],
    };

    if (!isLsId(c.id)) {
      itens.push({
        ...base,
        status: "JA_TEM_UUID",
        motivo: "ID já é UUID (provável Supabase)",
      });
      continue;
    }

    const valid = isInvalido(c);
    if (!valid.ok) {
      itens.push({ ...base, status: "INVALIDO", motivo: valid.motivo });
      continue;
    }

    const similares = await buscarSimilares(c);
    const top = similares
      .map((s) => ({ id: s.id, nome: s.nome, doc: s.doc, score: s.score, motivo: s.motivo }))
      .sort((a, b) => b.score - a.score);

    const best = top[0];
    if (best && best.score >= 80) {
      itens.push({
        ...base,
        status: "JA_EXISTE",
        motivo: `Match forte: ${best.motivo} (score ${best.score})`,
        similares: top.slice(0, 5),
      });
    } else if (best && best.score >= 50) {
      itens.push({
        ...base,
        status: "POSSIVEL_DUPLICIDADE",
        motivo: `Match moderado: ${best.motivo} (score ${best.score})`,
        similares: top.slice(0, 5),
      });
    } else {
      itens.push({ ...base, status: "CRIAR", motivo: "Sem correspondência" });
    }
  }

  return {
    totalLs: lsList.length,
    jaTemUuid: itens.filter((i) => i.status === "JA_TEM_UUID").length,
    jaExiste: itens.filter((i) => i.status === "JA_EXISTE").length,
    criar: itens.filter((i) => i.status === "CRIAR").length,
    possivelDuplicidade: itens.filter((i) => i.status === "POSSIVEL_DUPLICIDADE").length,
    invalido: itens.filter((i) => i.status === "INVALIDO").length,
    itens,
    geradoEm: new Date().toISOString(),
  };
}

/** Execução real: insere apenas itens com status='CRIAR'. NÃO altera registros existentes. */
export async function executarBackfill(
  summary: BackfillSummary,
  lsById: Record<string, ClienteRecord>,
): Promise<BackfillExecResult> {
  const iniciado = new Date();
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const aCriar = summary.itens.filter((i) => i.status === "CRIAR");
  const erros: BackfillExecResult["erros"] = [];
  let criados = 0;

  for (const it of aCriar) {
    const c = lsById[it.lsId];
    if (!c) {
      erros.push({ lsId: it.lsId, nome: it.nome, mensagem: "Registro LS sumiu durante execução" });
      continue;
    }
    const docDigits = onlyDigits(c.doc ?? "");
    const tipo: "PF" | "PJ" | "EX" = docDigits.length === 14 ? "PJ" : "PF";

    const payload = {
      nome: (c.nome ?? "").trim(),
      doc: docDigits ? c.doc : null,
      telefone: c.telefone || null,
      telefone2: c.telefone2 || null,
      email: normEmail(c.email ?? "") || null,
      cep: c.cep || null,
      rua: c.rua || null,
      numero: c.numero || null,
      bairro: c.bairro || null,
      complemento: c.complemento || null,
      cidade: c.cidade || null,
      uf: c.uf || null,
      tipo_pessoa: tipo,
      consultor_id: uid,
      status: c.status || "Ativo",
      // Origem auditável — não é integração real, só rastro.
      codigo_externo: `backfill_ls:${c.id}`,
      sistema_destino: "LEGADO_LS",
      status_integracao: "IGNORADO",
      data_integracao: new Date().toISOString(),
    };

    const { error } = await supabase.from("clientes").insert(payload as never);
    if (error) {
      erros.push({ lsId: c.id, nome: c.nome ?? "", mensagem: error.message });
      logError({
        modulo: "comercial",
        tela: "clientes-backfill",
        acao: "cliente.backfill_inserir",
        mensagem: error.message,
        severidade: "error",
        payload: { lsId: c.id },
      });
      continue;
    }
    criados += 1;
  }

  const finalizado = new Date();
  return {
    iniciadoEm: iniciado.toISOString(),
    finalizadoEm: finalizado.toISOString(),
    duracaoMs: finalizado.getTime() - iniciado.getTime(),
    tentados: aCriar.length,
    criados,
    ignorados:
      summary.jaTemUuid + summary.jaExiste + summary.possivelDuplicidade + summary.invalido,
    falhas: erros.length,
    erros,
  };
}
