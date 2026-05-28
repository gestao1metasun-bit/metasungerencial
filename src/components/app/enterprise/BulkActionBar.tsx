/**
 * D17.UI.3 — Barra flutuante de ações em lote (padrão Enterprise RM/TOTVS).
 *
 * Aparece fixada no rodapé quando há linhas selecionadas. Cores canônicas:
 *   azul=visualizar/exportar, verde=aprovar/baixar, vermelho=excluir/cancelar/reprovar,
 *   âmbar=editar, índigo=histórico/auditoria, cinza=neutro.
 *
 * Não acopla a entidade — recebe `count`, `onClear` e `actions`.
 */
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BulkActionTone =
  | "azul" | "verde" | "vermelho" | "ambar" | "indigo" | "cinza";

export type BulkAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: BulkActionTone;
  disabled?: boolean;
  onClick: () => void;
};

export type BulkActionBarProps = {
  count: number;
  label?: string; // ex.: "título(s) selecionado(s)"
  onClear: () => void;
  actions: BulkAction[];
  className?: string;
};

const toneClass: Record<BulkActionTone, string> = {
  azul: "border-sky-500/40 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40",
  verde: "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
  vermelho: "border-rose-500/40 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40",
  ambar: "border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40",
  indigo: "border-indigo-500/40 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40",
  cinza: "border-zinc-400/40 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
};

export function BulkActionBar({
  count, label = "selecionado(s)", onClear, actions, className,
}: BulkActionBarProps) {
  if (count <= 0) return null;
  return (
    <div
      role="region"
      aria-label="Ações em lote"
      className={cn(
        "fixed left-1/2 -translate-x-1/2 bottom-4 z-40",
        "flex items-center gap-2 rounded-md border bg-card shadow-lg",
        "px-3 py-2 text-xs",
        "animate-in fade-in slide-in-from-bottom-2",
        className,
      )}
    >
      <span className="font-medium tabular-nums">
        {count} {label}
      </span>
      <span className="h-4 w-px bg-border mx-1" />
      {actions.map((a) => (
        <Button
          key={a.key}
          size="sm"
          variant="outline"
          disabled={a.disabled}
          onClick={a.onClick}
          className={cn("h-7 px-2 gap-1.5", a.tone && toneClass[a.tone])}
        >
          {a.icon}
          {a.label}
        </Button>
      ))}
      <span className="h-4 w-px bg-border mx-1" />
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="h-7 px-2 gap-1 text-muted-foreground"
        aria-label="Limpar seleção"
      >
        <X className="size-3.5" /> Limpar
      </Button>
    </div>
  );
}
