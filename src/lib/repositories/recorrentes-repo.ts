/**
 * D15.3.e — Repositório oficial de Despesas Recorrentes (Supabase).
 * Substitui qualquer leitura/escrita de metasun.fin.recorrentes.v1.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RecorrenteFinanceira {
  id: string;
  descricao: string;
  tipo: "Entrada" | "Saída";
  valor: number;
  periodicidade: "Mensal" | "Bimestral" | "Trimestral" | "Semestral" | "Anual";
  dia_vencimento: number;
  proximo_vencimento: string | null;
  natureza_id: string | null;
  centro_resultado_id: string | null;
  fornecedor_id: string | null;
  cliente_id: string | null;
  ativo: boolean;
  observacao: string | null;
  row_version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type NovoRecorrenteInput = Omit<
  RecorrenteFinanceira,
  "id" | "row_version" | "created_at" | "updated_at" | "deleted_at"
>;

export const recorrentesRepo = {
  async listar(filtroAtivo?: boolean): Promise<RecorrenteFinanceira[]> {
    let q = supabase
      .from("recorrentes_financeiras" as never)
      .select("*")
      .is("deleted_at", null)
      .order("descricao");
    if (typeof filtroAtivo === "boolean") q = q.eq("ativo", filtroAtivo);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as RecorrenteFinanceira[];
  },

  async criar(input: NovoRecorrenteInput): Promise<RecorrenteFinanceira> {
    const { data, error } = await supabase
      .from("recorrentes_financeiras" as never)
      .insert(input as never)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as RecorrenteFinanceira;
  },

  async atualizar(id: string, patch: Partial<NovoRecorrenteInput>): Promise<void> {
    const { error } = await supabase
      .from("recorrentes_financeiras" as never)
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
  },

  async toggleAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from("recorrentes_financeiras" as never)
      .update({ ativo } as never)
      .eq("id", id);
    if (error) throw error;
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase
      .from("recorrentes_financeiras" as never)
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw error;
  },
};

export function useRecorrentesSupabase(filtroAtivo?: boolean) {
  return useQuery({
    queryKey: ["recorrentes_financeiras", filtroAtivo ?? null],
    queryFn: () => recorrentesRepo.listar(filtroAtivo),
    staleTime: 30_000,
  });
}

export function useCriarRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NovoRecorrenteInput) => recorrentesRepo.criar(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recorrentes_financeiras"] }),
  });
}

export function useAtualizarRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NovoRecorrenteInput> }) =>
      recorrentesRepo.atualizar(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recorrentes_financeiras"] }),
  });
}

export function useToggleRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      recorrentesRepo.toggleAtivo(id, ativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recorrentes_financeiras"] }),
  });
}

export function useExcluirRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recorrentesRepo.excluir(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recorrentes_financeiras"] }),
  });
}
