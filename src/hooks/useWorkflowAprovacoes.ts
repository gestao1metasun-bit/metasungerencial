// ============================================================================
// D5.2 — Hook reativo da Central de Aprovações.
// Consome workflow_aprovacoes + RPCs aprovar/negar/cancelar_solicitacao.
// Backend NÃO é tocado por este arquivo: apenas leitura via RLS e RPCs
// existentes (que aplicam internamente a flag app.via_workflow_rpc).
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

export type WorkflowStatus =
  | "PENDENTE" | "APROVADA" | "NEGADA" | "CANCELADA" | "EXPIRADA";

export const WF_STATUS_LABEL: Record<WorkflowStatus, string> = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  NEGADA: "Negada",
  CANCELADA: "Cancelada",
  EXPIRADA: "Expirada",
};

export const WF_STATUS_TONE: Record<WorkflowStatus, string> = {
  PENDENTE: "bg-amber-100 text-amber-900 border-amber-300",
  APROVADA: "bg-emerald-100 text-emerald-900 border-emerald-300",
  NEGADA: "bg-rose-100 text-rose-900 border-rose-300",
  CANCELADA: "bg-slate-100 text-slate-700 border-slate-300",
  EXPIRADA: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

export const WF_TIPO_LABEL: Record<string, string> = {
  compra: "Compra",
  material: "Solicitação de Material",
  desconto: "Desconto Comercial",
  pagamento: "Pagamento",
  cancelamento: "Cancelamento",
};

export type WorkflowAprovacao = {
  id: string;
  codigo: string | null;
  tipo_operacao: string;
  titulo: string;
  descricao: string | null;
  valor: number;
  setor: string | null;
  centro_custo_id: string | null;
  contexto: Record<string, unknown>;
  origem_tipo: string | null;
  origem_id: string | null;
  solicitante_id: string;
  solicitante_email: string | null;
  alcada_id: string | null;
  aprovador_id: string | null;
  aprovador_email: string | null;
  status: WorkflowStatus;
  motivo_solicitacao: string | null;
  motivo_decisao: string | null;
  solicitado_em: string;
  decidido_em: string | null;
  expira_em: string | null;
  created_at: string;
  updated_at: string;
};

const QK = {
  list: (filtro: string, uid: string | null) =>
    ["workflow_aprovacoes", filtro, uid ?? "anon"] as const,
  historico: (id: string) => ["workflow_aprovacoes", "hist", id] as const,
};

export type Filtro = "pendentes_para_mim" | "minhas" | "historico" | "todas";

export function useWorkflowAprovacoes(filtro: Filtro = "pendentes_para_mim") {
  const auth = useAuth();
  const uid = auth.user?.id ?? null;


  return useQuery({
    queryKey: QK.list(filtro, uid),
    queryFn: async () => {
      let q = supabase
        .from("workflow_aprovacoes")
        .select("*")
        .order("solicitado_em", { ascending: false })
        .limit(500);

      if (filtro === "pendentes_para_mim") {
        // RLS já filtra para o que o usuário enxerga por alçada/papel.
        // "Para mim" = pendente e não criado por mim.
        q = q.eq("status", "PENDENTE");
        if (uid) q = q.neq("solicitante_id", uid);
      } else if (filtro === "minhas") {
        if (uid) q = q.eq("solicitante_id", uid);
        else q = q.eq("solicitante_id", "00000000-0000-0000-0000-000000000000");
      } else if (filtro === "historico") {
        q = q.in("status", ["APROVADA", "NEGADA", "CANCELADA", "EXPIRADA"]);
      }
      // "todas" não aplica filtro adicional (apenas RLS)

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WorkflowAprovacao[];
    },
  });
}

export function useWorkflowHistorico(aprovacaoId: string | undefined) {
  return useQuery({
    queryKey: QK.historico(aprovacaoId ?? "__none__"),
    enabled: !!aprovacaoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_aprovacoes_historico")
        .select("*")
        .eq("aprovacao_id", aprovacaoId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["workflow_aprovacoes"] });
}

export function useAprovarSolicitacao() {
  const inv = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      const { error } = await supabase.rpc("aprovar_solicitacao", {
        _id: id,
        _motivo: motivo ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação aprovada.");
      inv();
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao aprovar."),
  });
}

export function useNegarSolicitacao() {
  const inv = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase.rpc("negar_solicitacao", {
        _id: id,
        _motivo: motivo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação negada.");
      inv();
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao negar."),
  });
}

export function useCancelarSolicitacao() {
  const inv = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase.rpc("cancelar_solicitacao", {
        _id: id,
        _motivo: motivo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação cancelada.");
      inv();
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao cancelar."),
  });
}

/** Heurística de SLA: expira em menos de 24h. */
export function slaEmRisco(a: WorkflowAprovacao): boolean {
  if (!a.expira_em || a.status !== "PENDENTE") return false;
  const d = new Date(a.expira_em).getTime() - Date.now();
  return d > 0 && d < 24 * 3600 * 1000;
}

export function slaExpirada(a: WorkflowAprovacao): boolean {
  if (!a.expira_em || a.status !== "PENDENTE") return false;
  return new Date(a.expira_em).getTime() < Date.now();
}
