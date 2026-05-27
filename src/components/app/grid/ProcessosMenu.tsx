/**
 * D6.12.1 — ProcessosMenu
 *
 * Dropdown enterprise de "Processos" contextuais (estilo TOTVS RM).
 * Cada item recebe label, ícone, ação, e flags de habilitação dependentes
 * de seleção/permissão. Não executa nada por si — só dispara callbacks.
 *
 * Uso: passar para EnterpriseToolbar via prop `processos`.
 */
import { type ComponentType, type ReactNode } from "react";
import { Workflow, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ProcessoItem = {
  /** Identificador único (usado como key). */
  id: string;
  /** Rótulo visível. */
  label: string;
  /** Ícone Lucide opcional. */
  icon?: ComponentType<{ className?: string }>;
  /** Callback ao clicar. */
  onClick: () => void;
  /** Desabilitar (sem seleção, sem permissão, etc). */
  disabled?: boolean;
  /** Tooltip / motivo do disabled. */
  hint?: string;
  /** Tom visual. */
  tone?: "default" | "primary" | "success" | "danger" | "warning";
  /** Grupo / categoria (renderiza separador + label). */
  group?: string;
};

export type ProcessosMenuProps = {
  items: ProcessoItem[];
  /** Rótulo do botão. Default: "Processos". */
  label?: string;
  /** Contagem de seleção atual (mostra em badge). */
  selecaoCount?: number;
  className?: string;
  /** Render custom (ex.: ReactNode no rodapé do menu). */
  footer?: ReactNode;
};

const toneClass: Record<NonNullable<ProcessoItem["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  danger:  "text-destructive",
  warning: "text-amber-600 dark:text-amber-500",
};

export function ProcessosMenu({
  items, label = "Processos", selecaoCount, className, footer,
}: ProcessosMenuProps) {
  // Agrupa preservando ordem de inserção
  const groups = items.reduce<Record<string, ProcessoItem[]>>((acc, it) => {
    const key = it.group ?? "__default";
    (acc[key] ??= []).push(it);
    return acc;
  }, {});
  const groupKeys = Object.keys(groups);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 px-2 gap-1 text-[11.5px] font-medium rounded text-primary", className)}
          title={label}
        >
          <Workflow className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{label}</span>
          {typeof selecaoCount === "number" && selecaoCount > 0 && (
            <span className="ml-0.5 rounded bg-primary/15 px-1 font-mono text-[10px] tabular-nums text-primary">
              {selecaoCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
          {label}
          {typeof selecaoCount === "number" && (
            <span className="ml-1 font-mono normal-case tracking-normal">
              · {selecaoCount} selecionado{selecaoCount === 1 ? "" : "s"}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groupKeys.map((g, gi) => (
          <div key={g}>
            {g !== "__default" && (
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 pt-2">
                {g}
              </DropdownMenuLabel>
            )}
            {groups[g].map((it) => {
              const Icon = it.icon;
              return (
                <DropdownMenuItem
                  key={it.id}
                  disabled={it.disabled}
                  onSelect={(e) => { e.preventDefault(); if (!it.disabled) it.onClick(); }}
                  title={it.hint}
                  className={cn("text-[12px] gap-2 cursor-pointer", toneClass[it.tone ?? "default"])}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 opacity-80" />}
                  <span className="flex-1">{it.label}</span>
                </DropdownMenuItem>
              );
            })}
            {gi < groupKeys.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
        {footer && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[11px] text-muted-foreground">{footer}</div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
