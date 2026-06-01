// D15 Onda 2 — Repositório oficial dos cadastros canônicos no Supabase.
// Fonte de verdade: tabelas em `public`. Substitui leituras residuais de LS
// para os 9 cadastros do escopo (clientes/fornecedores/contas/centros/
// naturezas/grupos/subgrupos/meios/tipos_aplicacao).
//
// Os stores LS (src/lib/fin-*.ts, src/lib/clientes-store.ts) continuam
// existindo como cache local/fallback de UI legada e serão removidos nas
// ondas finais (Onda 10 — corte LS). Nenhuma escrita nova deve passar por LS.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ===== Tipos canônicos =====
export type GrupoFinanceiroRow = {
  id: string; codigo: string; nome: string; tipo: string; ativo: boolean;
};
export type SubgrupoFinanceiroRow = {
  id: string; grupo_id: string; codigo: string; nome: string; ativo: boolean;
};
export type MeioPagamentoRow = {
  id: string; codigo: string; nome: string; tipo: string; ativo: boolean;
};
export type TipoAplicacaoRow = {
  id: string; codigo: string; nome: string; pos_venda: boolean; ativo: boolean;
};
export type NaturezaRow = {
  id: string; codigo: string; nome: string; tipo: string;
  grupo: string | null; subgrupo: string | null; ativo: boolean;
};
export type CentroResultadoRow = {
  id: string; codigo: string; nome: string; tipo: string; ativo: boolean;
};
export type ContaFinanceiraRow = {
  id: string; codigo: string; nome: string; tipo: string;
  banco: string | null; agencia: string | null; conta: string | null;
  saldo_inicial: number; ativo: boolean;
};
export type FornecedorRow = {
  id: string; nome: string; tipo_pessoa: string; documento: string | null; codigo: string | null;
};
export type ClienteRow = {
  id: string; nome: string; doc: string | null; telefone: string | null;
  cidade: string | null; uf: string | null; status: string;
};

// D19.2.P0 — cadastros auxiliares mudam pouco; cache agressivo evita
// recarregamento a cada troca de tela (impacto direto em module.switch
// e first-list.ready). 5min staleTime + 30min gcTime.
const TTL = 5 * 60_000;
const GC = 30 * 60_000;
function opts<T>(key: string, fn: () => Promise<T>) {
  return {
    queryKey: ["cadastros", key] as const,
    queryFn: fn,
    staleTime: TTL,
    gcTime: GC,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  };
}

// ===== Hooks =====
export const useGruposFin = () =>
  useQuery<GrupoFinanceiroRow[]>(opts("grupos", async () => {
    const { data, error } = await supabase
      .from("grupos_financeiros").select("*").order("codigo");
    if (error) throw error;
    return (data ?? []) as GrupoFinanceiroRow[];
  }));

export const useSubgruposFin = () =>
  useQuery<SubgrupoFinanceiroRow[]>(opts("subgrupos", async () => {
    const { data, error } = await supabase
      .from("subgrupos_financeiros").select("*").order("codigo");
    if (error) throw error;
    return (data ?? []) as SubgrupoFinanceiroRow[];
  }));

export const useMeiosPagamento = () =>
  useQuery<MeioPagamentoRow[]>(opts("meios", async () => {
    const { data, error } = await supabase
      .from("meios_pagamento").select("*").order("codigo");
    if (error) throw error;
    return (data ?? []) as MeioPagamentoRow[];
  }));

export const useTiposAplicacao = () =>
  useQuery<TipoAplicacaoRow[]>(opts("tipos_app", async () => {
    const { data, error } = await supabase
      .from("tipos_aplicacao").select("*").order("codigo");
    if (error) throw error;
    return (data ?? []) as TipoAplicacaoRow[];
  }));

export const useNaturezasFin = () =>
  useQuery<NaturezaRow[]>(opts("naturezas", async () => {
    const { data, error } = await supabase
      .from("naturezas_financeiras").select("*").order("codigo");
    if (error) throw error;
    return (data ?? []) as NaturezaRow[];
  }));

export const useCentrosResultado = () =>
  useQuery<CentroResultadoRow[]>(opts("centros", async () => {
    const { data, error } = await supabase
      .from("centros_resultado").select("*").order("codigo");
    if (error) throw error;
    return (data ?? []) as CentroResultadoRow[];
  }));

export const useContasFinanceirasOficiais = () =>
  useQuery<ContaFinanceiraRow[]>(opts("contas", async () => {
    const { data, error } = await supabase
      .from("contas_financeiras").select("*").order("codigo");
    if (error) throw error;
    return (data ?? []) as ContaFinanceiraRow[];
  }));

export const useFornecedoresOficiais = () =>
  useQuery<FornecedorRow[]>(opts("fornecedores", async () => {
    const { data, error } = await supabase
      .from("fornecedores").select("id,nome,tipo_pessoa,documento,codigo").order("nome");
    if (error) throw error;
    return (data ?? []) as FornecedorRow[];
  }));

export const useClientesOficiais = () =>
  useQuery<ClienteRow[]>(opts("clientes", async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,doc,telefone,cidade,uf,status")
      .is("deleted_at", null)
      .order("nome");
    if (error) throw error;
    return (data ?? []) as ClienteRow[];
  }));

// Atalho para uso fora de componentes (validações, server-only).
export const cadastrosRepo = {
  grupos: () => supabase.from("grupos_financeiros").select("*"),
  subgrupos: () => supabase.from("subgrupos_financeiros").select("*"),
  meios: () => supabase.from("meios_pagamento").select("*"),
  tiposAplicacao: () => supabase.from("tipos_aplicacao").select("*"),
  naturezas: () => supabase.from("naturezas_financeiras").select("*"),
  centros: () => supabase.from("centros_resultado").select("*"),
  contas: () => supabase.from("contas_financeiras").select("*"),
  fornecedores: () => supabase.from("fornecedores").select("*"),
  clientes: () => supabase.from("clientes").select("*").is("deleted_at", null),
};
