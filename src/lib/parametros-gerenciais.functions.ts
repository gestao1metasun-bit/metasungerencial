import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarParametrosGerenciais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("gerencial_parametros")
      .select("id, chave, categoria, descricao, valor, setor, updated_at, updated_by")
      .order("categoria")
      .order("chave")
      .order("setor", { nullsFirst: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertParametroGerencial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      chave: z.string().min(1).max(80),
      setor: z.string().max(40).nullable().optional(),
      categoria: z.string().max(40).optional(),
      descricao: z.string().max(300).optional(),
      valor: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
      motivo: z.string().max(300).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const setor = data.setor && data.setor.length > 0 ? data.setor : null;

    // Fetch previous value (if any)
    let q = supabase
      .from("gerencial_parametros")
      .select("id, valor, categoria, descricao")
      .eq("chave", data.chave);
    q = setor === null ? q.is("setor", null) : q.eq("setor", setor);
    const { data: prev } = await q.maybeSingle();

    let upErr;
    if (prev) {
      const { error } = await supabase
        .from("gerencial_parametros")
        .update({
          valor: data.valor,
          categoria: data.categoria ?? prev.categoria,
          descricao: data.descricao ?? prev.descricao,
          updated_by: userId,
        })
        .eq("id", prev.id);
      upErr = error;
    } else {
      const { error } = await supabase
        .from("gerencial_parametros")
        .insert({
          chave: data.chave,
          setor,
          categoria: data.categoria ?? "geral",
          descricao: data.descricao ?? null,
          valor: data.valor,
          updated_by: userId,
        });
      upErr = error;
    }
    if (upErr) throw new Error(upErr.message);

    const { error: hErr } = await supabase
      .from("gerencial_parametros_historico")
      .insert({
        chave: data.chave,
        setor,
        categoria: data.categoria ?? null,
        descricao: data.descricao ?? null,
        valor_anterior: prev?.valor ?? null,
        valor_novo: data.valor,
        motivo: data.motivo ?? null,
        changed_by: userId,
        changed_by_email: (claims as any)?.email ?? null,
      });
    if (hErr) throw new Error(hErr.message);

    return { ok: true };
  });

// Backwards-compatible alias used by existing UI
export const atualizarParametroGerencial = upsertParametroGerencial;

export const removerParametroGerencial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      motivo: z.string().max(300).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: prev } = await supabase
      .from("gerencial_parametros")
      .select("chave, setor, categoria, descricao, valor")
      .eq("id", data.id)
      .maybeSingle();
    if (!prev) throw new Error("Parâmetro não encontrado.");

    const { error } = await supabase
      .from("gerencial_parametros")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("gerencial_parametros_historico").insert({
      chave: prev.chave,
      setor: prev.setor,
      categoria: prev.categoria,
      descricao: prev.descricao,
      valor_anterior: prev.valor,
      valor_novo: { _removed: true },
      motivo: data.motivo ?? "remoção",
      changed_by: userId,
      changed_by_email: (claims as any)?.email ?? null,
    });
    return { ok: true };
  });

export const listarHistoricoParametros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      chave: z.string().optional(),
      setor: z.string().nullable().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("gerencial_parametros_historico")
      .select("id, chave, setor, valor_anterior, valor_novo, motivo, changed_by_email, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.chave) q = q.eq("chave", data.chave);
    if (data.setor !== undefined) {
      q = data.setor === null ? q.is("setor", null) : q.eq("setor", data.setor);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const importarParametrosGerenciais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      itens: z.array(
        z.object({
          chave: z.string().min(1).max(80),
          setor: z.string().max(40).nullable().optional(),
          categoria: z.string().max(40).optional(),
          descricao: z.string().max(300).optional(),
          valor: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
        }),
      ).min(1).max(500),
      motivo: z.string().max(300).default("import"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email ?? null;
    let aplicados = 0;
    for (const it of data.itens) {
      const setor = it.setor && it.setor.length > 0 ? it.setor : null;
      let q = supabase
        .from("gerencial_parametros")
        .select("id, valor, categoria, descricao")
        .eq("chave", it.chave);
      q = setor === null ? q.is("setor", null) : q.eq("setor", setor);
      const { data: prev } = await q.maybeSingle();

      if (prev) {
        await supabase
          .from("gerencial_parametros")
          .update({
            valor: it.valor,
            categoria: it.categoria ?? prev.categoria,
            descricao: it.descricao ?? prev.descricao,
            updated_by: userId,
          })
          .eq("id", prev.id);
      } else {
        await supabase
          .from("gerencial_parametros")
          .insert({
            chave: it.chave,
            setor,
            categoria: it.categoria ?? "geral",
            descricao: it.descricao ?? null,
            valor: it.valor,
            updated_by: userId,
          });
      }
      await supabase.from("gerencial_parametros_historico").insert({
        chave: it.chave,
        setor,
        categoria: it.categoria ?? null,
        descricao: it.descricao ?? null,
        valor_anterior: prev?.valor ?? null,
        valor_novo: it.valor,
        motivo: data.motivo,
        changed_by: userId,
        changed_by_email: email,
      });
      aplicados++;
    }
    return { ok: true, aplicados };
  });
