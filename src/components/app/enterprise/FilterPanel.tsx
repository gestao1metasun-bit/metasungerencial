/**
 * D17.UI.1 — FilterPanel (padrão RM/TOTVS)
 *
 * Pílula índigo "Filtros: {resumo}" → abre Popover com slots:
 *   - busca textual
 *   - status (multi-select via children)
 *   - período (início/fim)
 *   - responsável (children livre — Select, Combobox)
 *   - extra (children livre)
 *
 * Estado é controlado pelo consumidor; este componente só padroniza o
 * chrome (pílula trigger + popover + footer Aplicar/Limpar).
 */
import type { ReactNode } from "react";
import { useState } from "react";
import { Filter, X, RotateCcw, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type FilterPanelProps = {
  /** Resumo curto (ex.: "Todos", "Vencidos · Receber"). */
  resumo?: string;
  /** Quantos filtros estão ativos (mostra badge). */
  ativos?: number;

  /** Busca textual (opcional). */
  busca?: string;
  onBuscaChange?: (v: string) => void;
  buscaPlaceholder?: string;

  /** Período (opcional). */
  dataInicio?: string;
  dataFim?: string;
  onPeriodoChange?: (inicio: string, fim: string) => void;

  /** Slots livres. */
  statusSlot?: ReactNode;
  responsavelSlot?: ReactNode;
  extraSlot?: ReactNode;

  onAplicar?: () => void;
  onLimpar?: () => void;

  className?: string;
};

export function FilterPanel({
  resumo = "Todos",
  ativos = 0,
  busca, onBuscaChange, buscaPlaceholder = "Buscar…",
  dataInicio, dataFim, onPeriodoChange,
  statusSlot, responsavelSlot, extraSlot,
  onAplicar, onLimpar,
  className,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          title="Filtros"
        >
          <Filter className="h-4 w-4" />
          <span>Filtros: {resumo}</span>
          {ativos > 0 && (
            <span className="ml-0.5 rounded bg-indigo-600 text-white px-1 font-mono text-[10px]">
              {ativos}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filtros
          </div>
          <Button
            type="button" variant="ghost" size="icon"
            className="h-6 w-6 p-0"
            onClick={() => setOpen(false)}
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-3 p-3">
          {onBuscaChange && (
            <div className="space-y-1">
              <Label className="text-[11px] flex items-center gap-1">
                <Search className="h-3 w-3" /> Busca
              </Label>
              <Input
                value={busca ?? ""}
                onChange={(e) => onBuscaChange(e.target.value)}
                placeholder={buscaPlaceholder}
                className="h-8"
              />
            </div>
          )}

          {statusSlot && (
            <div className="space-y-1">
              <Label className="text-[11px]">Status</Label>
              {statusSlot}
            </div>
          )}

          {onPeriodoChange && (
            <div className="space-y-1">
              <Label className="text-[11px] flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Período
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dataInicio ?? ""}
                  onChange={(e) => onPeriodoChange(e.target.value, dataFim ?? "")}
                  className="h-8"
                />
                <Input
                  type="date"
                  value={dataFim ?? ""}
                  onChange={(e) => onPeriodoChange(dataInicio ?? "", e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          )}

          {responsavelSlot && (
            <div className="space-y-1">
              <Label className="text-[11px]">Responsável</Label>
              {responsavelSlot}
            </div>
          )}

          {extraSlot}
        </div>

        <div className="flex items-center justify-between border-t px-3 py-2 bg-muted/30">
          <Button
            type="button" variant="ghost" size="sm"
            className="h-7 px-2 text-[11.5px] text-muted-foreground"
            onClick={() => { onLimpar?.(); }}
            title="Limpar filtros"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Limpar
          </Button>
          <Button
            type="button" size="sm"
            className="h-7 px-3 text-[11.5px]"
            onClick={() => { onAplicar?.(); setOpen(false); }}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
