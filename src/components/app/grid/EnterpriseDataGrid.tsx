// ============================================================================
// EnterpriseDataGrid — wrapper denso ERP (TOTVS RM-like) sobre <Table>.
// Não substitui EnhancedTable: apenas envelopa toolbar + filtros + densidade.
// Filhos devem ser uma <Table> (do shadcn) ou conteúdo equivalente.
// ============================================================================
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GridToolbar, type GridToolbarProps } from "./GridToolbar";
import { GridFiltersBar, type GridFiltersBarProps } from "./GridFiltersBar";
import { useGridDensity, densityClass, type GridDensity } from "./useGridDensity";

export type EnterpriseDataGridProps = {
  /** ID estável para persistir preferências (densidade). */
  gridId: string;
  title?: string;
  count?: number;
  /** Densidade inicial caso não exista preferência salva. */
  initialDensity?: GridDensity;
  toolbar?: Omit<GridToolbarProps, "density" | "onDensityChange"> & {
    leftActions?: ReactNode;
    rightActions?: ReactNode;
  };
  filters?: GridFiltersBarProps;
  children: ReactNode;
  className?: string;
};

export function EnterpriseDataGrid({
  gridId,
  title,
  count,
  initialDensity = "compact",
  toolbar,
  filters,
  children,
  className,
}: EnterpriseDataGridProps) {
  const { density, setDensity } = useGridDensity(gridId, initialDensity);

  return (
    <div
      className={cn(
        "rounded-md border bg-card shadow-sm overflow-hidden",
        className,
      )}
    >
      <GridToolbar
        title={toolbar?.title ?? title}
        count={toolbar?.count ?? count}
        density={density}
        onDensityChange={setDensity}
        onRefresh={toolbar?.onRefresh}
        onExport={toolbar?.onExport}
        leftActions={toolbar?.leftActions}
        rightActions={toolbar?.rightActions}
      />
      {filters && <GridFiltersBar {...filters} />}
      <div className={cn("overflow-auto", densityClass(density))}>{children}</div>
    </div>
  );
}

/** Helper para exportar uma lista em CSV. */
export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T | string; label: string; get?: (r: T) => any }[],
) {
  const esc = (v: any) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(";");
  const lines = rows.map((r) =>
    columns.map((c) => esc(c.get ? c.get(r) : (r as any)[c.key])).join(";"),
  );
  const csv = "\ufeff" + [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
