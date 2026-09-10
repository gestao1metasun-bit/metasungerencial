import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/error-logger";

/* ============================================================
 * FIN.MIG — Repositório oficial Financiamentos (Supabase)
 * Substitui bancos-store.ts / gerentes-store.ts / fin-pendencias.ts (LS)
 * ========================================================== */

export interface FinBanco {
  id: string;
  codigo: string;
  nome: string;
  ispb: string | null;
  ativo: boolean;
}

export interface FinGerente {
  id: string;
  nome: string;
  banco_id: string | null;
  banco_nome: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  observacao: string | null;
}

export type FinOpStatus =
  | "SEM_CONTRATO"
  | "COM_CONTRATO"
  | "EM_ANALISE"
  | "PENDENTE_BANCO"
  | "PENDENTE_CLIENTE"
  | "AGUARDANDO_DOCUMENTACAO"
  | "AGUARDANDO_LIBERACAO"
  | "APROVADO"
  | "LIBERADO"
  | "FINALIZADO"
  | "CANCELADO";

export interface FinOperacao {
  id: string;
  codigo: string | null;
  contrato_id: string | null;
  cliente_id: string | null;
  cliente_nome: string;
  vendedor: string | null;
  pfpj: "PF" | "PJ";
  cpfcnpj: string | null;
  valor_contrato: number;
  valor_financiado: number;
  kwp: number | null;
  banco_id: string | null;
  banco_nome: string | null;
  gerente_id: string | null;
  gerente_nome: string | null;
  envio_em: string | null;
  status: FinOpStatus;
  prazo_dias: number;
  data_base: string | null;
  previsao_liberacao: string | null;
  andamento: string | null;
  observacao: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinPendencia {
  id: string;
  contrato_id: string;
  cliente_id: string | null;
  vendedor: string | null;
  valor_contrato: number;
  valor_financiado: number | null;
  banco_sugerido: string | null;
  banco_definitivo: string | null;
  observacao: string | null;
  status: "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REPROVADO" | "CANCELADO";
  motivo_decisao: string | null;
  created_at: string;
}

const TAG = "[FinanciamentosRepo]";

function fail(label: string, error: unknown): never {
  logError({ origem: "financiamentos-repo", mensagem: `${label}: ${String((error as { message?: string })?.message ?? error)}` });
  throw error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error));
}

/* ---------- Bancos ---------- */

export function useFinBancos() {
  return useQuery({
    queryKey: ["fin-bancos"],
    queryFn: async (): Promise<FinBanco[]> => {
      const { data, error } = await supabase
        .from("bancos")
        .select("id, codigo, nome, ispb, ativo")
        .order("nome");
      if (error) fail("listar bancos", error);
      return (data ?? []) as FinBanco[];
    },
    staleTime: 60_000,
  });
}

export function useSalvarBanco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; codigo: string; nome: string; ativo?: boolean }) => {
      if (input.id) {
        const { error } = await supabase
          .from("bancos")
          .update({ codigo: input.codigo, nome: input.nome, ativo: input.ativo ?? true })
          .eq("id", input.id);
        if (error) fail("atualizar banco", error);
      } else {
        const { error } = await supabase
          .from("bancos")
          .insert({ codigo: input.codigo, nome: input.nome, ativo: input.ativo ?? true });
        if (error) fail("criar banco", error);
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-bancos"] }),
  });
}

/* ---------- Gerentes ---------- */

export function useFinGerentes() {
  return useQuery({
    queryKey: ["fin-gerentes"],
    queryFn: async (): Promise<FinGerente[]> => {
      const { data, error } = await supabase
        .from("financiamentos_gerentes")
        .select("id, nome, banco_id, banco_nome, telefone, email, ativo, observacao")
        .is("deleted_at", null)
        .order("nome");
      if (error) fail("listar gerentes", error);
      return (data ?? []) as FinGerente[];
    },
    staleTime: 60_000,
  });
}

export function useSalvarGerente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FinGerente> & { nome: string }) => {
      const payload = {
        nome: input.nome,
        banco_id: input.banco_id ?? null,
        banco_nome: input.banco_nome ?? null,
        telefone: input.telefone ?? null,
        email: input.email ?? null,
        ativo: input.ativo ?? true,
        observacao: input.observacao ?? null,
      };
      if (input.id) {
        const { error } = await supabase.from("financiamentos_gerentes").update(payload).eq("id", input.id);
        if (error) fail("atualizar gerente", error);
      } else {
        const { error } = await supabase.from("financiamentos_gerentes").insert(payload);
        if (error) fail("criar gerente", error);
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-gerentes"] }),
  });
}

/* ---------- Operações (carteira) ---------- */

async function listOperacoes(): Promise<FinOperacao[]> {
  const { data, error } = await supabase
    .from("financiamentos_operacoes")
    .select(
      "id, codigo, contrato_id, cliente_id, cliente_nome, vendedor, pfpj, cpfcnpj, valor_contrato, valor_financiado, kwp, banco_id, banco_nome, gerente_id, gerente_nome, envio_em, status, prazo_dias, data_base, previsao_liberacao, andamento, observacao, motivo_cancelamento, created_at, updated_at"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) fail("listar operações", error);
  return (data ?? []) as FinOperacao[];
}

export function useFinOperacoes() {
  return useQuery({ queryKey: ["fin-operacoes"], queryFn: listOperacoes, staleTime: 15_000 });
}

