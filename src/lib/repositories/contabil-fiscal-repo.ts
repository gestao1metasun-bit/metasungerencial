// D19 Camada Contábil/Fiscal Preparatória — UI repo
// Lê/escreve diretamente as tabelas D18 já entregues (plano_contas,
// centros_custo, mapeamentos_contabeis, *_eventos_catalogo, produtos
// fiscais, exportadores_externos, exportacoes_geradas, lotes_integracao_contabil).
// Não altera schema, RLS, RPCs ou regras. Escrita é admin-only via policies
// existentes (D18.2/D18.6/D18.7/D18.8).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TTL = 60_000;
const GC = 10 * 60_000;
const baseOpts = { staleTime: TTL, gcTime: GC, refetchOnWindowFocus: false, refetchOnReconnect: false };

// ============ Plano de Contas ============
export type PlanoContaRow = {
  id: string; codigo: string; nome: string; tipo: string;
  nivel: number; pai_id: string | null; natureza_id: string | null;
  categoria: string | null; retencao_padrao_pct: number | null;
  status_integracao: string; codigo_externo: string | null;
  ativo: boolean; created_at: string; updated_at: string;
};

export function usePlanoContas() {
  return useQuery<PlanoContaRow[]>({
    queryKey: ["contabil", "plano-contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_contas").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as PlanoContaRow[];
    },
    ...baseOpts,
  });
}

export function useSavePlanoConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PlanoContaRow> & { codigo: string; nome: string; tipo: string }) => {
      const payload: any = {
        codigo: row.codigo,
        nome: row.nome,
        tipo: row.tipo,
        nivel: row.nivel ?? 1,
        pai_id: row.pai_id ?? null,
        natureza_id: row.natureza_id ?? null,
        categoria: row.categoria ?? null,
        retencao_padrao_pct: row.retencao_padrao_pct ?? null,
        ativo: row.ativo ?? true,
      };
      if (row.id) {
        const { error } = await supabase.from("plano_contas").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plano_contas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contabil", "plano-contas"] }),
  });
}

// ============ Centros de Custo ============
export type CentroCustoRow = {
  id: string; codigo: string; nome: string; tipo: string;
  area_default: string | null; observacoes: string | null;
  ativo: boolean; status_integracao: string;
};

export function useCentrosCusto() {
  return useQuery<CentroCustoRow[]>({
    queryKey: ["contabil", "centros-custo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centros_custo").select("*").is("deleted_at", null).order("codigo");
      if (error) throw error;
      return (data ?? []) as CentroCustoRow[];
    },
    ...baseOpts,
  });
}

export function useSaveCentroCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<CentroCustoRow> & { codigo: string; nome: string; tipo: string }) => {
      const payload: any = {
        codigo: row.codigo,
        nome: row.nome,
        tipo: row.tipo,
        area_default: row.area_default ?? null,
        observacoes: row.observacoes ?? null,
        ativo: row.ativo ?? true,
      };
      if (row.id) {
        const { error } = await supabase.from("centros_custo").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("centros_custo").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contabil", "centros-custo"] }),
  });
}

// ============ Mapeamentos Contábeis ============
export type MapeamentoRow = {
  id: string; natureza_id: string | null; evento_canonico: string;
  plano_conta_id: string | null; centro_resultado_default_id: string | null;
  observacoes: string | null; ativo: boolean; status_integracao: string;
};

export const EVENTOS_CANONICOS = [
  "VENDA","RECEBIMENTO","PAGAMENTO","COMPRA","ENTRADA_ESTOQUE","SAIDA_ESTOQUE",
  "COMISSAO","SERVICO_OBRA","EMPRESTIMO","APORTE","RENEGOCIACAO","RESCISAO","OPERACAO_FINANCEIRA",
] as const;

export function useMapeamentos() {
  return useQuery<MapeamentoRow[]>({
    queryKey: ["contabil", "mapeamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mapeamentos_contabeis").select("*").order("evento_canonico");
      if (error) throw error;
      return (data ?? []) as MapeamentoRow[];
    },
    ...baseOpts,
  });
}

