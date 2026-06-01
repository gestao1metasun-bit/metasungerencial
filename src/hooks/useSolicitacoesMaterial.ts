// ============================================================================
// D5.3 — Hook reativo de Solicitações de Material / Ordens de Compra.
// Toda escrita passa pelas RPCs oficiais (criar_solicitacao_material,
// enviar_solicitacao_material, registrar_cotacao, escolher_cotacao,
// receber_ordem_compra, cancelar_solicitacao_material).
// Backend / RLS / workflow não são alterados aqui.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withPerf } from "@/lib/perf";
import { toast } from "sonner";

export type SolicitacaoStatus =
  | "RASCUNHO" | "PENDENTE_APROVACAO_SETOR" | "NEGADA_SETOR" | "CANCELADA"
  | "ATENDIDA_ESTOQUE" | "AGUARDANDO_COMPRA" | "CONCLUIDA";

export const SM_STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  RASCUNHO: "Rascunho",
  PENDENTE_APROVACAO_SETOR: "Aguardando setor",
  NEGADA_SETOR: "Negada",
  CANCELADA: "Cancelada",
  ATENDIDA_ESTOQUE: "Atendida (estoque)",
  AGUARDANDO_COMPRA: "Aguardando compra",
  CONCLUIDA: "Concluída",
};

export const SM_STATUS_TONE: Record<SolicitacaoStatus, string> = {
  RASCUNHO: "bg-slate-100 text-slate-700 border-slate-300",
  PENDENTE_APROVACAO_SETOR: "bg-amber-100 text-amber-900 border-amber-300",
  NEGADA_SETOR: "bg-rose-100 text-rose-900 border-rose-300",
  CANCELADA: "bg-zinc-100 text-zinc-700 border-zinc-300",
  ATENDIDA_ESTOQUE: "bg-emerald-100 text-emerald-900 border-emerald-300",
  AGUARDANDO_COMPRA: "bg-blue-100 text-blue-900 border-blue-300",
  CONCLUIDA: "bg-emerald-200 text-emerald-950 border-emerald-400",
};

export type SolicitacaoMaterial = {
  id: string;
  codigo: string | null;
  solicitante_id: string;
  solicitante_email: string | null;
  setor: string | null;
  obra_id: string | null;
  motivo: string | null;
  prioridade: string;
  status: SolicitacaoStatus;
  valor_estimado: number;
  workflow_setor_id: string | null;
  motivo_negacao: string | null;
  motivo_cancelamento: string | null;
  concluido_em: string | null;
  created_at: string;
};

export type SolicitacaoItem = {
  id: string;
  solicitacao_id: string;
  produto_id: string;
  quantidade_solicitada: number;
  quantidade_reservada: number;
  quantidade_a_comprar: number;
  custo_unitario_estimado: number;
  reserva_id: string | null;
  observacao: string | null;
};

export type OrdemCompra = {
  id: string;
  codigo: string | null;
  solicitacao_id: string | null;
  status: "COTACAO" | "AGUARDANDO_APROVACAO_FIN" | "APROVADA" | "NEGADA" | "RECEBIDA" | "CANCELADA";
  fornecedor_nome: string | null;
  valor_total: number;
  prazo_entrega_dias: number | null;
  cotacao_escolhida_id: string | null;
  created_at: string;
};

export function useSolicitacoesMaterial() {
  return useQuery({
    queryKey: ["solicitacoes_material"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_material" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoMaterial[];
    },
  });
}

export function useSolicitacaoDetalhe(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: ["solicitacao_material", id],
    queryFn: async () => {
      const [solRes, itRes, ocRes] = await Promise.all([
        supabase.from("solicitacoes_material" as never).select("*").eq("id", id!).single(),
        supabase.from("solicitacao_material_itens" as never).select("*, produtos(nome,codigo,unidade)").eq("solicitacao_id", id!),
        supabase.from("ordens_compra" as never).select("*").eq("solicitacao_id", id!).order("created_at", { ascending: false }),
      ]);
      if (solRes.error) throw solRes.error;
      return {
        solicitacao: solRes.data as unknown as SolicitacaoMaterial,
        itens: (itRes.data ?? []) as unknown as (SolicitacaoItem & { produtos: { nome: string; codigo: string; unidade: string } })[],
        ordens: (ocRes.data ?? []) as unknown as OrdemCompra[],
      };
    },
  });
}