export function useCriarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FinOperacao> & { cliente_nome: string }) => {
      const { error } = await supabase.from("financiamentos_operacoes").insert({
        contrato_id: input.contrato_id ?? null,
        cliente_id: input.cliente_id ?? null,
        cliente_nome: input.cliente_nome,
        vendedor: input.vendedor ?? null,
        pfpj: input.pfpj ?? "PF",
        cpfcnpj: input.cpfcnpj ?? null,
        valor_contrato: input.valor_contrato ?? 0,
        valor_financiado: input.valor_financiado ?? 0,
        kwp: input.kwp ?? null,
        banco_id: input.banco_id ?? null,
        banco_nome: input.banco_nome ?? null,
        gerente_id: input.gerente_id ?? null,
        gerente_nome: input.gerente_nome ?? null,
        envio_em: input.envio_em ?? null,
        status: input.status ?? "SEM_CONTRATO",
        prazo_dias: input.prazo_dias ?? 0,
        data_base: input.data_base ?? null,
        previsao_liberacao: input.previsao_liberacao ?? null,
        andamento: input.andamento ?? null,
        observacao: input.observacao ?? null,
      });
      if (error) fail("criar operação", error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-operacoes"] }),
  });
}

export function useAtualizarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FinOperacao> & { id: string }) => {
      const { error } = await supabase.from("financiamentos_operacoes").update(patch).eq("id", id);
      if (error) fail("atualizar operação", error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-operacoes"] }),
  });
}

export function useFinalizarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financiamentos_operacoes")
        .update({ status: "FINALIZADO", finalizado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) fail("finalizar operação", error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-operacoes"] }),
  });
}

export function useCancelarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      if (motivo.trim().length < 5) throw new Error("Motivo deve ter ao menos 5 caracteres.");
      const { error } = await supabase
        .from("financiamentos_operacoes")
        .update({ status: "CANCELADO", motivo_cancelamento: motivo.trim(), cancelado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) fail("cancelar operação", error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-operacoes"] }),
  });
}

/** Replica uma operação para outro banco (fluxo legado da planilha). */
export function useReplicarOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bancoId, bancoNome }: { id: string; bancoId: string | null; bancoNome: string }) => {
      const { data: orig, error: e1 } = await supabase
        .from("financiamentos_operacoes")
        .select("*")
        .eq("id", id)
        .single();
      if (e1) fail("replicar: ler origem", e1);
      const { id: _id, codigo: _c, created_at: _ca, updated_at: _ua, finalizado_em: _fe, finalizado_por: _fp, cancelado_em: _ce, cancelado_por: _cp, row_version: _rv, ...rest } = orig as Record<string, unknown>;
      const { error } = await supabase.from("financiamentos_operacoes").insert({
        ...rest,
        banco_id: bancoId,
        banco_nome: bancoNome,
        gerente_id: null,
        gerente_nome: null,
        status: "EM_ANALISE",
        motivo_cancelamento: null,
      });
      if (error) fail("replicar operação", error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-operacoes"] }),
  });
}

/* ---------- Pendências ---------- */

export function useFinPendencias() {
  return useQuery({
    queryKey: ["fin-pendencias"],
    queryFn: async (): Promise<FinPendencia[]> => {
      const { data, error } = await supabase
        .from("financiamentos_pendencias")
        .select("id, contrato_id, cliente_id, vendedor, valor_contrato, valor_financiado, banco_sugerido, banco_definitivo, observacao, status, motivo_decisao, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) fail("listar pendências", error);
      return (data ?? []) as FinPendencia[];
    },
    staleTime: 15_000,
  });
}

export function useAtualizarPendencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FinPendencia> & { id: string }) => {
      const { error } = await supabase.from("financiamentos_pendencias").update(patch).eq("id", id);
      if (error) fail("atualizar pendência", error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-pendencias"] }),
  });
}

/** Libera a pendência para Engenharia: marca APROVADO e cria operação na carteira. */
export function useLiberarPendencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: FinPendencia) => {
      const { error: e1 } = await supabase
        .from("financiamentos_pendencias")
        .update({ status: "APROVADO", decidido_em: new Date().toISOString() })
        .eq("id", p.id);
      if (e1) fail("liberar pendência", e1);
      // Cria operação COM_CONTRATO se ainda não existir para este contrato
      const { data: existente } = await supabase
        .from("financiamentos_operacoes")
        .select("id")
        .eq("contrato_id", p.contrato_id)
        .is("deleted_at", null)
        .limit(1);
      if (!existente?.length) {
        const { error: e2 } = await supabase.from("financiamentos_operacoes").insert({
          contrato_id: p.contrato_id,
          cliente_id: p.cliente_id,
          cliente_nome: p.vendedor ?? "—",
          vendedor: p.vendedor,
          valor_contrato: p.valor_contrato,
          valor_financiado: p.valor_financiado ?? 0,
          banco_nome: p.banco_definitivo ?? p.banco_sugerido,
          status: "COM_CONTRATO",
          observacao: p.observacao,
        });
        if (e2) fail("liberar: criar operação", e2);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["fin-pendencias"] });
      void qc.invalidateQueries({ queryKey: ["fin-operacoes"] });
    },
  });
}

export function useCancelarPendencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      if (motivo.trim().length < 5) throw new Error("Motivo deve ter ao menos 5 caracteres.");
      const { error } = await supabase
        .from("financiamentos_pendencias")
        .update({ status: "CANCELADO", motivo_decisao: motivo.trim(), decidido_em: new Date().toISOString() })
        .eq("id", id);
      if (error) fail("cancelar pendência", error);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fin-pendencias"] }),
  });
}
