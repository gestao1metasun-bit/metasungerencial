/**
 * C-ENT.6 — Componente Universal de Timeline por Objeto.
 * Fonte: tabela append-only `public.eventos_timeline`.
 * Eventos NÃO podem ser editados nem excluídos pela UI (triggers DB bloqueiam).
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User } from "lucide-react";
import { useTimeline, type ObjetoTipo } from "@/lib/repositories/timeline-repo";

interface Props {
  objetoTipo: ObjetoTipo;
  objetoId: string;
  limite?: number;
}

export function TimelineObjetoPanel({ objetoTipo, objetoId, limite = 100 }: Props) {
  const q = useTimeline(objetoTipo, objetoId, limite);

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <History className="h-4 w-4" /> Timeline operacional
        </div>
        <div className="text-xs text-muted-foreground">{q.data?.length ?? 0} evento(s)</div>
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando timeline…
        </div>
      ) : q.isError ? (
        <div className="text-sm text-destructive py-4">Falha ao carregar timeline.</div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Nenhum evento registrado ainda.
        </div>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-3">
          {(q.data ?? []).map((e) => (
            <li key={e.id} className="ml-3">
              <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-primary" />
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{e.evento_tipo}</Badge>
                <span className="text-sm font-medium">{e.titulo}</span>
              </div>
              {e.descricao && (
                <div className="text-xs text-muted-foreground mt-0.5">{e.descricao}</div>
              )}
              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                {e.usuario_id && (
                  <span className="flex items-center gap-0.5">
                    <User className="h-3 w-3" />
                    <span className="font-mono">{e.usuario_id.slice(0, 8)}</span>
                  </span>
                )}
              </div>
              {e.payload && Object.keys(e.payload).length > 0 && (
                <details className="mt-1">
                  <summary className="text-[11px] text-muted-foreground cursor-pointer">payload</summary>
                  <pre className="text-[10px] bg-muted/30 rounded p-1 mt-1 overflow-x-auto">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
