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
  cliente_doc: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  consultor_nome: string | null;
  projetos_count: number;
  proposta_origem_numero: string | null;
  proposta_origem_id: string | null;
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
    _observacao: observacao ?? undefined,
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

/* ============================== C-ENT.7 — Projeto individual + Consumo do contrato ============================== */

export async function obterProjetoPorId(id: string): Promise<ProjetoSupabase | null> {
  const { data, error } = await supabase
    .from("projetos")
    .select(
      "id,codigo,contrato_id,cliente_id,tipo,status,inversor,potencia_kwp,modulos_qtde,valor_estimado,cidade,uf,consultor_id,dados,created_at,updated_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    reportError("obterProjetoPorId", error, { id });
    throw error;
  }
  return (data as unknown as ProjetoSupabase) ?? null;
}

export function useProjetoSupabaseById(id: string | null | undefined) {
  return useQuery({
    queryKey: ["projetos-supabase", "id", id],
    queryFn: () => obterProjetoPorId(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export type ConsumoContrato = {
  valor_global: number;
  valor_consumido: number;
  valor_saldo: number;
  valor_pct: number;
  potencia_global: number;
  potencia_consumida: number;
  potencia_saldo: number;
  potencia_pct: number;
  modulos_globais: number;
  modulos_consumidos: number;
  modulos_saldo: number;
  modulos_pct: number;
  projetos_qtde: number;
  excedido: boolean;
};

/**
 * Calcula o consumo de limites globais do contrato vs projetos vinculados.
 * Saldos negativos indicam estouro (alerta vermelho na UI).
 */
export function calcularConsumoContrato(
  contrato: Pick<ContratoSupabase, "valor_total" | "potencia_kwp" | "modulos_qtde">,
  projetos: Pick<ProjetoSupabase, "valor_estimado" | "potencia_kwp" | "modulos_qtde">[],
): ConsumoContrato {
  const valor_global = Number(contrato.valor_total) || 0;
  const potencia_global = Number(contrato.potencia_kwp) || 0;
  const modulos_globais = Number(contrato.modulos_qtde) || 0;

  const valor_consumido = projetos.reduce((s, p) => s + (Number(p.valor_estimado) || 0), 0);
  const potencia_consumida = projetos.reduce((s, p) => s + (Number(p.potencia_kwp) || 0), 0);
  const modulos_consumidos = projetos.reduce((s, p) => s + (Number(p.modulos_qtde) || 0), 0);

  const valor_saldo = valor_global - valor_consumido;
  const potencia_saldo = potencia_global - potencia_consumida;
  const modulos_saldo = modulos_globais - modulos_consumidos;

  const pct = (consumido: number, global: number) =>
    global > 0 ? Math.min(999, Math.round((consumido / global) * 100)) : 0;

  return {
    valor_global,
    valor_consumido,
    valor_saldo,
    valor_pct: pct(valor_consumido, valor_global),
    potencia_global,
    potencia_consumida,
    potencia_saldo,
    potencia_pct: pct(potencia_consumida, potencia_global),
    modulos_globais,
    modulos_consumidos,
    modulos_saldo,
    modulos_pct: pct(modulos_consumidos, modulos_globais),
    projetos_qtde: projetos.length,
    excedido: valor_saldo < 0 || potencia_saldo < 0 || modulos_saldo < 0,
  };
}

/**
 * Validador utilitário: garante que somar um novo projeto (ou alterações) ao contrato
 * não ultrapasse limites globais. Use antes de qualquer criação manual futura.
 */
export type ProjetoLimitsPayload = {
  valor_estimado?: number | null;
  potencia_kwp?: number | null;
  modulos_qtde?: number | null;
};

export function validarLimitesProjetoNoContrato(
  contrato: Pick<ContratoSupabase, "valor_total" | "potencia_kwp" | "modulos_qtde">,
  projetosAtuais: Pick<ProjetoSupabase, "valor_estimado" | "potencia_kwp" | "modulos_qtde">[],
  novoProjeto: ProjetoLimitsPayload,
  excluirProjetoId?: string,
  todosProjetos?: Pick<ProjetoSupabase, "id" | "valor_estimado" | "potencia_kwp" | "modulos_qtde">[],
): { ok: boolean; erros: string[] } {
  const base = excluirProjetoId && todosProjetos
    ? todosProjetos.filter((p) => p.id !== excluirProjetoId)
    : projetosAtuais;
  const consumo = calcularConsumoContrato(contrato, base);
  const erros: string[] = [];
  const v = Number(novoProjeto.valor_estimado) || 0;
  const p = Number(novoProjeto.potencia_kwp) || 0;
  const m = Number(novoProjeto.modulos_qtde) || 0;
  if (consumo.valor_global > 0 && v > consumo.valor_saldo) {
    erros.push(`Valor excede o saldo do contrato em R$ ${(v - consumo.valor_saldo).toFixed(2)}.`);
  }
  if (consumo.potencia_global > 0 && p > consumo.potencia_saldo) {
    erros.push(`Potência excede o saldo do contrato em ${(p - consumo.potencia_saldo).toFixed(2)} kWp.`);
  }
  if (consumo.modulos_globais > 0 && m > consumo.modulos_saldo) {
    erros.push(`Módulos excedem o saldo do contrato em ${m - consumo.modulos_saldo} unidades.`);
  }
  return { ok: erros.length === 0, erros };
}

