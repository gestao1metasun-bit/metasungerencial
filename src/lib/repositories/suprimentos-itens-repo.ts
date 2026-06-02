/**
 * D20.SUP.6 — Catálogo unificado de Itens & Serviços (extensão de `produtos`).
 *
 * Apenas leitura/escrita direta na tabela `produtos` (com RLS já existente).
 * Regras de consistência (SERVICO ⇒ controla_estoque=false) são forçadas
 * pelo trigger `tg_produto_consistencia_tipo`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ItemTipo = "MATERIAL" | "SERVICO";

export type CatalogoItem = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo_item: ItemTipo;
  unidade: string | null;
  categoria: string | null;
  subcategoria: string | null;
  ativo: boolean;
  controla_estoque: boolean;
  exige_fornecedor: boolean;
  valor_referencia: number | null;
  natureza_padrao_id: string | null;
  centro_custo_padrao_id: string | null;
  centro_resultado_padrao_id: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

const KEY = "suprimentos-itens-catalogo";

export function useCatalogoItens(filters?: {
  search?: string;
  tipo?: ItemTipo | "TODOS";
  ativo?: boolean | "TODOS";
}) {
  return useQuery({
    queryKey: [KEY, "list", filters ?? {}],
    queryFn: async () => {
      let q = supabase
        .from("produtos")
        .select(
          "id, codigo, nome, descricao, tipo_item, unidade, categoria, subcategoria, ativo, controla_estoque, exige_fornecedor, valor_referencia, natureza_padrao_id, centro_custo_padrao_id, centro_resultado_padrao_id, observacao, created_at, updated_at"
        )
        .is("deleted_at", null)
        .order("codigo", { ascending: true })
        .limit(1000);
      if (filters?.tipo && filters.tipo !== "TODOS") q = q.eq("tipo_item", filters.tipo);
      if (typeof filters?.ativo === "boolean") q = q.eq("ativo", filters.ativo);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as CatalogoItem[];
      const s = (filters?.search ?? "").trim().toLowerCase();
      if (s) {
        rows = rows.filter((r) =>
          [r.codigo, r.nome, r.descricao, r.categoria, r.subcategoria]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(s))
        );
      }
      return rows;
    },
    staleTime: 60_000,
  });
}

/** Catálogo usado pelos pickers (filtro por tipo + somente ativos). */
export function useCatalogoPorTipo(tipo: ItemTipo) {
  return useQuery({
    queryKey: [KEY, "por-tipo", tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, nome, unidade, tipo_item, controla_estoque, valor_referencia")
        .is("deleted_at", null)
        .eq("ativo", true)
        .eq("tipo_item", tipo)
        .order("codigo")
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; codigo: string; nome: string; unidade: string | null;
        tipo_item: ItemTipo; controla_estoque: boolean; valor_referencia: number | null;
      }>;
    },
    staleTime: 60_000,
  });
}

export type ItemUpsertPayload = {
  id?: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo_item: ItemTipo;
  unidade?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  ativo?: boolean;
  controla_estoque?: boolean;
  exige_fornecedor?: boolean;
  valor_referencia?: number | null;
  natureza_padrao_id?: string | null;
  centro_custo_padrao_id?: string | null;
  centro_resultado_padrao_id?: string | null;
  observacao?: string | null;
};

export function useUpsertItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: ItemUpsertPayload) => {
      if (p.id) {
        const { id, ...rest } = p;
        const { error } = await supabase.from("produtos").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("produtos")
        .insert({ ...p, ativo: p.ativo ?? true })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useToggleAtivoItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("produtos")
        .update({ ativo: args.ativo })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
