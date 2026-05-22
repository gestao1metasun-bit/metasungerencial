import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarTarefas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      status: z.enum(["pendente", "em_andamento", "concluida", "todas"]).default("pendente"),
      modulo: z.string().optional(),
      apenasMinhas: z.boolean().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("tarefas")
      .select("id, titulo, descricao, modulo, prioridade, status, due_date, assigned_to, sector, related_entity, related_id, origem, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status !== "todas") q = q.eq("status", data.status);
    if (data.modulo) q = q.eq("modulo", data.modulo);
    if (data.apenasMinhas) q = q.eq("assigned_to", userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const criarTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      titulo: z.string().min(2).max(200),
      descricao: z.string().max(2000).optional(),
      modulo: z.string().min(1).max(40),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
      due_date: z.string().nullable().optional(),
      assigned_to: z.string().uuid().nullable().optional(),
      sector: z.string().max(40).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("tarefas").insert({
      ...data,
      created_by: userId,
      origem: "manual",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const concluirTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("tarefas")
      .update({ status: "concluida", completed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const gerarTarefasAutomaticas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("gerar_tarefas_automaticas");
    if (error) throw new Error(error.message);
    return data ?? {};
  });
