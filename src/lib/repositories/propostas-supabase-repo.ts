/**
 * C-ENT.3 — Repositório oficial Supabase para Propostas (fluxo Lead → Proposta,
 * cancelamento e geração de nova versão).
 *
 * Não substitui `propostas-store` (LS) ainda — apenas oficializa as operações
 * que migram para Supabase como fonte da verdade. Demais fluxos (PropostasPage
 * legada, CarteiraTab) continuam consumindo LS até as próximas ondas.
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withPerf } from "@/lib/perf";
import { logError } from "@/lib/repositories/error-log-repo";
import { propostasRevisaoRepo } from "@/lib/repositories/propostas-revisao-repo";

/* ============================== TYPES ============================== */

export type PropostaSupabase = {
  id: string;
  numero: string | null;
  status: string;
  consultor_id: string | null;
  cliente_id: string | null;
  lead_id: string | null;
  contrato_id: string | null;
  oportunidade_id: string | null;
  cliente_nome: string | null;
  cliente_doc: string | null;
  valor_final: number | null;
  potencia_kwp: number | null;
  modulos_qtd: number | null;
  validade: string | null;
  versao: string | null;
  versao_num: number;
  versao_pai_id: string | null;
  motivo_status: string | null;
  dados: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id,numero,status,consultor_id,cliente_id,lead_id,contrato_id,oportunidade_id," +
  "cliente_nome,cliente_doc,valor_final,potencia_kwp,modulos_qtd,validade," +
  "versao,versao_num,versao_pai_id,motivo_status,dados,created_at,updated_at";

/* ============================== READS ============================== */

export async function listarPropostasPorLead(leadId: string): Promise<PropostaSupabase[]> {
  const { data, error } = await supabase
    .from("propostas")
    .select(SELECT_COLS)
    .eq("lead_id", leadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    void logError("propostas-supabase-repo.listarPropostasPorLead", error, { leadId });
    throw error;
  }
  return (data ?? []) as unknown as PropostaSupabase[];
}

export async function listarPropostasPorCliente(clienteId: string): Promise<PropostaSupabase[]> {
  const { data, error } = await supabase
    .from("propostas")
    .select(SELECT_COLS)
    .eq("cliente_id", clienteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    void logError("propostas-supabase-repo.listarPropostasPorCliente", error, { clienteId });
    throw error;
  }
  return (data ?? []) as unknown as PropostaSupabase[];
}

/* ============================== WRITES ============================== */

export async function criarPropostaDoLead(leadId: string, observacao?: string): Promise<string> {
  const { data, error } = await withPerf("rpc.proposta_criar_do_lead", () =>
    supabase.rpc("rpc_proposta_criar_do_lead", {
      _lead_id: leadId,
      _observacao: observacao?.trim() || null,
    }),
  );
  if (error) {
    void logError("propostas-supabase-repo.criarPropostaDoLead", error, { leadId });
    throw error;
  }
  return data as unknown as string;
}

export async function cancelarPropostaSupabase(id: string, motivo: string): Promise<void> {
  if (!motivo || motivo.trim().length < 5) {
    throw new Error("Motivo do cancelamento obrigatório (mínimo 5 caracteres).");
  }
  const { error } = await withPerf("rpc.proposta_cancelar", () =>
    supabase.rpc("rpc_proposta_cancelar", { _id: id, _motivo: motivo.trim() }),
  );
  if (error) {
    void logError("propostas-supabase-repo.cancelarPropostaSupabase", error, { id });
    throw error;
  }
}

/**
 * Gera nova versão da proposta reutilizando o pipeline oficial de revisão
 * (`rpc_proposta_solicitar_revisao`): marca a proposta origem como
 * SUBSTITUÍDA (status EM_REVISAO) e cria nova versão em RASCUNHO com
 * `versao_pai_id` apontando para a origem.
 */
export async function gerarNovaVersaoProposta(id: string, motivo: string): Promise<string> {
  return propostasRevisaoRepo.solicitarRevisao(id, motivo);
}

/* ============================== HOOKS ============================== */

export function usePropostasPorLead(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ["propostas", "by-lead", leadId],
    queryFn: () => listarPropostasPorLead(leadId!),
    enabled: !!leadId,
    staleTime: 30_000,
  });
}

export function usePropostasPorCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ["propostas", "by-cliente", clienteId],
    queryFn: () => listarPropostasPorCliente(clienteId!),
    enabled: !!clienteId,
    staleTime: 30_000,
  });
}

export function useCriarPropostaDoLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { leadId: string; observacao?: string }) =>
      criarPropostaDoLead(p.leadId, p.observacao),
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["propostas"] });
      qc.invalidateQueries({ queryKey: ["propostas", "by-lead", vars.leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useCancelarPropostaSupabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; motivo: string }) => cancelarPropostaSupabase(p.id, p.motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["propostas"] }),
  });
}

export function useGerarNovaVersaoProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; motivo: string }) => gerarNovaVersaoProposta(p.id, p.motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["propostas"] }),
  });
}

/* ============================== HELPERS ============================== */

export const PROPOSTA_STATUS_BADGE: Record<string, string> = {
  RASCUNHO: "bg-muted text-foreground",
  EM_ANALISE: "bg-blue-100 text-blue-800",
  ENVIADA: "bg-indigo-100 text-indigo-800",
  APROVADA: "bg-emerald-100 text-emerald-800",
  ASSINADA: "bg-emerald-200 text-emerald-900",
  EM_REVISAO: "bg-amber-100 text-amber-800",
  VENCIDA: "bg-zinc-200 text-zinc-700",
  CANCELADA: "bg-rose-100 text-rose-800",
};

export function statusPropostaBadgeClass(s: string): string {
  return PROPOSTA_STATUS_BADGE[s] ?? "bg-muted text-foreground";
}

/** Identifica se a proposta foi substituída por uma versão posterior (EM_REVISAO + filhos). */
export function isPropostaSubstituida(p: PropostaSupabase, todas: PropostaSupabase[]): boolean {
  if (p.status !== "EM_REVISAO") return false;
  return todas.some((x) => x.versao_pai_id === p.id);
}
