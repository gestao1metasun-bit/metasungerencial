// Onda C-ENT.1 — Repositório oficial de Oportunidades.
// Toda leitura/escrita de oportunidades passa por aqui (charter D15: sem store LS).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/repositories/error-log-repo";

export type OportunidadeStatus =
  | "ABERTA"
  | "GANHA"
  | "PERDIDA"
  | "CANCELADA"
  | "ARQUIVADA";

export type OportunidadeRow = {
  id: string;
  codigo: string | null;
  cliente_id: string;
  nome: string;
  descricao: string | null;
  consultor_id: string | null;
  pipeline_etapa_id: string | null;
  valor_estimado: number | null;
  status: OportunidadeStatus;
  motivo_status: string | null;
  ultimo_contato: string | null;
  proxima_acao: string | null;
  proxima_acao_em: string | null;
  tags: string[] | null;
  observacoes: string | null;
  centro_resultado_id: string | null;
  centro_custo_id: string | null;
  natureza_id: string | null;
  competencia: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  row_version: number;
};

export type NovaOportunidadeInput = {
  cliente_id: string;
  nome: string;
  descricao?: string | null;
  consultor_id?: string | null;
  pipeline_etapa_id?: string | null;
  valor_estimado?: number | null;
  proxima_acao?: string | null;
  proxima_acao_em?: string | null;
  observacoes?: string | null;
};

const KEY = ["oportunidades"] as const;

export function useOportunidadesPorCliente(clienteId?: string | null) {
  return useQuery({
    queryKey: [...KEY, "by-cliente", clienteId ?? null],
    enabled: !!clienteId,
    queryFn: async (): Promise<OportunidadeRow[]> => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("*")
        .eq("cliente_id", clienteId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) {
        await logError({
          modulo: "comercial",
          codigo: "oportunidades.list_by_cliente",
          mensagem: error.message,
        });
        throw error;
      }
      return (data ?? []) as OportunidadeRow[];
    },
  });
}

export function useOportunidade(id?: string | null) {
  return useQuery({
    queryKey: [...KEY, "detail", id ?? null],
    enabled: !!id,
    queryFn: async (): Promise<OportunidadeRow | null> => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as OportunidadeRow | null) ?? null;
    },
  });
}

export function useCriarOportunidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovaOportunidadeInput) => {
      const { data, error } = await supabase
        .from("oportunidades")
        .insert({
          cliente_id: input.cliente_id,
          nome: input.nome.trim(),
          descricao: input.descricao ?? null,
          consultor_id: input.consultor_id ?? null,
          pipeline_etapa_id: input.pipeline_etapa_id ?? null,
          valor_estimado: input.valor_estimado ?? null,
          proxima_acao: input.proxima_acao ?? null,
          proxima_acao_em: input.proxima_acao_em ?? null,
          observacoes: input.observacoes ?? null,
          status: "ABERTA",
        })
        .select("*")
        .single();
      if (error) {
        await logError({
          modulo: "comercial",
          codigo: "oportunidades.criar",
          mensagem: error.message,
        });
        throw error;
      }
      return data as OportunidadeRow;
    },
    onSuccess: (row) => {
      toast.success(`Oportunidade "${row.nome}" criada.`);
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: any) => {
      toast.error(`Falha ao criar oportunidade: ${e?.message ?? e}`);
    },
  });
}

export function useAtualizarOportunidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      row_version: number;
      patch: Partial<
        Pick<
          OportunidadeRow,
          | "nome"
          | "descricao"
          | "consultor_id"
          | "pipeline_etapa_id"
          | "valor_estimado"
          | "ultimo_contato"
          | "proxima_acao"
          | "proxima_acao_em"
          | "tags"
          | "observacoes"
          | "centro_resultado_id"
          | "centro_custo_id"
          | "natureza_id"
          | "competencia"
        >
      >;
    }) => {
      const { data, error } = await supabase
        .from("oportunidades")
        .update(input.patch)
        .eq("id", input.id)
        .eq("row_version", input.row_version)
        .select("*")
        .single();
      if (error) {
        await logError({
          modulo: "comercial",
          codigo: "oportunidades.atualizar",
          mensagem: error.message,
        });
        throw error;
      }
      return data as OportunidadeRow;
    },
    onSuccess: () => {
      toast.success("Oportunidade atualizada.");
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: any) => {
      toast.error(`Falha ao atualizar: ${e?.message ?? e}`);
    },
  });
}

export function useCancelarOportunidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; motivo: string; row_version: number }) => {
      if (!input.motivo || input.motivo.trim().length < 5) {
        throw new Error("Motivo é obrigatório (mínimo 5 caracteres).");
      }
      const { data, error } = await supabase
        .from("oportunidades")
        .update({ status: "CANCELADA", motivo_status: input.motivo.trim() })
        .eq("id", input.id)
        .eq("row_version", input.row_version)
        .select("*")
        .single();
      if (error) {
        await logError({
          modulo: "comercial",
          codigo: "oportunidades.cancelar",
          mensagem: error.message,
        });
        throw error;
      }
      return data as OportunidadeRow;
    },
    onSuccess: () => {
      toast.success("Oportunidade cancelada.");
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: any) => {
      toast.error(`Falha ao cancelar: ${e?.message ?? e}`);
    },
  });
}
