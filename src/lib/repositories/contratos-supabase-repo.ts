/**
 * C-ENT.4 + C-ENT.5 — Repositório oficial Supabase para Contratos.
 *
 * Fonte oficial:
 *  - public.contratos
 *  - public.contrato_propostas (vínculo N:N proposta×contrato)
 *  - public.projetos (criados pelo RPC ao gerar contrato)
 *
 * Não substitui ContratoStore (LS) ainda — apenas oficializa a operação Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/repositories/error-log-repo";

export type ContratoSupabase = {
  id: string;
  codigo: string | null;
  cliente_id: string;
  consultor_id: string | null;
  status: string;
  cancelado: boolean;
  motivo_cancelamento: string | null;
  valor_total: number;
  potencia_kwp: number | null;
  modulos_qtde: number | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  dados: Record<string, unknown> | null;
  data_assinatura: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  updated_at: string;
};

export type ContratoSupabaseListItem = ContratoSupabase & {
  cliente_nome: string | null;
  consultor_nome: string | null;
  projetos_count: number;
};

export type PropostaDoContrato = {
  id: string;
  numero: string | null;
  status: string;
  valor_final: number | null;
  potencia_kwp: number | null;
  modulos_qtd: number | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  created_at: string;
};

export type ProjetoSupabase = {
  id: string;
  codigo: string | null;
  contrato_id: string | null;
  cliente_id: string | null;
  tipo: string;
  status: string;
  inversor: string | null;
  potencia_kwp: number | null;
  modulos_qtde: number | null;
  valor_estimado: number | null;
  cidade: string | null;
  uf: string | null;
  consultor_id: string | null;
  dados: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id,codigo,cliente_id,consultor_id,status,cancelado,motivo_cancelamento," +
  "valor_total,potencia_kwp,modulos_qtde,forma_pagamento,observacoes,dados," +
  "data_assinatura,data_inicio,data_fim,created_at,updated_at";

function reportError(acao: string, err: unknown, payload?: Record<string, unknown>) {
  const e = err as { message?: string; stack?: string };
  void logError({
    modulo: "comercial",
    tela: "contratos-supabase-repo",
    acao,
    mensagem: e?.message ?? String(err),
    stack: e?.stack,
    payload,
    severidade: "error",
  });
}

/* ============================== QUERIES ============================== */

