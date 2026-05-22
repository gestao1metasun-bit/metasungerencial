import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODULOS = ["contratos", "aditivos", "obras", "projetos", "clientes"] as const;

export const listarVersoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      entidade: z.enum(MODULOS),
      entidade_id: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("entidade_versoes")
      .select("id, versao, snapshot, motivo, user_email, created_at")
      .eq("entidade", data.entidade)
      .eq("entidade_id", data.entidade_id)
      .order("versao", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const softDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      modulo: z.enum(MODULOS),
      id: z.string().uuid(),
      motivo: z.string().min(3).max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("soft_delete_entidade", {
      _modulo: data.modulo,
      _id: data.id,
      _motivo: data.motivo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restaurarRegistro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      modulo: z.enum(MODULOS),
      id: z.string().uuid(),
      motivo: z.string().min(3).max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("restore_entidade", {
      _modulo: data.modulo,
      _id: data.id,
      _motivo: data.motivo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarLixeira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ modulo: z.enum(MODULOS) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from(data.modulo)
      .select("id, deleted_at, deleted_reason, deleted_by")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
