// ============================================================================
// D17.UI Fase 2 — Central de Assinaturas (timeline cross-contrato).
// READ-ONLY: lê comercial_assinatura_eventos via RLS. Não toca backend.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnterpriseRecordToolbar, ModuloHistoricoDrawer } from "@/components/app/enterprise";
import { FileSignature, CheckCircle2, Wrench, Banknote, Paperclip } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/assinaturas")({
  head: () => ({
    meta: [
      { title: "Central de Assinaturas — Meta Sun" },
      { name: "description", content: "Trilha cronológica de assinaturas de contrato com timeline e anexos." },
    ],
  }),
  component: AssinaturasPage,
});

type EventoAssinatura = {
  id: string;
  contrato_id: string;
  assinado_por: string;
  assinado_em: string;
  permissao_usada: string;
  observacao: string | null;
  ip_origem: string | null;
  user_agent: string | null;
  hash_evento: string | null;
  dispatched_eng: boolean;
  dispatched_fin: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const fmtData = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function useAssinaturasGlobais() {
  return useQuery({
    queryKey: ["assinaturas-globais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_assinatura_eventos" as never)
        .select("*")
        .order("assinado_em", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as EventoAssinatura[];
    },
    staleTime: 30_000,
  });
}

function AssinaturasPage() {
  const { data = [], isLoading, refetch, isFetching } = useAssinaturasGlobais();
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return data;
    return data.filter((e) =>
      [e.contrato_id, e.assinado_por, e.observacao ?? "", e.permissao_usada].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [data, busca]);

  return (
    <div className="space-y-3 p-2 md:p-3">
      <PageHeader
        eyebrow="Comercial · Trilha de Assinaturas"
        title="Central de Assinaturas"
        subtitle="Timeline cronológica dos eventos de assinatura de contrato."
      />

      <EnterpriseRecordToolbar
        entityType="contratos"
        selectedIds={[]}
        availableActions={["atualizar", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
        searchPlaceholder="Buscar contrato, assinante, observação…"
        search={busca}
        onSearchChange={setBusca}
        onAction={(a) => {
          if (a === "atualizar") void refetch();
          else if (a === "imprimir") window.print();
          else if (a === "colunas") toast.info("Gestor de colunas universal chega em D17.UI.4c.");
          else if (a === "historico") toast.info("Esta tela já é a timeline de histórico oficial.");
          else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.4c.");
        }}
      />

      <Card className="p-4">
        {isLoading || isFetching ? (
          <div className="text-xs text-muted-foreground">Carregando trilha…</div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum evento de assinatura encontrado.
          </div>
        ) : (
          <ol className="relative border-l-2 border-primary/20 pl-4 space-y-3">
            {filtrados.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[22px] top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                  <FileSignature className="h-2.5 w-2.5" />
                </span>
                <div className="rounded border border-border/70 bg-card p-2.5 text-[12.5px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-primary">
                      Contrato {e.contrato_id.slice(0, 8)}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-medium">{e.assinado_por}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{fmtData(e.assinado_em)}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {e.dispatched_eng && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          <Wrench className="mr-1 h-3 w-3" /> Eng liberada
                        </Badge>
                      )}
                      {e.dispatched_fin && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          <Banknote className="mr-1 h-3 w-3" /> Fin liberado
                        </Badge>
                      )}
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3 text-success" /> {e.permissao_usada}
                      </Badge>
                    </div>
                  </div>
                  {e.observacao && (
                    <div className="mt-1.5 text-muted-foreground">{e.observacao}</div>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10.5px] text-muted-foreground/80 font-mono">
                    {e.ip_origem && <span>IP {e.ip_origem}</span>}
                    {e.hash_evento && <span>hash {e.hash_evento.slice(0, 12)}…</span>}
                    <span className="ml-auto inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Anexos via detalhe do contrato
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
