import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Rows3, Rows2, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GridDensity } from "./useGridDensity";

export type GridToolbarProps = {
  title?: string;
  count?: number;
  density: GridDensity;
  onDensityChange: (d: GridDensity) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  /** Ações primárias à esquerda (ex.: Novo, Aprovar em lote). */
  leftActions?: ReactNode;
  /** Ações secundárias antes dos botões padrão. */
  rightActions?: ReactNode;
  className?: string;
};

export function GridToolbar({
  title,
  count,
  density,
  onDensityChange,
  onRefresh,
  onExport,
  leftActions,
  rightActions,
  className,
}: GridToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b bg-muted/30 px-2 py-1.5",
        className,
      )}
    >
      {title && (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          {typeof count === "number" && (
            <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground">
              {count}
            </span>
          )}
        </div>
      )}
      {leftActions && <div className="flex items-center gap-1">{leftActions}</div>}
      <div className="ml-auto flex items-center gap-1">
        {rightActions}
        <div className="mr-1 inline-flex items-center rounded-md border bg-background p-0.5">
          <button
            type="button"
            title="Densidade compacta"
            onClick={() => onDensityChange("compact")}
            className={cn(
              "rounded px-1.5 py-1 text-muted-foreground hover:text-foreground",
              density === "compact" && "bg-primary/10 text-primary",
            )}
          >
            <Rows3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Densidade confortável"
            onClick={() => onDensityChange("comfortable")}
            className={cn(
              "rounded px-1.5 py-1 text-muted-foreground hover:text-foreground",
              density === "comfortable" && "bg-primary/10 text-primary",
            )}
          >
            <Rows2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onRefresh}
            title="Atualizar"
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Atualizar
          </Button>
        )}
        {onExport && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onExport}
            title="Exportar CSV"
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Exportar
          </Button>
        )}
      </div>
    </div>
  );
}