export function useCriarSolicitacaoMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      setor: string;
      motivo: string;
      obra_id?: string | null;
      prioridade?: string;
      itens: { produto_id: string; quantidade: number; observacao?: string }[];
    }) => {
      const { data, error } = await withPerf("rpc.criar_solicitacao_material", () => supabase.rpc("criar_solicitacao_material" as never, {
        _setor: input.setor,
        _motivo: input.motivo,
        _obra_id: input.obra_id ?? null,
        _itens: input.itens,
        _prioridade: input.prioridade ?? "NORMAL",
      } as never));
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_material"] });
      toast.success("Solicitação criada como rascunho");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
}

export function useEnviarSolicitacaoMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withPerf("rpc.enviar_solicitacao_material", () => supabase.rpc("enviar_solicitacao_material" as never, { _id: id } as never));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_material"] });
      qc.invalidateQueries({ queryKey: ["workflow_aprovacoes"] });
      toast.success("Solicitação enviada para aprovação do setor");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
}

export function useCancelarSolicitacaoMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await withPerf("rpc.cancelar_solicitacao_material", () => supabase.rpc("cancelar_solicitacao_material" as never, { _id: id, _motivo: motivo } as never));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_material"] });
      toast.success("Solicitação cancelada");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
}

export function useRegistrarCotacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ordem_id: string; fornecedor: string; doc?: string;
      valor: number; prazo_dias?: number; validade_dias?: number; obs?: string; anexo?: string;
    }) => {
      const { error } = await withPerf("rpc.registrar_cotacao", () => supabase.rpc("registrar_cotacao" as never, {
        _ordem_id: input.ordem_id,
        _fornecedor: input.fornecedor,
        _doc: input.doc ?? null,
        _valor: input.valor,
        _prazo_dias: input.prazo_dias ?? null,
        _validade_dias: input.validade_dias ?? null,
        _obs: input.obs ?? null,
        _anexo: input.anexo ?? null,
      } as never));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacao_material"] });
      qc.invalidateQueries({ queryKey: ["cotacoes_compra"] });
      toast.success("Cotação registrada");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
}

export function useEscolherCotacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cotacao_id: string) => {
      const { error } = await withPerf("rpc.escolher_cotacao", () => supabase.rpc("escolher_cotacao" as never, { _cotacao_id: cotacao_id } as never));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacao_material"] });
      qc.invalidateQueries({ queryKey: ["workflow_aprovacoes"] });
      toast.success("Cotação escolhida — aprovação financeira solicitada");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
}

export function useReceberOrdemCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordem_id: string) => {
      const { error } = await withPerf("rpc.receber_ordem_compra", () => supabase.rpc("receber_ordem_compra" as never, { _ordem_id: ordem_id, _recebimentos: null } as never));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_material"] });
      qc.invalidateQueries({ queryKey: ["solicitacao_material"] });
      toast.success("Ordem recebida — estoque atualizado");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
}

export function useCotacoesOrdem(ordem_id: string | null) {
  return useQuery({
    enabled: !!ordem_id,
    queryKey: ["cotacoes_compra", ordem_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes_compra" as never)
        .select("*")
        .eq("ordem_id", ordem_id!)
        .order("registrado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as Array<{
        id: string; ordem_id: string; fornecedor_nome: string; valor_total: number;
        prazo_entrega_dias: number | null; status: "ATIVA" | "ESCOLHIDA" | "DESCARTADA";
        registrado_em: string; observacoes: string | null;
      }>;
    },
  });
}
