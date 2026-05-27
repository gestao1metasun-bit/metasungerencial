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
  RefreshCw, History, Paperclip, MoreHorizontal, Save, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ActionFn = () => void;

export type ToolbarMaisAcao = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "success" | "danger" | "warning";
  group?: string;
};

export type EnterpriseToolbarProps = {
  /** Título curto à esquerda (opcional). */
  title?: string;
  /** Contador denso (ex.: nº registros / selecionados). */
  count?: number;
  /** Texto auxiliar (ex.: "3 selecionados"). */
  hint?: string;

  onNovo?: ActionFn;
  onEditar?: ActionFn;
  onSalvar?: ActionFn;
  onAprovar?: ActionFn;
  onCancelar?: ActionFn;
  onExportar?: ActionFn;
  onImprimir?: ActionFn;
  onAtualizar?: ActionFn;
  onFiltrar?: ActionFn;
  onHistorico?: ActionFn;
  onAnexos?: ActionFn;

  /** Habilita/desabilita botões dependentes de seleção. */
  selecionado?: boolean;
  /** Indica salvar pendente (acende o botão). */
  salvarPendente?: boolean;

  /** Slot de Processos (ProcessosMenu) — render livre. */
  processos?: ReactNode;
  /** Ações extras antes do "mais opções". */
  extraActions?: ReactNode;
  /** Ações em lote (renderizadas depois das padrão). */
  loteActions?: ReactNode;
  /** Itens do dropdown "Mais ações" (substitui o botão vazio). */
  maisAcoes?: ToolbarMaisAcao[];

  className?: string;
};

const toneClass: Record<string, string> = {
  default: "text-foreground/80 hover:text-foreground",
  primary: "text-primary hover:text-primary",
  success: "text-success hover:text-success",
  danger:  "text-destructive hover:text-destructive",
  warning: "text-amber-600 dark:text-amber-500 hover:text-amber-700",
};

function ToolbarButton({
  icon: Icon, label, onClick, disabled, tone = "default", emphasize,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: ActionFn;
  disabled?: boolean;
  tone?: "default" | "primary" | "success" | "danger" | "warning";
  emphasize?: boolean;
}) {
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
        emphasize && "bg-primary/10 ring-1 ring-primary/30",
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
  onNovo, onEditar, onSalvar, onAprovar, onCancelar,
  onExportar, onImprimir, onAtualizar, onFiltrar,
  onHistorico, onAnexos,
  selecionado = false, salvarPendente = false,
  processos, extraActions, loteActions, maisAcoes,
  className,
}: EnterpriseToolbarProps) {
  const hasMais = !!maisAcoes && maisAcoes.length > 0;
  const grupos = hasMais
    ? maisAcoes!.reduce<Record<string, ToolbarMaisAcao[]>>((acc, it) => {
        const k = it.group ?? "__default";
        (acc[k] ??= []).push(it);
        return acc;
      }, {})
    : {};
  const grupoKeys = Object.keys(grupos);

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

      {/* Cadastro */}
      {onNovo && <ToolbarButton icon={Plus} label="Novo" onClick={onNovo} tone="primary" />}
      {onEditar && <ToolbarButton icon={Pencil} label="Editar" onClick={onEditar} disabled={!selecionado} />}
      {onSalvar && <ToolbarButton icon={Save} label="Salvar" onClick={onSalvar} tone="primary" emphasize={salvarPendente} />}
      {onAprovar && <ToolbarButton icon={CheckCircle2} label="Aprovar" onClick={onAprovar} disabled={!selecionado} tone="success" />}
      {onCancelar && <ToolbarButton icon={XCircle} label="Cancelar" onClick={onCancelar} disabled={!selecionado} tone="danger" />}

      {(onNovo || onEditar || onSalvar || onAprovar || onCancelar) &&
        (onAtualizar || onFiltrar || onExportar || onImprimir) && <Sep />}

      {/* Visão / dados */}
      {onAtualizar && <ToolbarButton icon={RefreshCw} label="Atualizar" onClick={onAtualizar} />}
      {onFiltrar && <ToolbarButton icon={Filter} label="Filtrar" onClick={onFiltrar} />}
      {onExportar && <ToolbarButton icon={Download} label="Exportar" onClick={onExportar} />}
      {onImprimir && <ToolbarButton icon={Printer} label="Imprimir" onClick={onImprimir} />}

      {(onHistorico || onAnexos) && <Sep />}
      {onHistorico && <ToolbarButton icon={History} label="Histórico" onClick={onHistorico} disabled={!selecionado} />}
      {onAnexos && <ToolbarButton icon={Paperclip} label="Anexos" onClick={onAnexos} disabled={!selecionado} />}

      {processos && (
        <>
          <Sep />
          {processos}
        </>
      )}

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
        {hasMais ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                title="Mais ações"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                Mais ações
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {grupoKeys.map((g, gi) => (
                <div key={g}>
                  {g !== "__default" && (
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 pt-2">
                      {g}
                    </DropdownMenuLabel>
                  )}
                  {grupos[g].map((it) => {
                    const Icon = it.icon;
                    return (
                      <DropdownMenuItem
                        key={it.id}
                        disabled={it.disabled}
                        onSelect={(e) => { e.preventDefault(); if (!it.disabled) it.onClick(); }}
                        className={cn("text-[12px] gap-2 cursor-pointer", toneClass[it.tone ?? "default"])}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5 opacity-80" />}
                        <span className="flex-1">{it.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                  {gi < grupoKeys.length - 1 && <DropdownMenuSeparator />}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground/40"
            title="Mais ações"
            disabled
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

