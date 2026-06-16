/**
 * C-ENT.6 — Repositório oficial de Timeline Universal.
 * Tabela `eventos_timeline` (append-only). Registro via RPC `rpc_timeline_registrar`.
 * Eventos NÃO são editáveis nem excluíveis pela UI (triggers bloqueiam UPDATE/DELETE).
 */
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ObjetoTipo =
  | "cliente" | "lead" | "proposta" | "contrato" | "projeto" | "projeto_contrato"
  | "aditivo" | "obra" | "titulo_financeiro" | "comissao" | "operacao_financeira"
  | "os" | "pedido_venda" | "requisicao_material" | "pedido_compra";

export interface EventoTimeline {
  id: string;
  objeto_tipo: ObjetoTipo;
  objeto_id: string;
  evento_tipo: string;
  titulo: string;
  descricao: string | null;
  usuario_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export const timelineRepo = {
  async listar(objetoTipo: ObjetoTipo, objetoId: string, limite = 200): Promise<EventoTimeline[]> {
    const { data, error } = await supabase
      .from("eventos_timeline" as never)
      .select("*")
      .eq("objeto_tipo", objetoTipo)
      .eq("objeto_id", objetoId)
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data ?? []) as unknown as EventoTimeline[];
  },

  async registrar(p: {
    objetoTipo: ObjetoTipo;
    objetoId: string;
    eventoTipo: string;
    titulo: string;
    descricao?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<string> {
    const { data, error } = await supabase.rpc("rpc_timeline_registrar" as never, {
      _objeto_tipo: p.objetoTipo,
      _objeto_id: p.objetoId,
      _evento_tipo: p.eventoTipo,
      _titulo: p.titulo,
      _descricao: p.descricao ?? null,
      _payload: p.payload ?? {},
    } as never);
    if (error) throw error;
    return data as unknown as string;
  },
};

export function useTimeline(objetoTipo: ObjetoTipo, objetoId?: string | null, limite = 200) {
  return useQuery({
    queryKey: ["timeline", objetoTipo, objetoId, limite],
    queryFn: () => timelineRepo.listar(objetoTipo, objetoId!, limite),
    enabled: !!objetoId,
  });
}

export function useRegistrarEventoTimeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: timelineRepo.registrar,
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["timeline", p.objetoTipo, p.objetoId] });
    },
  });
}
