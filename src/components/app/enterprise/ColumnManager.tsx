/**
 * D17.UI.1 — ColumnManager (livrinho RM/TOTVS)
 *
 * Botão "Colunas" (Columns3) + Popover. Permite:
 *   - mostrar/ocultar coluna
 *   - reordenar (setas ▲ ▼)
 *   - restaurar padrão
 *
 * Persiste via `useColumnPrefs` (LS namespaced por usuário + entidade).
 *
 * Uso:
 *   const prefs = useColumnPrefs("titulos_financeiros", COLS, user.email);
 *   <ColumnManager entity="titulos_financeiros" columns={COLS} prefs={prefs} />
 *   {prefs.visibleKeys.map(k => ...)}
 */
import { Columns3, ChevronUp, ChevronDown, RotateCcw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/lib/ui/column-prefs";
import { useColumnPrefs } from "@/lib/ui/column-prefs";

export type ColumnManagerPrefs = ReturnType<typeof useColumnPrefs>;

export type ColumnManagerProps = {
  /** Identificador da entidade — usado na chave LS. */
  entity: string;
  /** Lista completa de colunas (origem da verdade). */
  columns: ColumnDef[];
  /** Resultado do hook useColumnPrefs (já instanciado pelo consumidor). */
  prefs: ColumnManagerPrefs;
  className?: string;
  /** Rótulo opcional do botão (default: "Colunas"). */
  label?: string;
};

export function ColumnManager({
  entity, columns, prefs, className, label = "Colunas",
}: ColumnManagerProps) {
  const byKey = new Map(columns.map((c) => [c.key, c]));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1 rounded-sm text-[12px] font-medium",
            "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50",
            className,
          )}
          title="Configurar colunas"
          data-entity={entity}
        >
          <Columns3 className="h-4 w-4" />
          <span className="hidden md:inline">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Colunas
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] text-muted-foreground"
            onClick={prefs.reset}
            title="Restaurar padrão"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Padrão
          </Button>
        </div>
        <ScrollArea className="max-h-[320px]">
          <ul className="py-1">
            {prefs.order.map((key, idx) => {
              const col = byKey.get(key);
              if (!col) return null;
              const visible = prefs.isVisible(key);
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={visible}
                    disabled={col.locked}
                    onCheckedChange={(v) => prefs.setVisible(key, !!v)}
                    aria-label={`Mostrar ${col.label}`}
                  />
                  <span className={cn(
                    "flex-1 text-[12px] truncate",
                    !visible && "text-muted-foreground line-through",
                  )}>
                    {col.label}
                  </span>
                  {col.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  <div className="flex items-center">
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-6 w-6 rounded-sm p-0"
                      disabled={idx === 0 || col.locked}
                      onClick={() => prefs.reorder(key, -1)}
                      title="Mover para cima"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-6 w-6 rounded-sm p-0"
                      disabled={idx === prefs.order.length - 1 || col.locked}
                      onClick={() => prefs.reorder(key, +1)}
                      title="Mover para baixo"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
