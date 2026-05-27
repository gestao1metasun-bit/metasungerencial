/**
 * D6.9 — RecordToolbar (estilo TOTVS RM / Sankhya / SAP desktop).
 *
 * Barra densa de manipulação de REGISTROS (linha selecionada da grid),
 * complementar ao EnterpriseToolbar. Mimetiza a faixa clássica do RM:
 *
 *   [+] [✎] [✕] | [⟳] | [⏮ ⏶ 1/254 ⏷ ⏭] | [🔍] | [☰] | [⎘ ▼] | [📎 Anexos ▼]
 *   [⚙ Processos ▼] | [▽ Filtro: Todos ▼] | [Layout: Padrão ▼ …]
 *
 * Sem regra de negócio: tudo via callbacks opcionais. Cada tela ativa só os
 * controles que faz sentido. Foco em densidade ERP, ícones compactos (h-3.5),
 * separadores verticais, sem hover-translate.
 */
import { useId, type ComponentType, type ReactNode } from "react";
import {
  Plus, Pencil, X, RefreshCw, Search, Columns3,
  ChevronFirst, ChevronLast, ChevronUp, ChevronDown,
  Paperclip, Settings as Cog, Filter, Layout, ChevronDown as Caret,
  Copy, Printer, Download, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FlagPicker } from "@/components/app/flags/FlagPicker";

type ActionFn = () => void;

export type ProcessoItem = {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: ActionFn;
  disabled?: boolean;
  destructive?: boolean;
};

export type FiltroItem = {
  key: string;
  label: string;
  count?: number;
  active?: boolean;
  onClick: ActionFn;
};

export type LayoutItem = {
  key: string;
  label: string;
  active?: boolean;
  onClick: ActionFn;
};

export type RecordToolbarProps = {
  /** Linha atual (1-based). Se omitido, navegação não renderiza. */
  current?: number;
  /** Total de registros. */
  total?: number;
  onFirst?: ActionFn;
  onPrev?: ActionFn;
  onNext?: ActionFn;
  onLast?: ActionFn;

  /** Busca rápida (input inline). */
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;

  /** CRUD primário. */
  onNovo?: ActionFn;
  onEditar?: ActionFn;
  onExcluir?: ActionFn;
  onAtualizar?: ActionFn;
  onDuplicar?: ActionFn;
  onExportar?: ActionFn;
  onImprimir?: ActionFn;

  /** Habilita ações dependentes de seleção. */
  selecionado?: boolean;

  /** Colunas / visibilidade. */
  onColunas?: ActionFn;

  /** Anexos. */
  onAnexos?: ActionFn;
  anexosCount?: number;

  /** Flag — sinalização universal (D6.10). Passe `flagEntidade` + `flagRegistroId`. */
  flagEntidade?: string;
  flagRegistroId?: string | null;

  /** Processos (dropdown corporativo — sincronização, geração, importação…). */
  processos?: ProcessoItem[];

  /** Filtros nomeados (rápidos). */
  filtros?: FiltroItem[];
  filtroAtivoLabel?: string;

  /** Layouts salvos (visões). */
  layouts?: LayoutItem[];
  layoutAtivoLabel?: string;
  onSalvarLayout?: ActionFn;
  onGerenciarLayouts?: ActionFn;

  /** Slots livres. */
  extraLeft?: ReactNode;
  extraRight?: ReactNode;

  className?: string;
};

function IconBtn({
  icon: Icon, label, onClick, disabled, tone = "default", className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: ActionFn;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger" | "muted";
  className?: string;
}) {
  const toneClass: Record<string, string> = {
    default: "text-foreground/80 hover:text-foreground",
    primary: "text-primary hover:text-primary",
    danger:  "text-destructive hover:text-destructive",
    muted:   "text-muted-foreground hover:text-foreground",
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn("h-7 w-7 rounded-sm", toneClass[tone], className)}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border/80" />;
}

