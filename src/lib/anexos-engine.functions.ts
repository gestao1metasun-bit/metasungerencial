/**
 * D6.13.4 — Attachment Engine Enterprise (server functions polimórficas)
 *
 * Motor único de anexos para todas as entidades críticas do ERP. Usa o bucket
 * privado `anexos` + tabela `public.anexos` polimórfica + função RLS
 * `public.pode_acessar_entidade` que delega a verificação para a regra original
 * de cada módulo. Server-side validation + auditoria em TODA operação.
 *
 * Operações: list, upload, signedUrl, softDelete. Nada de delete físico.
 *
 * Esta camada NÃO substitui `anexos.functions.ts` (legado por título). Convive
 * com ele — telas novas devem usar este motor; o legado segue funcionando para
 * compatibilidade até migração completa.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ----------------------------------------------------------------------------
// Constantes / validação
// ----------------------------------------------------------------------------

const BUCKET = "anexos";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/xml", "text/xml",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
  "text/plain", "text/csv",
]);

export const ENTIDADES_ANEXAVEIS = [
  "clientes", "contratos", "pedidos_venda", "titulos_financeiros",
  "obras", "workflow_aprovacoes", "estoque_movimentos", "financiamentos",
  // D17.UI.6 — Operações Financeiras (contrato, comprovante, termo, autorização, recibo)
  "operacoes_financeiras", "operacoes_financeiras_parcelas",
  // D27.COM.3.c — Comercial
  "propostas", "leads", "aditivos",
] as const;

export const CATEGORIAS_ANEXO = [
  "contrato", "comprovante", "boleto", "nota_fiscal",
  "documento_cliente", "foto_obra", "laudo", "projeto",
  "aprovacao", "orcamento", "financeiro", "estoque", "outros",
] as const;

export type EntidadeAnexavel = (typeof ENTIDADES_ANEXAVEIS)[number];
export type CategoriaAnexo  = (typeof CATEGORIAS_ANEXO)[number];

export type AnexoRow = {
  id: string;
  entidade_tipo: EntidadeAnexavel;
  entidade_id: string;
  categoria: CategoriaAnexo;
  storage_path: string;
  nome: string;
  mime: string;
  tamanho: number;
  observacao: string | null;
  owner_id: string;
  created_at: string;
};

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 140);
}

function audit(payload: {
  anexo_id?: string | null;
  entidade_tipo?: string | null;
  entidade_id?: string | null;
  categoria?: string | null;
  acao: "UPLOAD" | "DOWNLOAD" | "DELETE";
  user_id: string;
  user_email?: string | null;
  nome?: string | null;
  tamanho?: number | null;
  motivo?: string | null;
  detalhe?: string | null;
}) {
  let ip: string | null = null;
  let user_agent: string | null = null;
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? null;
    user_agent = getRequestHeader("user-agent") ?? null;
  } catch { /* fora de request */ }

  return supabaseAdmin
    .from("anexos_audit")
    .insert({ ...payload, ip, user_agent })
    .then(({ error }) => {
      if (error) console.error("[anexos_audit] insert error:", error.message);
    });
}

// ----------------------------------------------------------------------------
// LISTAR — RLS já filtra acesso por entidade
// ----------------------------------------------------------------------------
export const listAnexosEntidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      entidadeTipo: z.enum(ENTIDADES_ANEXAVEIS),
      entidadeId: z.string().uuid(),
    }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("anexos")
      .select("id, entidade_tipo, entidade_id, categoria, storage_path, nome, mime, tamanho, observacao, owner_id, created_at")
      .eq("entidade_tipo", data.entidadeTipo)
      .eq("entidade_id", data.entidadeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { anexos: (rows ?? []) as AnexoRow[] };
  });

