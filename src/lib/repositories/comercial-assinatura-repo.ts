/**
 * Onda C5 — Repositório de Assinatura Enterprise de Contrato.
 *
 * Toda assinatura passa por `rpc_contrato_assinar` (SECURITY DEFINER).
 * Não há, nem deve haver, UPDATE direto nas colunas `assinado*` /
 * `liberado_para_*` / `pendente_*` — trigger bloqueia.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AssinaturaEvento = {
  id: string;
  contrato_id: string;
  assinado_por: string;
  assinado_em: string;
  permissao_usada: string;
  observacao: string | null;
  ip_origem: string | null;
  user_agent: string | null;
  hash_evento: string | null;
  dispatched_eng: boolean;
  dispatched_fin: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function useAssinaturaEventos(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["assinatura-eventos", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_assinatura_eventos" as never)
        .select("*")
        .eq("contrato_id", contratoId!)
        .order("assinado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AssinaturaEvento[];
    },
  });
}

export function useAssinarContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contratoId: string;
      observacao?: string;
      ip?: string;
      userAgent?: string;
      rowVersion?: number;
    }) => {
      const ua =
        input.userAgent ??
        (typeof navigator !== "undefined" ? navigator.userAgent : null);
      const { data, error } = await supabase.rpc(
        "rpc_contrato_assinar" as never,
        {
          p_contrato_id: input.contratoId,
          p_observacao: input.observacao ?? null,
          p_ip: input.ip ?? null,
          p_user_agent: ua,
          p_row_version: input.rowVersion ?? null,
        } as never,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: (_eventoId, vars) => {
      toast.success("Contrato assinado. Engenharia e Financeiro notificados.");
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["assinatura-eventos", vars.contratoId] });
    },
    onError: (e: Error) => toast.error(`Falha ao assinar: ${e.message}`),
  });
}

export function useMarcarEngenhariaLiberada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contratoId: string; observacao?: string }) => {
      const { data, error } = await supabase.rpc(
        "rpc_contrato_marcar_engenharia_liberada" as never,
        { p_contrato_id: input.contratoId, p_observacao: input.observacao ?? null } as never,
      );
      if (error) throw error;
      return data as unknown as boolean;
    },
    onSuccess: () => {
      toast.success("Engenharia liberada.");
      qc.invalidateQueries({ queryKey: ["contratos"] });
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });
}

export function useMarcarFinanceiroLiberado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contratoId: string; observacao?: string }) => {
      const { data, error } = await supabase.rpc(
        "rpc_contrato_marcar_financeiro_liberado" as never,
        { p_contrato_id: input.contratoId, p_observacao: input.observacao ?? null } as never,
      );
      if (error) throw error;
      return data as unknown as boolean;
    },
    onSuccess: () => {
      toast.success("Financeiro liberado.");
      qc.invalidateQueries({ queryKey: ["contratos"] });
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });
}
