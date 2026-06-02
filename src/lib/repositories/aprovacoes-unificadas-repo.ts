// ============================================================================
// D22 — Repo da Central de Aprovações Unificada.
// Consome a view oficial `v_aprovacoes_unificadas` (security_invoker).
// Não cria motor novo. Para ação real:
//   - origem_modulo='WORKFLOW' → usa RPCs aprovar_solicitacao/negar_solicitacao.
//   - demais origens → exige abrir a origem (Suprimentos etc).
// ============================================================================
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AprovacaoUnificadaRow = {
  chave: string;
  origem_id: string;
  origem_modulo: "WORKFLOW" | "SUPRIMENTOS" | string;
  origem_tipo: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: "ALTA" | "MEDIA" | "NORMAL" | string;
  valor: number;
  solicitante_id: string | null;
  solicitante_email: string | null;
  aprovador_atual_id: string | null;
  aprovador_atual_email: string | null;
  alcada_id: string | null;
  centro_custo_id: string | null;
  centro_resultado_id: string | null;
  natureza_id: string | null;
  data_solicitacao: string;
  prazo_sla: string | null;
  dias_pendente: number;
  acao_via_rpc: boolean;
  link_origem: string;
  payload_resumo: Record<string, unknown>;
};

const QK = ["aprovacoes_unificadas"] as const;

export function useAprovacoesUnificadas() {
  return useQuery({
    queryKey: QK,
    queryFn: async (): Promise<AprovacaoUnificadaRow[]> => {
      // View ainda não está nos tipos gerados; usamos client genérico.
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AprovacaoUnificadaRow[] | null; error: unknown }>;
            };
          };
        };
      })
        .from("v_aprovacoes_unificadas")
        .select("*")
        .order("data_solicitacao", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as AprovacaoUnificadaRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Mapeia link_origem para a rota do app onde o usuário deve "Abrir origem". */
export function rotaDaOrigem(row: AprovacaoUnificadaRow): { to: string; hash?: string } | null {
  const link = row.link_origem ?? "";
  if (link.startsWith("workflow:")) return { to: "/aprovacoes" };
  if (link.startsWith("suprimentos:requisicao:")) return { to: "/suprimentos", hash: "tab=requisicoes" };
  if (link.startsWith("suprimentos:cotacao:")) return { to: "/suprimentos", hash: "tab=cotacoes" };
  if (link.startsWith("suprimentos:pedido:")) return { to: "/suprimentos", hash: "tab=pedidos" };
  return null;
}