export async function listarContratos(): Promise<ContratoSupabaseListItem[]> {
  const { data, error } = await supabase
    .from("contratos")
    .select(SELECT_COLS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    reportError("listarContratos", error);
    throw error;
  }
  const rows = (data ?? []) as unknown as ContratoSupabase[];
  if (rows.length === 0) return [];

  const clienteIds = Array.from(new Set(rows.map((r) => r.cliente_id).filter(Boolean)));
  const consultorIds = Array.from(
    new Set(rows.map((r) => r.consultor_id).filter((v): v is string => !!v)),
  );
  const contratoIds = rows.map((r) => r.id);

  const [clientesRes, consultoresRes, projetosRes] = await Promise.all([
    clienteIds.length
      ? supabase.from("clientes").select("id,nome").in("id", clienteIds)
      : Promise.resolve({ data: [], error: null } as { data: { id: string; nome: string | null }[] | null; error: unknown }),
    consultorIds.length
      ? supabase.from("profiles").select("user_id,nome,email").in("user_id", consultorIds)
      : Promise.resolve({ data: [] as { user_id: string; nome: string | null; email: string | null }[], error: null }),
    supabase.from("projetos").select("contrato_id").in("contrato_id", contratoIds).is("deleted_at", null),
  ]);

  const clienteMap = new Map<string, string | null>(
    (clientesRes.data ?? []).map((c) => [c.id, c.nome ?? null]),
  );
  const consultorMap = new Map<string, string | null>(
    ((consultoresRes.data ?? []) as { user_id: string; nome: string | null; email: string | null }[]).map(
      (p) => [p.user_id, p.nome ?? p.email ?? null],
    ),
  );
  const projetosCount = new Map<string, number>();
  for (const p of (projetosRes.data ?? []) as { contrato_id: string | null }[]) {
    if (!p.contrato_id) continue;
    projetosCount.set(p.contrato_id, (projetosCount.get(p.contrato_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    ...r,
    cliente_nome: clienteMap.get(r.cliente_id) ?? null,
    consultor_nome: r.consultor_id ? consultorMap.get(r.consultor_id) ?? null : null,
    projetos_count: projetosCount.get(r.id) ?? 0,
  }));
}

export async function obterContratoPorId(id: string): Promise<ContratoSupabase | null> {
  const { data, error } = await supabase
    .from("contratos")
    .select(SELECT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    reportError("obterContratoPorId", error, { id });
    throw error;
  }
  return (data as unknown as ContratoSupabase) ?? null;
}

export async function listarContratosPorCliente(clienteId: string): Promise<ContratoSupabase[]> {
  const { data, error } = await supabase
    .from("contratos")
    .select(SELECT_COLS)
    .eq("cliente_id", clienteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    reportError("listarContratosPorCliente", error, { clienteId });
    throw error;
  }
  return (data ?? []) as unknown as ContratoSupabase[];
}

export async function listarPropostasDoContrato(contratoId: string): Promise<PropostaDoContrato[]> {
  const { data: vinculos, error: e1 } = await supabase
    .from("contrato_propostas")
    .select("proposta_id")
    .eq("contrato_id", contratoId);
  if (e1) {
    reportError("listarPropostasDoContrato.vinculos", e1, { contratoId });
    throw e1;
  }
  const ids = (vinculos ?? []).map((v) => v.proposta_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("propostas")
    .select("id,numero,status,valor_final,potencia_kwp,modulos_qtd,cliente_id,cliente_nome,created_at")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) {
    reportError("listarPropostasDoContrato", error, { contratoId });
    throw error;
  }
  return (data ?? []) as unknown as PropostaDoContrato[];
}

export async function listarProjetosPorContrato(contratoId: string): Promise<ProjetoSupabase[]> {
  const { data, error } = await supabase
    .from("projetos")
    .select("id,codigo,contrato_id,cliente_id,tipo,status,inversor,potencia_kwp,modulos_qtde,valor_estimado,cidade,uf,consultor_id,dados,created_at,updated_at")
    .eq("contrato_id", contratoId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    reportError("listarProjetosPorContrato", error, { contratoId });
    throw error;
  }
  return (data ?? []) as unknown as ProjetoSupabase[];
}

export async function listarProjetosPorCliente(clienteId: string): Promise<ProjetoSupabase[]> {
  const { data, error } = await supabase
    .from("projetos")
    .select("id,codigo,contrato_id,cliente_id,tipo,status,inversor,potencia_kwp,modulos_qtde,valor_estimado,cidade,uf,consultor_id,dados,created_at,updated_at")
    .eq("cliente_id", clienteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    reportError("listarProjetosPorCliente", error, { clienteId });
    throw error;
  }
  return (data ?? []) as unknown as ProjetoSupabase[];
}

/* ============================== MUTATIONS ============================== */

export async function gerarContratoDePropostas(propostaIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc("rpc_contrato_gerar_de_propostas", {
    p_proposta_ids: propostaIds,
  });
  if (error) {
    reportError("gerarContratoDePropostas", error, { propostaIds });
    throw error;
  }
  return data as string;
}

export async function cancelarContratoSupabase(
  id: string,
  motivo: string,
  observacao?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("rpc_contrato_cancelar", {
    _id: id,
    _motivo: motivo,
    _observacao: observacao ?? null,
  });
  if (error) {
    reportError("cancelarContratoSupabase", error, { id, motivo });
    throw error;
  }
}

/* ============================== HOOKS ============================== */

export function useContratosSupabase() {
  return useQuery({
    queryKey: ["contratos-supabase", "list"],
    queryFn: listarContratos,
    staleTime: 30_000,
  });
}

export function useContratoSupabaseById(id: string | null | undefined) {
  return useQuery({
    queryKey: ["contratos-supabase", "id", id],
    queryFn: () => obterContratoPorId(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useContratosPorCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ["contratos-supabase", "cliente", clienteId],
    queryFn: () => listarContratosPorCliente(clienteId!),
    enabled: !!clienteId,
    staleTime: 30_000,
  });
}

export function usePropostasDoContrato(contratoId: string | null | undefined) {
  return useQuery({
    queryKey: ["contratos-supabase", "propostas", contratoId],
    queryFn: () => listarPropostasDoContrato(contratoId!),
    enabled: !!contratoId,
    staleTime: 30_000,
  });
}

export function useProjetosPorContrato(contratoId: string | null | undefined) {
  return useQuery({
    queryKey: ["projetos-supabase", "contrato", contratoId],
    queryFn: () => listarProjetosPorContrato(contratoId!),
    enabled: !!contratoId,
    staleTime: 30_000,
  });
}

export function useProjetosPorCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ["projetos-supabase", "cliente", clienteId],
    queryFn: () => listarProjetosPorCliente(clienteId!),
    enabled: !!clienteId,
    staleTime: 30_000,
  });
}

export function useGerarContratoDePropostas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propostaIds: string[]) => gerarContratoDePropostas(propostaIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contratos-supabase"] });
      void qc.invalidateQueries({ queryKey: ["propostas-supabase"] });
      void qc.invalidateQueries({ queryKey: ["projetos-supabase"] });
    },
  });
}

export function useCancelarContratoSupabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; motivo: string; observacao?: string | null }) =>
      cancelarContratoSupabase(vars.id, vars.motivo, vars.observacao ?? null),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["contratos-supabase"] });
      void qc.invalidateQueries({ queryKey: ["contratos-supabase", "id", vars.id] });
      void qc.invalidateQueries({ queryKey: ["contratos", "by-cliente"] });
      void qc.invalidateQueries({ queryKey: ["cliente-360"] });
    },
  });
}
