import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type NotifStatus = "NAO_LIDA" | "LIDA" | "ARQUIVADA" | "EXPIRADA";
export type NotifPrioridade = "BAIXA" | "NORMAL" | "ALTA" | "CRITICA";

export interface NotificacaoRow {
  id: string;
  usuario_destino_id: string | null;
  modulo: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  prioridade: NotifPrioridade;
  status: NotifStatus;
  origem_tipo: string | null;
  origem_id: string | null;
  link_origem: string | null;
  payload: Record<string, unknown> | null;
  dedupe_key: string | null;
  lida_em: string | null;
  arquivada_em: string | null;
  criada_em: string;
  expira_em: string | null;
  vencida: boolean;
}

const QK = ["notificacoes-minhas"] as const;

export function useNotificacoesMinhas(limit = 200) {
  return useQuery({
    queryKey: [...QK, limit],
    queryFn: async (): Promise<NotificacaoRow[]> => {
      const { data, error } = await supabase
        .from("v_notificacoes_minhas" as never)
        .select("*")
        .order("criada_em", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as NotificacaoRow[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useNotificacoesNaoLidasCount() {
  const { data = [] } = useNotificacoesMinhas();
  const naoLidas = data.filter((n) => n.status === "NAO_LIDA").length;
  const criticas = data.filter((n) => n.status === "NAO_LIDA" && n.prioridade === "CRITICA").length;
  return { naoLidas, criticas };
}

export function useMarcarNotifLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("rpc_notificacao_marcar_lida" as never, { p_id: id } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (e: Error) => toast({ title: "Falha ao marcar como lida", description: e.message, variant: "destructive" }),
  });
}

export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("rpc_notificacao_marcar_todas_lidas" as never);
      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: "Notificações marcadas como lidas", description: `${count ?? 0} atualizadas` });
    },
    onError: (e: Error) => toast({ title: "Falha", description: e.message, variant: "destructive" }),
  });
}

export function useArquivarNotif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("rpc_notificacao_arquivar" as never, { p_id: id } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (e: Error) => toast({ title: "Falha ao arquivar", description: e.message, variant: "destructive" }),
  });
}

export const NOTIF_PRIORIDADE_TONE: Record<NotifPrioridade, string> = {
  BAIXA: "bg-slate-100 text-slate-700 border-slate-300",
  NORMAL: "bg-sky-100 text-sky-800 border-sky-300",
  ALTA: "bg-amber-100 text-amber-900 border-amber-300",
  CRITICA: "bg-rose-100 text-rose-900 border-rose-300",
};

export const NOTIF_MODULO_LABEL: Record<string, string> = {
  aprovacoes: "Aprovações",
  suprimentos: "Suprimentos",
  financeiro: "Financeiro",
  os: "O.S.",
  engenharia: "Engenharia",
  comercial: "Comercial",
  financiamentos: "Financiamentos",
  sistema: "Sistema",
};
