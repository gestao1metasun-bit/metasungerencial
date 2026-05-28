/**
 * D15.3.d — Repositório oficial de Fornecedores (Supabase)
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./error-log-repo";

export interface Fornecedor {
  id: string;
  codigo: string | null;
  nome: string;
  tipo_pessoa: "PJ" | "PF";
  documento: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  pix_chave: string | null;
  observacoes: string | null;
  ativo: boolean;
  banco_id: string | null;
  banco_agencia: string | null;
  banco_conta: string | null;
  row_version: number;
  created_at: string;
  updated_at: string;
}

const QK = ["fornecedores-supabase"] as const;

export function useFornecedoresSupabase(opts?: { ativo?: boolean }) {
  return useQuery({
    queryKey: [...QK, opts?.ativo ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("fornecedores")
        .select("*")
        .is("deleted_at", null)
        .order("nome", { ascending: true })
        .limit(1000);
      if (opts?.ativo !== undefined) q = q.eq("ativo", opts.ativo);
      const { data, error } = await q;
      if (error) {
        await logError("fornecedores.list", error.message, { opts });
        throw error;
      }
      return (data ?? []) as Fornecedor[];
    },
    staleTime: 30_000,
  });
}

export function useUpsertFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Fornecedor> & { nome: string }) => {
      const payload = {
        ...input,
        tipo_pessoa: input.tipo_pessoa ?? "PJ",
        ativo: input.ativo ?? true,
      };
      const { data, error } = await supabase
        .from("fornecedores")
        .upsert(payload as never)
        .select()
        .single();
      if (error) {
        await logError("fornecedores.upsert", error.message, { payload });
        throw error;
      }
      return data as Fornecedor;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useSoftDeleteFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from("fornecedores")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: motivo,
          ativo: false,
        })
        .eq("id", id);
      if (error) {
        await logError("fornecedores.delete", error.message, { id });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
