// Server functions para anexos de títulos financeiros.
// Substitui base64-no-localStorage por Supabase Storage com auditoria.
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "anexos-titulos";
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/xml",
  "text/xml",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

function audit(payload: {
  anexo_id?: string | null;
  titulo_id?: string | null;
  acao: "UPLOAD" | "DOWNLOAD" | "DELETE";
  user_id: string;
  user_email?: string | null;
  nome?: string | null;
  tamanho?: number | null;
  detalhe?: string | null;
}) {
  let ip: string | null = null;
  let user_agent: string | null = null;
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? null;
    user_agent = getRequestHeader("user-agent") ?? null;
  } catch {
    /* fora de request */
  }
  // fire-and-forget: nunca falha o fluxo principal
  return supabaseAdmin
    .from("anexos_audit")
    .insert({ ...payload, ip, user_agent })
    .then(({ error }) => {
      if (error) console.error("[anexos_audit] insert error:", error.message);
    });
}

/* ============================================================
 * LISTAR anexos de um título (apenas os do próprio usuário ou admin)
 * ============================================================ */
export const listAnexosByTitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tituloId: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("anexos_titulos")
      .select("id, titulo_id, storage_path, nome, mime, tamanho, created_at, owner_id")
      .eq("titulo_id", data.tituloId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { anexos: rows ?? [] };
  });

/* ============================================================
 * UPLOAD — recebe FormData (file + tituloId)
 * ============================================================ */
export const uploadAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => {
    if (!(input instanceof FormData)) throw new Error("FormData esperado.");
    const file = input.get("file");
    const tituloId = input.get("tituloId");
    if (!(file instanceof File)) throw new Error("Arquivo ausente.");
    if (typeof tituloId !== "string" || !tituloId) throw new Error("tituloId ausente.");
    if (file.size <= 0) throw new Error("Arquivo vazio.");
    if (file.size > MAX_BYTES) throw new Error(`Arquivo excede 10 MB.`);
    if (!ALLOWED_MIME.has(file.type)) throw new Error(`Tipo não permitido: ${file.type}`);
    if (tituloId.length > 120 || !/^[\w.-]+$/.test(tituloId))
      throw new Error("tituloId inválido.");
    return { file, tituloId };
  })
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const userEmail = (claims?.email as string | undefined) ?? null;
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(data.file.name)}`;
    const path = `${userId}/${data.tituloId}/${filename}`;

    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.file.type, upsert: false });
    if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);

    const { data: meta, error: insErr } = await supabaseAdmin
      .from("anexos_titulos")
      .insert({
        owner_id: userId,
        titulo_id: data.tituloId,
        storage_path: path,
        nome: data.file.name,
        mime: data.file.type,
        tamanho: data.file.size,
      })
      .select("id, titulo_id, storage_path, nome, mime, tamanho, created_at, owner_id")
      .single();
    if (insErr) {
      // rollback do storage se metadado falhar
      await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {});
      throw new Error(`Falha ao registrar anexo: ${insErr.message}`);
    }

    await audit({
      anexo_id: meta.id,
      titulo_id: data.tituloId,
      acao: "UPLOAD",
      user_id: userId,
      user_email: userEmail,
      nome: meta.nome,
      tamanho: meta.tamanho,
    });

    return { anexo: meta };
  });

/* ============================================================
 * SIGNED URL — devolve link temporário (5 min) e audita DOWNLOAD
 * ============================================================ */
export const signedUrlAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ anexoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const userEmail = (claims?.email as string | undefined) ?? null;

    // O SELECT respeita RLS — só retorna se o usuário pode ver
    const { data: row, error } = await supabase
      .from("anexos_titulos")
      .select("id, storage_path, nome, tamanho, titulo_id")
      .eq("id", data.anexoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Anexo não encontrado ou sem permissão.");

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60 * 5, { download: row.nome });
    if (sErr || !signed) throw new Error(`Falha ao gerar link: ${sErr?.message ?? "?"}`);

    await audit({
      anexo_id: row.id,
      titulo_id: row.titulo_id,
      acao: "DOWNLOAD",
      user_id: userId,
      user_email: userEmail,
      nome: row.nome,
      tamanho: row.tamanho,
    });

    return { url: signed.signedUrl, nome: row.nome };
  });

/* ============================================================
 * DELETE — remove do storage + metadados, audita
 * ============================================================ */
export const deleteAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ anexoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const userEmail = (claims?.email as string | undefined) ?? null;

    const { data: row, error } = await supabase
      .from("anexos_titulos")
      .select("id, storage_path, nome, tamanho, titulo_id")
      .eq("id", data.anexoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Anexo não encontrado ou sem permissão.");

    // RLS já valida a permissão; o DELETE respeita-a
    const { error: delErr } = await supabase
      .from("anexos_titulos")
      .delete()
      .eq("id", data.anexoId);
    if (delErr) throw new Error(`Falha ao excluir metadados: ${delErr.message}`);

    await supabaseAdmin.storage.from(BUCKET).remove([row.storage_path]).catch((e) =>
      console.error("[anexos] storage remove:", e),
    );

    await audit({
      anexo_id: row.id,
      titulo_id: row.titulo_id,
      acao: "DELETE",
      user_id: userId,
      user_email: userEmail,
      nome: row.nome,
      tamanho: row.tamanho,
    });

    return { ok: true };
  });
