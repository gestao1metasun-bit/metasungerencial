/**
 * D17.UI.1 — RowActions (padrão RM/TOTVS)
 *
 * Ações por linha do grid, padronizadas em toda tela operacional.
 * Cores canônicas:
 *   azul    → visualizar, anexos
 *   âmbar   → editar
 *   índigo  → histórico, auditoria, comentários
 *   verde   → aprovar, baixar, avançar
 *   vermelho→ excluir, cancelar, reprovar, estornar
 *   cinza   → duplicar, neutro
 *
 * Sem texto, só ícone + tooltip. Cabe na primeira coluna sticky de
 * qualquer EnterpriseDataGrid. Overflow vai pro dropdown "⋯".
 */
import type { ComponentType } from "react";
import {
  Eye, Pencil, Copy, Trash2, X, Paperclip, History,
  Shield, CheckCircle2, XCircle, MoreHorizontal, MessageSquare,
  Banknote, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowActionKind =
  | "visualizar" | "editar" | "duplicar"
  | "excluir" | "cancelar"
  | "anexos" | "historico" | "auditoria" | "comentarios"
  | "aprovar" | "reprovar"
  | "baixar" | "estornar";

export type RowAction = {
  kind: RowActionKind;
  label?: string;
  disabled?: boolean;
  permissao?: string;
  badgeCount?: number;
  /** Override de ícone. */
  icon?: ComponentType<{ className?: string }>;
  /** Mover para dropdown ⋯. */
  overflow?: boolean;
};

export type RowActionsProps<TId = string> = {
  rowId: TId;
  actions: RowAction[];
  permissions?: Record<string, boolean>;
  onAction: (kind: RowActionKind, rowId: TId) => void;
  className?: string;
};

const ICON: Record<RowActionKind, ComponentType<{ className?: string }>> = {
  visualizar: Eye, editar: Pencil, duplicar: Copy,
  excluir: Trash2, cancelar: X,
  anexos: Paperclip, historico: History, auditoria: Shield, comentarios: MessageSquare,
  aprovar: CheckCircle2, reprovar: XCircle,
  baixar: Banknote, estornar: Undo2,
};

const LABEL: Record<RowActionKind, string> = {
  visualizar: "Visualizar", editar: "Editar", duplicar: "Duplicar",
  excluir: "Excluir", cancelar: "Cancelar",
  anexos: "Anexos", historico: "Histórico", auditoria: "Auditoria", comentarios: "Comentários",
  aprovar: "Aprovar", reprovar: "Reprovar",
  baixar: "Baixar", estornar: "Estornar",
};

type Tone = "primary" | "warning" | "muted" | "info" | "success" | "danger";

const TONE: Record<RowActionKind, Tone> = {
  visualizar: "primary", anexos: "primary",
  editar: "warning",
  duplicar: "muted",
  excluir: "danger", cancelar: "danger", reprovar: "danger", estornar: "danger",
  historico: "info", auditoria: "info", comentarios: "info",
  aprovar: "success", baixar: "success",
};

const TONE_CLASS: Record<Tone, string> = {
  primary: "text-sky-600 hover:text-sky-700 hover:bg-sky-50",
  warning: "text-amber-600 hover:text-amber-700 hover:bg-amber-50",
  muted:   "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
  info:    "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50",
  success: "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
  danger:  "text-red-600 hover:text-red-700 hover:bg-red-50",
};

const TONE_TEXT_CLASS: Record<Tone, string> = {
  primary: "text-sky-700",
  warning: "text-amber-700",
  muted:   "text-slate-700",
  info:    "text-indigo-700",
  success: "text-emerald-700",
  danger:  "text-red-700",
};

function allowed(a: RowAction, perms?: Record<string, boolean>) {
  if (!a.permissao) return true;
  if (!perms) return true;
  return !!perms[a.permissao];
}

export function RowActions<TId = string>({
  rowId, actions, permissions, onAction, className,
}: RowActionsProps<TId>) {
  const visible = actions.filter((a) => allowed(a, permissions));
  const inline = visible.filter((a) => !a.overflow);
  const overflow = visible.filter((a) => a.overflow);

  return (
    <div
      className={cn("flex items-center gap-0.5 justify-end", className)}
      role="group"
      aria-label="Ações da linha"
      onClick={(e) => e.stopPropagation()}
    >
      {inline.map((a) => {
        const Icon = a.icon ?? ICON[a.kind];
        const tone = TONE[a.kind];
        return (
          <Button
            key={a.kind}
            type="button"
            variant="ghost"
            size="icon"
            disabled={a.disabled}
            onClick={() => onAction(a.kind, rowId)}
            title={a.label ?? LABEL[a.kind]}
            aria-label={a.label ?? LABEL[a.kind]}
            className={cn("h-7 w-7 rounded-sm p-0 shrink-0 relative", TONE_CLASS[tone])}
          >
            <Icon className="h-3.5 w-3.5" />
            {typeof a.badgeCount === "number" && a.badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-sky-600 text-white text-[9px] font-semibold leading-[14px] text-center">
                {a.badgeCount > 99 ? "99+" : a.badgeCount}
              </span>
            )}
          </Button>
        );
      })}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sm p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              title="Mais ações"
              aria-label="Mais ações"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {overflow.map((a) => {
              const Icon = a.icon ?? ICON[a.kind];
              const tone = TONE[a.kind];
              return (
                <DropdownMenuItem
                  key={a.kind}
                  disabled={a.disabled}
                  onSelect={(e) => { e.preventDefault(); if (!a.disabled) onAction(a.kind, rowId); }}
                  className={cn("text-[12px] gap-2 cursor-pointer", TONE_TEXT_CLASS[tone])}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{a.label ?? LABEL[a.kind]}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
