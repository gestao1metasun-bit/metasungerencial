import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarParametrosGerenciais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("gerencial_parametros")
      .select("id, chave, categoria, descricao, valor, updated_at")
      .order("categoria")
      .order("chave");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const atualizarParametroGerencial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      chave: z.string().min(1).max(80),
      valor: z.record(z.string(), z.number()),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("gerencial_parametros")
      .update({ valor: data.valor, updated_by: userId })
      .eq("chave", data.chave);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
