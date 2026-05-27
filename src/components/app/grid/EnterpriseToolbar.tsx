/**
 * D6.7 — EnterpriseToolbar.
 *
 * Toolbar operacional corporativa padrão (estilo TOTVS RM / Sankhya / SAP).
 * Não impõe ações: cada tela passa apenas as que faz sentido (callbacks
 * opcionais). Botões padronizados: Novo / Editar / Aprovar / Cancelar /
 * Exportar / Imprimir / Atualizar / Histórico / Anexos.
 *
 * Deve ser usado em conjunto com EnterpriseDataGrid OU isolado no topo da
 * página. Visual denso (h-7), sem hover-translate, sem gradiente.
 */
import type { ComponentType, ReactNode } from "react";
import {
  Plus, Pencil, CheckCircle2, XCircle, Download, Printer,
  RefreshCw, History, Paperclip, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionFn = () => void;

export type EnterpriseToolbarProps = {
  /** Título curto à esquerda (opcional). */
  title?: string;
  /** Contador denso (ex.: nº registros / selecionados). */
  count?: number;
  /** Texto auxiliar (ex.: "3 selecionados"). */
  hint?: string;

  onNovo?: ActionFn;
  onEditar?: ActionFn;
  onAprovar?: ActionFn;
  onCancelar?: ActionFn;
  onExportar?: ActionFn;
  onImprimir?: ActionFn;
  onAtualizar?: ActionFn;
  onHistorico?: ActionFn;
  onAnexos?: ActionFn;

  /** Habilita/desabilita botões dependentes de seleção. */
  selecionado?: boolean;

  /** Ações extras antes do "mais opções". */
  extraActions?: ReactNode;
  /** Ações em lote (renderizadas depois das padrão). */
  loteActions?: ReactNode;

  className?: string;
};

function ToolbarButton({
  icon: Icon, label, onClick, disabled, tone = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: ActionFn;
  disabled?: boolean;
  tone?: "default" | "primary" | "success" | "danger";
}) {
  const toneClass: Record<string, string> = {
    default: "text-foreground/80 hover:text-foreground",
    primary: "text-primary hover:text-primary",
    success: "text-success hover:text-success",
    danger:  "text-destructive hover:text-destructive",
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "h-7 px-2 gap-1.5 text-[11.5px] font-medium rounded",
        toneClass[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-4 w-px bg-border/80" />;
}

export function EnterpriseToolbar({
  title, count, hint,
  onNovo, onEditar, onAprovar, onCancelar,
  onExportar, onImprimir, onAtualizar,
  onHistorico, onAnexos,
  selecionado = false,
  extraActions, loteActions,
  className,
}: EnterpriseToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 border border-border/80 bg-muted/40 px-2 py-1 rounded",
        className,
      )}
      role="toolbar"
      aria-label={title ?? "Toolbar operacional"}
    >
      {title && (
        <div className="mr-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
          {typeof count === "number" && (
            <span className="rounded bg-background px-1.5 py-0 font-mono text-[10px] text-foreground">
              {count}
            </span>
          )}
          {hint && <span className="font-normal normal-case tracking-normal text-[10.5px] text-muted-foreground/80">· {hint}</span>}
        </div>
      )}

      {title && <Sep />}

      {onNovo && <ToolbarButton icon={Plus} label="Novo" onClick={onNovo} tone="primary" />}
      {onEditar && <ToolbarButton icon={Pencil} label="Editar" onClick={onEditar} disabled={!selecionado} />}
      {onAprovar && <ToolbarButton icon={CheckCircle2} label="Aprovar" onClick={onAprovar} disabled={!selecionado} tone="success" />}
      {onCancelar && <ToolbarButton icon={XCircle} label="Cancelar" onClick={onCancelar} disabled={!selecionado} tone="danger" />}

      {(onNovo || onEditar || onAprovar || onCancelar) && (onExportar || onImprimir || onAtualizar || onHistorico || onAnexos) && <Sep />}

      {onExportar && <ToolbarButton icon={Download} label="Exportar" onClick={onExportar} />}
      {onImprimir && <ToolbarButton icon={Printer} label="Imprimir" onClick={onImprimir} />}
      {onAtualizar && <ToolbarButton icon={RefreshCw} label="Atualizar" onClick={onAtualizar} />}

      {(onHistorico || onAnexos) && <Sep />}
      {onHistorico && <ToolbarButton icon={History} label="Histórico" onClick={onHistorico} disabled={!selecionado} />}
      {onAnexos && <ToolbarButton icon={Paperclip} label="Anexos" onClick={onAnexos} disabled={!selecionado} />}

      {extraActions && (
        <>
          <Sep />
          {extraActions}
        </>
      )}

      {loteActions && (
        <>
          <Sep />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Lote</span>
          {loteActions}
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          title="Mais opções"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
