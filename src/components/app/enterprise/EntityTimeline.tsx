/**
 * D6.13.2 — EntityTimeline
 *
 * Extensão de HistoricoTimeline com filtros por tipo de evento. Por enquanto
 * delega 100% ao HistoricoTimeline existente (mesma fonte: audit-store local
 * + getAuditByEntity server). O filtro por tipo será ligado em D6.13.6, quando
 * a view `v_entity_timeline` consolidar audit + workflow + anexos + comentários.
 *
 * API estável agora para que telas já adotem esse componente — a engine
 * cresce por baixo sem quebrar o consumidor.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HistoricoTimeline } from "@/components/app/HistoricoTimeline";
import type { AuditEntidade } from "@/lib/audit-store";

export type EntityTimelineEventType = "audit" | "workflow" | "anexo" | "comentario";

export type EntityTimelineProps = {
  entidade: AuditEntidade;
  entidadeId: string;
  /** Filtros disponíveis (visuais por enquanto — engine real em D6.13.6). */
  tiposDisponiveis?: EntityTimelineEventType[];
  className?: string;
};

const LABEL: Record<EntityTimelineEventType, string> = {
  audit: "Auditoria",
  workflow: "Workflow",
  anexo: "Anexos",
  comentario: "Comentários",
};

export function EntityTimeline({
  entidade, entidadeId, tiposDisponiveis = ["audit"], className,
}: EntityTimelineProps) {
  const [ativos, setAtivos] = useState<Set<EntityTimelineEventType>>(
    () => new Set(tiposDisponiveis),
  );

  const toggle = (t: EntityTimelineEventType) => {
    setAtivos((cur) => {
      const next = new Set(cur);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {tiposDisponiveis.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border pb-1">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground mr-1">
            Filtrar
          </span>
          {tiposDisponiveis.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={ativos.has(t) ? "secondary" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => toggle(t)}
            >
              {LABEL[t]}
            </Button>
          ))}
        </div>
      )}
      <HistoricoTimeline entidade={entidade} entidadeId={entidadeId} />
    </div>
  );
}
