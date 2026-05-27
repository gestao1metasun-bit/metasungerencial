/**
 * D6.13.2 — EntityStatusBadge
 *
 * Wrapper enterprise sobre StatusBadge. Mesma aparência visual, mas com:
 *   - prop tipada `entidade` (futuramente plugada no status-catalog oficial)
 *   - prop opcional `tone` para override semântico quando o status não está
 *     mapeado no StatusBadge legado.
 *
 * Não substitui StatusBadge ainda — coexiste. As telas críticas migram
 * em wave separada, junto com a padronização de status oficiais (D9.1.3).
 */
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/app/StatusBadge";
import { cn } from "@/lib/utils";

export type EntityStatusTone =
  | "neutral" | "info" | "success" | "warning" | "danger" | "primary";

const toneClass: Record<EntityStatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info:    "bg-info/15 text-info border-info/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger:  "bg-destructive/15 text-destructive border-destructive/30",
  primary: "bg-primary/15 text-primary border-primary/30",
};

export type EntityStatusBadgeProps = {
  status: string;
  /** Identificador da entidade (ex.: "pedidos_venda"). Reservado para D9. */
  entidade?: string;
  /** Override visual quando o status não está no mapa do StatusBadge legado. */
  tone?: EntityStatusTone;
  className?: string;
};

export function EntityStatusBadge({ status, tone, className }: EntityStatusBadgeProps) {
  if (tone) {
    return (
      <Badge variant="outline" className={cn(toneClass[tone], "font-medium", className)}>
        {status}
      </Badge>
    );
  }
  return <StatusBadge status={status} />;
}