export function useSaveMapeamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<MapeamentoRow> & { evento_canonico: string }) => {
      const payload: any = {
        natureza_id: row.natureza_id ?? null,
        evento_canonico: row.evento_canonico,
        plano_conta_id: row.plano_conta_id ?? null,
        centro_resultado_default_id: row.centro_resultado_default_id ?? null,
        observacoes: row.observacoes ?? null,
        ativo: row.ativo ?? true,
      };
      if (row.id) {
        const { error } = await supabase.from("mapeamentos_contabeis").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mapeamentos_contabeis").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contabil", "mapeamentos"] }),
  });
}

// ============ Eventos canônicos (catálogo unificado) ============
export type EventoCatalogoRow = {
  modulo: string; codigo: string; descricao: string;
  evento_canonico: string; ativo: boolean;
};

export function useEventosCatalogo() {
  return useQuery<EventoCatalogoRow[]>({
    queryKey: ["contabil", "eventos-catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_eventos_canonicos_catalogo").select("*").order("modulo").order("codigo");
      if (error) throw error;
      return (data ?? []) as EventoCatalogoRow[];
    },
    ...baseOpts,
  });
}

// ============ Produtos Fiscais ============
export type ProdutoFiscalRow = {
  id: string; codigo: string; nome: string; categoria: string | null;
  tipo_item: string; unidade: string; ncm: string | null; cfop_padrao: string | null;
  cst_padrao: string | null; origem_fiscal: string | null;
  codigo_servico_lc116: string | null; categoria_contabil: string | null;
  ativo: boolean; status_integracao: string;
};

export function useProdutosFiscais() {
  return useQuery<ProdutoFiscalRow[]>({
    queryKey: ["contabil", "produtos-fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id,codigo,nome,categoria,tipo_item,unidade,ncm,cfop_padrao,cst_padrao,origem_fiscal,codigo_servico_lc116,categoria_contabil,ativo,status_integracao")
        .is("deleted_at", null).order("codigo");
      if (error) throw error;
      return (data ?? []) as ProdutoFiscalRow[];
    },
    ...baseOpts,
  });
}

export function useSaveProdutoFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; ncm?: string | null; cfop_padrao?: string | null; cst_padrao?: string | null; origem_fiscal?: string | null; codigo_servico_lc116?: string | null; categoria_contabil?: string | null; }) => {
      const { id, ...rest } = row;
      const { error } = await supabase.from("produtos").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contabil", "produtos-fiscais"] }),
  });
}

// ============ Exportadores / Layouts ============
export type ExportadorRow = {
  id: string; codigo: string; nome: string; sistema_destino: string;
  ambiente: string; ativo: boolean;
};

export function useExportadores() {
  return useQuery<ExportadorRow[]>({
    queryKey: ["contabil", "exportadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exportadores_externos")
        .select("id,codigo,nome,sistema_destino,ambiente,ativo")
        .order("codigo");
      if (error) throw error;
      return (data ?? []) as ExportadorRow[];
    },
    ...baseOpts,
  });
}

// ============ Logs (lotes + exportações geradas) ============
export type LoteIntegracaoRow = {
  id: string; codigo: string; tipo_lote: string; status: string;
  competencia: string | null; sistema_destino: string | null;
  total_registros: number; total_partidas: number;
  data_geracao: string; data_exportacao: string | null; data_integracao: string | null;
  created_by: string | null;
};

export function useLotesIntegracao() {
  return useQuery<LoteIntegracaoRow[]>({
    queryKey: ["contabil", "lotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes_integracao_contabil")
        .select("id,codigo,tipo_lote,status,competencia,sistema_destino,total_registros,total_partidas,data_geracao,data_exportacao,data_integracao,created_by")
        .order("data_geracao", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as LoteIntegracaoRow[];
    },
    ...baseOpts,
  });
}

export type ExportacaoGeradaRow = {
  id: string; exportador_id: string; lote_id: string | null;
  categoria: string; competencia: string | null;
  total_registros: number; status: string; ambiente: string;
  mensagem: string | null; gerado_por: string | null; created_at: string;
};

export function useExportacoesGeradas() {
  return useQuery<ExportacaoGeradaRow[]>({
    queryKey: ["contabil", "exportacoes-geradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exportacoes_geradas")
        .select("id,exportador_id,lote_id,categoria,competencia,total_registros,status,ambiente,mensagem,gerado_por,created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as ExportacaoGeradaRow[];
    },
    ...baseOpts,
  });
}


// ============ Exportação CSV client-side (sem API) ============
export function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.join(";")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(";"));
  return lines.join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