// ----------------------------------------------------------------------------
// UPLOAD — FormData (file + entidadeTipo + entidadeId + categoria + observacao)
// ----------------------------------------------------------------------------
export const uploadAnexoEntidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => {
    if (!(input instanceof FormData)) throw new Error("FormData esperado.");
    const file = input.get("file");
    const entidadeTipo = input.get("entidadeTipo");
    const entidadeId   = input.get("entidadeId");
    const categoria    = input.get("categoria") ?? "outros";
    const observacao   = input.get("observacao");

    if (!(file instanceof File))            throw new Error("Arquivo ausente.");
    if (typeof entidadeTipo !== "string")   throw new Error("entidadeTipo ausente.");
    if (typeof entidadeId   !== "string")   throw new Error("entidadeId ausente.");
    if (!(ENTIDADES_ANEXAVEIS as readonly string[]).includes(entidadeTipo))
      throw new Error(`Entidade inválida: ${entidadeTipo}`);
    if (!/^[0-9a-f-]{36}$/i.test(entidadeId))
      throw new Error("entidadeId inválido (esperado UUID).");
    if (typeof categoria !== "string"
        || !(CATEGORIAS_ANEXO as readonly string[]).includes(categoria))
      throw new Error(`Categoria inválida: ${String(categoria)}`);

    if (file.size <= 0)            throw new Error("Arquivo vazio.");
    if (file.size > MAX_BYTES)     throw new Error(`Arquivo excede ${MAX_BYTES / (1024 * 1024)} MB.`);
    if (!ALLOWED_MIME.has(file.type))
      throw new Error(`Tipo não permitido: ${file.type || "desconhecido"}`);

    const obs = typeof observacao === "string" && observacao.trim()
      ? observacao.trim().slice(0, 500)
      : null;

    return { file, entidadeTipo, entidadeId, categoria, observacao: obs };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const userEmail = (claims?.email as string | undefined) ?? null;

    // Gate de acesso à entidade (server-side) — usa a função SECURITY DEFINER
    const { data: gate, error: gateErr } = await supabase
      .rpc("pode_acessar_entidade", { _tipo: data.entidadeTipo, _id: data.entidadeId });
    if (gateErr) throw new Error(`Falha no gate: ${gateErr.message}`);
    if (!gate)   throw new Error("Sem permissão para anexar nesta entidade.");

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(data.file.name)}`;
    const path = `${data.entidadeTipo}/${data.entidadeId}/${filename}`;
    const bytes = new Uint8Array(await data.file.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.file.type, upsert: false });
    if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);

    const { data: meta, error: insErr } = await supabaseAdmin
      .from("anexos")
      .insert({
        entidade_tipo: data.entidadeTipo,
        entidade_id:   data.entidadeId,
        categoria:     data.categoria,
        storage_path:  path,
        nome:          data.file.name,
        mime:          data.file.type,
        tamanho:       data.file.size,
        observacao:    data.observacao,
        owner_id:      userId,
      })
      .select("id, entidade_tipo, entidade_id, categoria, storage_path, nome, mime, tamanho, observacao, owner_id, created_at")
      .single();

    if (insErr) {
      await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {});
      throw new Error(`Falha ao registrar anexo: ${insErr.message}`);
    }

    await audit({
      anexo_id:      meta.id,
      entidade_tipo: meta.entidade_tipo,
      entidade_id:   meta.entidade_id,
      categoria:     meta.categoria,
      acao:          "UPLOAD",
      user_id:       userId,
      user_email:    userEmail,
      nome:          meta.nome,
      tamanho:       meta.tamanho,
    });

    return { anexo: meta as AnexoRow };
  });

// ----------------------------------------------------------------------------
// SIGNED URL — link temporário (5 min) e audit DOWNLOAD
// ----------------------------------------------------------------------------
export const signedUrlAnexoEntidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ anexoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const userEmail = (claims?.email as string | undefined) ?? null;

    // SELECT respeita RLS — só retorna se o usuário pode ver a entidade
    const { data: row, error } = await supabase
      .from("anexos")
      .select("id, entidade_tipo, entidade_id, categoria, storage_path, nome, tamanho")
      .eq("id", data.anexoId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row)  throw new Error("Anexo não encontrado ou sem permissão.");

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60 * 5, { download: row.nome });
    if (sErr || !signed) throw new Error(`Falha ao gerar link: ${sErr?.message ?? "?"}`);

    await audit({
      anexo_id:      row.id,
      entidade_tipo: row.entidade_tipo,
      entidade_id:   row.entidade_id,
      categoria:     row.categoria,
      acao:          "DOWNLOAD",
      user_id:       userId,
      user_email:    userEmail,
      nome:          row.nome,
      tamanho:       row.tamanho,
    });

    return { url: signed.signedUrl, nome: row.nome };
  });

// ----------------------------------------------------------------------------
// SOFT DELETE — marca como excluído + motivo. Storage permanece para auditoria.
// ----------------------------------------------------------------------------
export const softDeleteAnexoEntidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      anexoId: z.string().uuid(),
      motivo:  z.string().min(3, "Motivo mínimo de 3 caracteres.").max(500),
    }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const userEmail = (claims?.email as string | undefined) ?? null;

    const { data: row, error } = await supabase
      .from("anexos")
      .select("id, entidade_tipo, entidade_id, categoria, nome, tamanho, owner_id")
      .eq("id", data.anexoId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row)  throw new Error("Anexo não encontrado ou já excluído.");

    const { error: updErr } = await supabase
      .from("anexos")
      .update({
        deleted_at:     new Date().toISOString(),
        deleted_by:     userId,
        deleted_reason: data.motivo.trim(),
      })
      .eq("id", data.anexoId);
    if (updErr) throw new Error(`Falha ao excluir: ${updErr.message}`);

    await audit({
      anexo_id:      row.id,
      entidade_tipo: row.entidade_tipo,
      entidade_id:   row.entidade_id,
      categoria:     row.categoria,
      acao:          "DELETE",
      user_id:       userId,
      user_email:    userEmail,
      nome:          row.nome,
      tamanho:       row.tamanho,
      motivo:        data.motivo.trim(),
    });

    return { ok: true };
  });