export function RecordToolbar({
  current, total,
  onFirst, onPrev, onNext, onLast,
  search, onSearchChange, searchPlaceholder = "Buscar…",
  onNovo, onEditar, onExcluir, onAtualizar, onDuplicar, onExportar, onImprimir,
  selecionado = false,
  onColunas,
  onAnexos, anexosCount,
  processos, filtros, filtroAtivoLabel,
  layouts, layoutAtivoLabel, onSalvarLayout, onGerenciarLayouts,
  extraLeft, extraRight,
  className,
}: RecordToolbarProps) {
  const searchId = useId();
  const hasNav = typeof current === "number" && typeof total === "number";

  return (
    <div
      role="toolbar"
      aria-label="Operações do registro"
      className={cn(
        "flex flex-wrap items-center gap-0.5 border border-border/80 bg-muted/30 px-1.5 py-1 rounded",
        className,
      )}
    >
      {/* CRUD primário */}
      {onNovo &&    <IconBtn icon={Plus}    label="Novo (Ins)"        onClick={onNovo}    tone="primary" />}
      {onEditar &&  <IconBtn icon={Pencil}  label="Editar (F2)"       onClick={onEditar}  disabled={!selecionado} />}
      {onExcluir && <IconBtn icon={X}       label="Excluir (Del)"     onClick={onExcluir} disabled={!selecionado} tone="danger" />}
      {onDuplicar && <IconBtn icon={Copy}   label="Duplicar"          onClick={onDuplicar} disabled={!selecionado} tone="muted" />}
      {(onNovo || onEditar || onExcluir || onDuplicar) && <Sep />}

      {onAtualizar && <IconBtn icon={RefreshCw} label="Atualizar (F5)" onClick={onAtualizar} tone="muted" />}
      {onAtualizar && <Sep />}

      {/* Navegação por registro estilo RM (⏮ ⏶ 1/254 ⏷ ⏭) */}
      {hasNav && (
        <>
          <IconBtn icon={ChevronFirst} label="Primeiro" onClick={onFirst} disabled={!onFirst || current === 1} tone="muted" />
          <IconBtn icon={ChevronUp}    label="Anterior" onClick={onPrev}  disabled={!onPrev  || current === 1} tone="muted" />
          <span className="px-1.5 font-mono text-[11px] tabular-nums text-foreground/80 select-none">
            {current}<span className="text-muted-foreground">/</span>{total}
          </span>
          <IconBtn icon={ChevronDown}  label="Próximo"  onClick={onNext}  disabled={!onNext  || current === total} tone="muted" />
          <IconBtn icon={ChevronLast}  label="Último"   onClick={onLast}  disabled={!onLast  || current === total} tone="muted" />
          <Sep />
        </>
      )}

      {/* Busca rápida */}
      {onSearchChange && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchId}
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-7 w-52 rounded-sm pl-6 text-[11.5px]"
          />
        </div>
      )}

      {/* Colunas / layout grid */}
      {onColunas && (
        <>
          <Sep />
          <IconBtn icon={Columns3} label="Colunas visíveis" onClick={onColunas} tone="muted" />
        </>
      )}

      {/* Export / Print */}
      {(onExportar || onImprimir) && <Sep />}
      {onExportar && <IconBtn icon={Download} label="Exportar" onClick={onExportar} tone="muted" />}
      {onImprimir && <IconBtn icon={Printer}  label="Imprimir" onClick={onImprimir} tone="muted" />}

      {/* Anexos */}
      {onAnexos && (
        <>
          <Sep />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAnexos}
            disabled={!selecionado}
            className="h-7 px-2 gap-1 rounded-sm text-[11.5px] text-foreground/80"
            title="Anexos do registro"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Anexos</span>
            {typeof anexosCount === "number" && anexosCount > 0 && (
              <span className="ml-0.5 rounded bg-background px-1 py-0 font-mono text-[10px] text-foreground border border-border/60">
                {anexosCount}
              </span>
            )}
          </Button>
        </>
      )}

      {extraLeft}

      {/* Processos (dropdown estilo TOTVS) */}
      {processos && processos.length > 0 && (
        <>
          <Sep />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 rounded-sm text-[11.5px] text-foreground/80"
                title="Processos disponíveis"
              >
                <Cog className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Processos</span>
                <Caret className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[240px]">
              <DropdownMenuLabel className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Processos
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {processos.map((p) => {
                const Icon = p.icon ?? Cog;
                return (
                  <DropdownMenuItem
                    key={p.key}
                    disabled={p.disabled}
                    onClick={p.onClick}
                    className={cn(
                      "text-[12px] gap-2",
                      p.destructive && "text-destructive focus:text-destructive",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {p.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Filtro nomeado */}
      {filtros && filtros.length > 0 && (
        <>
          <Sep />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 rounded-sm text-[11.5px] text-foreground/80"
                title="Filtros rápidos"
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden md:inline">
                  Filtro: <strong className="font-semibold">{filtroAtivoLabel ?? "Todos"}</strong>
                </span>
                <Caret className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px]">
              <DropdownMenuLabel className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Filtros
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filtros.map((f) => (
                <DropdownMenuItem
                  key={f.key}
                  onClick={f.onClick}
                  className={cn("text-[12px] gap-2 justify-between", f.active && "bg-accent/60 font-semibold")}
                >
                  <span>{f.label}</span>
                  {typeof f.count === "number" && (
                    <span className="font-mono text-[10.5px] text-muted-foreground">{f.count}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Layouts (visões salvas) */}
      {layouts && layouts.length > 0 && (
        <>
          <Sep />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 rounded-sm text-[11.5px] text-foreground/80"
                title="Visões / layouts salvos"
              >
                <Layout className="h-3.5 w-3.5" />
                <span className="hidden md:inline">
                  Layout: <strong className="font-semibold">{layoutAtivoLabel ?? "Padrão"}</strong>
                </span>
                <Caret className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              <DropdownMenuLabel className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Visões salvas
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {layouts.map((l) => (
                <DropdownMenuItem
                  key={l.key}
                  onClick={l.onClick}
                  className={cn("text-[12px]", l.active && "bg-accent/60 font-semibold")}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
              {(onSalvarLayout || onGerenciarLayouts) && <DropdownMenuSeparator />}
              {onSalvarLayout && (
                <DropdownMenuItem onClick={onSalvarLayout} className="text-[12px]">
                  Salvar visão atual…
                </DropdownMenuItem>
              )}
              {onGerenciarLayouts && (
                <DropdownMenuItem onClick={onGerenciarLayouts} className="text-[12px]">
                  Gerenciar visões…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        {extraRight}
        <IconBtn icon={MoreHorizontal} label="Mais opções" tone="muted" />
      </div>
    </div>
  );
}
