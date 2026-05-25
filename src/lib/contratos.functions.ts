// ServerFns para o módulo de contratos (Onda 1.5.B).
// Mantém arquivo "thin": apenas createServerFn + imports.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ContratoRow, ContratoUpsertPayload } from "./contratos-mapper";

const COLUMNS = "id, codigo, cliente_id, consultor_id, status, valor_total, valor_entrada, data_assinatura, data_inicio, data_fim, potencia_kwp, modulos_qtde, inversor, forma_pagamento, observacoes, dados, vendedor, comissao_pct, comissao_valor, possui_financiamento, financiamento_banco, financiamento_valor, financiamento_status, financiamento_liberado_eng, proposta_id, lead_id, assinado_aprovado, assinado_aprovado_em, assinado_aprovado_por, liberado_para_contrato, liberado_em, liberado_por, liberacao_obs, contrato_redigido, cancelado, motivo_cancelamento, created_at, updated_at, deleted_at";

export const listarContratos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("contratos")
      .select(COLUMNS)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ContratoRow[];
  });

const upsertSchema = z.object({
  codigo: z.string().min(1).max(40),
  cliente_id: z.string().uuid().nullable(),
  status: z.string().min(1).max(60),
  valor_total: z.number().min(0),
  valor_entrada: z.number().min(0),
  data_assinatura: z.string().nullable(),
  data_inicio: z.string().nullable(),
  potencia_kwp: z.number().nullable(),
  modulos_qtde: z.number().int().nullable(),
  inversor: z.string().nullable(),
  forma_pagamento: z.string().nullable(),
  observacoes: z.string().nullable(),
  vendedor: z.string().nullable(),
  comissao_pct: z.number().nullable(),
  comissao_valor: z.number().nullable(),
  possui_financiamento: z.boolean(),
  financiamento_banco: z.string().nullable(),
  financiamento_valor: z.number().nullable(),
  financiamento_status: z.string().nullable(),
  financiamento_liberado_eng: z.boolean(),
  proposta_id: z.string().uuid().nullable(),
  lead_id: z.string().uuid().nullable(),
  assinado_aprovado: z.boolean(),
  assinado_aprovado_em: z.string().nullable(),
  liberado_para_contrato: z.boolean(),
  liberado_em: z.string().nullable(),
  liberacao_obs: z.string().nullable(),
  contrato_redigido: z.boolean(),
  cancelado: z.boolean(),
  motivo_cancelamento: z.string().nullable(),
  dados: z.record(z.string(), z.unknown()),
});

export const upsertContratoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.cliente_id) {
      throw new Error("cliente_id obrigatório para subir contrato ao Supabase.");
    }
    const payload: Record<string, unknown> = {
      ...(data as ContratoUpsertPayload),
      consultor_id: userId,
    };
    const { data: row, error } = await supabase
      .from("contratos")
      .upsert(payload, { onConflict: "codigo" })
      .select("id, codigo")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, codigo: row.codigo as string };
  });

export const softDeleteContratoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      codigo: z.string().min(1).max(40),
      motivo: z.string().min(3).max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("contratos")
      .update({ deleted_at: new Date().toISOString(), deleted_reason: data.motivo, deleted_by: userId })
      .eq("codigo", data.codigo);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
