// Server functions para ler a auditoria universal (public.audit_log) gravada
// automaticamente pelos triggers tg_audit_row().
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditDbEntry = {
  id: string;
  modulo: string;
  entidade: string;
  entidadeId: string;
  acao: string;
  campo: string | null;
  valorAnterior: unknown;
  valorNovo: unknown;
  motivo: string | null;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  createdAt: string;
};

const EntityInput = z.object({
  entidade: z.string().min(1).max(64),
  entidadeId: z.string().min(1).max(64),
  limit: z.number().int().min(1).max(500).optional(),
});

export const getAuditByEntity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => EntityInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select(
        "id, modulo, entidade, entidade_id, acao, campo, valor_anterior, valor_novo, motivo, user_id, user_email, ip, created_at",
      )
      .eq("entidade", data.entidade)
      .eq("entidade_id", data.entidadeId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);

    if (error) throw new Error(error.message);

    return (rows ?? []).map<AuditDbEntry>((r) => ({
      id: r.id,
      modulo: r.modulo,
      entidade: r.entidade,
      entidadeId: r.entidade_id,
      acao: r.acao,
      campo: r.campo,
      valorAnterior: r.valor_anterior,
      valorNovo: r.valor_novo,
      motivo: r.motivo,
      userId: r.user_id,
      userEmail: r.user_email,
      ip: r.ip,
      createdAt: r.created_at,
    }));
  });
