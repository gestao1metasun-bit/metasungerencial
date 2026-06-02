/**
 * D6.13.2b — EnterpriseRecordToolbar
 *
 * Barra Operacional de Registro / Processos estilo TOTVS RM. Senta LOGO
 * ACIMA do grid e reage à seleção. Mesma barra reutilizada em:
 *   Contas a Receber, Contas a Pagar, Títulos, Propostas, Contratos, PVs,
 *   Engenharia, Estoque, Aprovações, Financiamentos, Compras.
 *
 * NÃO duplicar essa barra por tela. Cada tela apenas:
 *   - declara `entityType`
 *   - passa `selectedIds`
 *   - declara `availableActions` (quais botões básicos fazem sentido)
 *   - declara `availableProcesses` (quais processos contextuais existem)
 *   - passa `permissions` (gating por permissão)
 *   - implementa `onAction` / `onProcess` (handlers reais)
 *
 * Engines reais (workflow, auditoria, motivo obrigatório, RLS) entram nas
 * waves D6.13.3 (Process Engine) e D6.13.4+ (Attachments / Saved Views /
 * Timeline / Governança). Aqui só publicamos contrato visual + reatividade
 * de seleção. Botão crítico nunca é puramente visual — só renderiza se
 * o consumidor passar handler E permissão.
 */
import { useMemo, type ComponentType, type ReactNode } from "react";
import {
  Plus, Pencil, X, Save, RefreshCw, Eye, Trash2, Copy,
  Paperclip, History, MessageSquare, Shield,
  Settings as Cog, ChevronDown, Filter, FilterX,
  Layout, Columns3, Download, Printer, Search,
  CheckCircle2, Send, FileText, Calculator, Wrench,
  PackageCheck, FileSignature, Banknote, Undo2, Wallet,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Rows3, Rows, Square, SquareStack, BarChart3, Mail, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================================================
// Tipos do contrato
// ============================================================================

/** Identificador transversal de entidade. Mesma string usada em audit-store,
 *  workflow_aprovacoes, anexos polimórficos (D6.13.4) e Process Engine. */
export type EnterpriseEntityType =
  | "contas_receber" | "contas_pagar" | "titulos_financeiros"
  | "propostas" | "contratos" | "pedidos_venda"
  | "engenharia" | "estoque" | "aprovacoes"
  | "financiamentos" | "compras"
  | "posvenda" | "operacoes_financeiras";

/** Ações básicas do CRUD/registro (chave canônica). */
export type EnterpriseRecordAction =
  | "novo" | "editar" | "duplicar" | "excluir" | "cancelar" | "salvar"
  | "atualizar" | "visualizar"
  | "anexos" | "historico" | "comentarios" | "auditoria" | "favoritos"
  | "exportar" | "imprimir" | "enviar"
  | "filtroRapido" | "filtroAvancado" | "visoes" | "layout" | "colunas";

/** Processo contextual (entrada do dropdown "Processos"). */
export type EnterpriseProcessItem = {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Permissão exigida — checada contra `permissions`. */
  permissao?: string;
  /** Mínimo de selecionados (default 1). 0 = não exige seleção. */
  requerSelecao?: number;
  /** Aceita execução em lote (>1 selecionado). */
  permiteLote?: boolean;
  /** Destrutivo (vermelho). */
  destructive?: boolean;
  /** Reservado p/ D6.13.3 — motivo obrigatório, workflow, etc. */
  requerMotivo?: boolean;
  /** Grupo lógico para sub-cabeçalho no dropdown (ex.: "Propostas", "Contratos"). */
  group?: string;
};

export type EnterpriseRecordToolbarProps = {
  /** Entidade-alvo. */
  entityType: EnterpriseEntityType;
  /** IDs atualmente selecionados no grid. */
  selectedIds: string[];

  /** Ações básicas habilitadas para esta tela. */
  availableActions?: EnterpriseRecordAction[];
  /** Processos contextuais disponíveis. */
  availableProcesses?: EnterpriseProcessItem[];

  /** Mapa de permissões do usuário ({"financeiro.baixar": true, ...}). */
  permissions?: Record<string, boolean>;

  /** Busca rápida (input inline opcional). */
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;

  /** Handler genérico de ação básica. */
  onAction?: (action: EnterpriseRecordAction, ctx: { selectedIds: string[] }) => void;
  /** Handler de processo contextual. */
  onProcess?: (processKey: string, ctx: { selectedIds: string[] }) => void;

  /** Atalhos diretos quando o consumidor não quer passar pelo onAction. */
  onAttach?: (ctx: { selectedIds: string[] }) => void;
  onHistory?: (ctx: { selectedIds: string[] }) => void;
  onFilter?: () => void;

  /** Slots livres. */
  extraLeft?: ReactNode;
  extraRight?: ReactNode;

  // -------- D17.UI.2 — Modo RM 3 linhas (opt-in) --------
  /** Navegação tipo "459/500" + setas. Quando passada, ativa a navegação. */
  position?: { current: number; total: number };
  onNavigate?: (dir: "first" | "prev" | "next" | "last") => void;
  /** Linha 2 — ações de status circulares coloridas (aprovar/reprovar/baixar/etc). */
  statusActions?: StatusActionItem[];
  /** Linha 3 — barra de Layout estilo RM (presets + densidade + chart). */
  layoutBar?: LayoutBarConfig;

  className?: string;
};

/** Ação de status redonda da Linha 2 (TOTVS RM). */
export type StatusActionItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Cor canônica D17. */
  tone:
    | "success" // verde — aprovar/baixar/confirmar
    | "danger"  // vermelho — reprovar/cancelar/estornar
    | "info"    // azul — visualizar/email/documento
    | "warning" // âmbar — pendência/alerta
    | "primary" // azul forte — ação principal
    | "muted";  // cinza — neutro
  onClick?: () => void;
  disabled?: boolean;
  /** Mostra um pequeno selo (ex.: contagem ou "•"). */
  badge?: string;
};

/** Configuração da Linha 3 (Layout / densidade). */
export type LayoutBarConfig = {
  presets?: { key: string; label: string }[];
  currentPreset?: string;
  onPresetChange?: (key: string) => void;
  /** Botões de densidade/visão de tabela. */
  density?: "compact" | "comfortable" | "spacious";
  onDensityChange?: (d: "compact" | "comfortable" | "spacious") => void;
  /** Slot extra à direita (ex.: gráfico). */
  extra?: ReactNode;
};

// ============================================================================
// Utilitários internos
// ============================================================================

const ALL_ACTIONS: EnterpriseRecordAction[] = [
  "novo", "editar", "duplicar", "excluir", "cancelar", "salvar",
  "atualizar", "visualizar",
  "anexos", "historico", "comentarios", "auditoria", "favoritos",
  "exportar", "imprimir", "enviar",
  "filtroRapido", "filtroAvancado", "visoes", "layout", "colunas",
];

const ACTION_ICON: Record<EnterpriseRecordAction, ComponentType<{ className?: string }>> = {
  novo: Plus, editar: Pencil, duplicar: Copy, excluir: Trash2, cancelar: X, salvar: Save,
  atualizar: RefreshCw, visualizar: Eye,
  anexos: Paperclip, historico: History, comentarios: MessageSquare, auditoria: Shield, favoritos: Star,
  exportar: Download, imprimir: Printer, enviar: Mail,
  filtroRapido: Filter, filtroAvancado: FilterX, visoes: Layout, layout: Layout, colunas: Columns3,
};

const ACTION_LABEL: Record<EnterpriseRecordAction, string> = {
  novo: "Novo", editar: "Editar", duplicar: "Duplicar", excluir: "Excluir", cancelar: "Cancelar", salvar: "Salvar",
  atualizar: "Atualizar", visualizar: "Visualizar",
  anexos: "Anexos", historico: "Histórico", comentarios: "Comentários", auditoria: "Auditoria", favoritos: "Favoritos",
  exportar: "Exportar", imprimir: "Imprimir", enviar: "Enviar",
  filtroRapido: "Filtro rápido", filtroAvancado: "Filtro avançado",
  visoes: "Visões", layout: "Layout", colunas: "Colunas",
};

/** Ícones canônicos para processos comuns (consumidor pode override via `icon`). */
export const ENTERPRISE_PROCESS_ICON_HINT = {
  aprovar: CheckCircle2, enviar: Send, gerarPV: FileText, gerarProjeto: FileSignature,
  gerarTitulos: Calculator, renegociar: Undo2, consolidar: PackageCheck,
  baixar: Banknote, estornar: Undo2, enviarEngenharia: Wrench, reservarMaterial: PackageCheck,
  gerarCompra: Wallet, finalizar: CheckCircle2,
} as const;

function hasPerm(perm: string | undefined, permissions?: Record<string, boolean>) {
  if (!perm) return true;
  if (!permissions) return true; // sem mapa = não bloqueia (gating real entra com Process Engine)
  return !!permissions[perm];
}

function IconBtn({
  icon: Icon, label, onClick, disabled, tone = "default", title,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger" | "muted" | "success" | "warning" | "info";
  title?: string;
}) {
  const toneClass: Record<string, string> = {
    default: "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
    primary: "text-sky-600 hover:text-sky-700 hover:bg-sky-50",
    danger:  "text-red-600 hover:text-red-700 hover:bg-red-50",
    muted:   "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
    success: "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
    warning: "text-amber-600 hover:text-amber-700 hover:bg-amber-50",
    info:    "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50",
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={cn(
        "h-7 w-7 rounded-sm p-0 shrink-0",
        toneClass[tone],
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function Sep() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-border/70" aria-hidden />;
}


// ============================================================================
// Componente
// ============================================================================

export function EnterpriseRecordToolbar({
  entityType,
  selectedIds,
  availableActions = ALL_ACTIONS,
  availableProcesses = [],
  permissions,
  search, onSearchChange, searchPlaceholder = "Buscar…",
  onAction, onProcess,
  onAttach, onHistory, onFilter,
  extraLeft, extraRight,
  position, onNavigate,
  statusActions,
  layoutBar,
  className,
}: EnterpriseRecordToolbarProps) {
  const count = selectedIds.length;
  const mode: "none" | "single" | "multi" =
    count === 0 ? "none" : count === 1 ? "single" : "multi";

  const enabled = useMemo(() => new Set(availableActions), [availableActions]);

  /** Ações visíveis conforme modo de seleção (especificação do briefing). */
  const showAction = (a: EnterpriseRecordAction): boolean => {
    if (!enabled.has(a)) return false;
    switch (mode) {
      case "none":
        return ["novo", "atualizar", "filtroRapido", "filtroAvancado",
                "visoes", "layout", "colunas", "exportar"].includes(a);
      case "single":
        return ["editar", "duplicar", "visualizar", "anexos", "historico",
                "comentarios", "auditoria", "cancelar", "excluir",
                "salvar", "atualizar", "exportar", "imprimir", "enviar",
                "filtroRapido", "filtroAvancado", "visoes", "layout", "colunas"].includes(a);
      case "multi":
        return ["exportar", "imprimir", "enviar", "cancelar", "excluir", "duplicar",
                "atualizar", "filtroRapido", "filtroAvancado",
                "visoes", "layout", "colunas"].includes(a);
    }
  };

  const fire = (a: EnterpriseRecordAction) => {
    if (a === "anexos"   && onAttach)  return onAttach({ selectedIds });
    if (a === "historico" && onHistory) return onHistory({ selectedIds });
    if (a === "filtroRapido" && onFilter) return onFilter();
    onAction?.(a, { selectedIds });
  };

  const renderActionBtn = (a: EnterpriseRecordAction) => {
    if (!showAction(a)) return null;
    const Icon = ACTION_ICON[a];
    const label = ACTION_LABEL[a];
    const tone: "default" | "primary" | "danger" | "muted" | "success" | "warning" | "info" =
      a === "novo" ? "primary"
      : a === "editar" ? "warning"
      : a === "duplicar" ? "info"
      : (a === "excluir" || a === "cancelar") ? "danger"
      : a === "salvar" ? "success"
      : (a === "atualizar" || a === "visualizar") ? "muted"
      : a === "historico" ? "info"
      : a === "comentarios" ? "info"
      : a === "auditoria" ? "warning"
      : a === "exportar" ? "success"
      : a === "imprimir" ? "info"
      : a === "enviar" ? "success"
      : (a === "filtroAvancado" || a === "visoes" || a === "colunas" || a === "layout") ? "info"
      : "default";
    return (
      <IconBtn
        key={a}
        icon={Icon}
        label={label}
        tone={tone}
        onClick={() => fire(a)}
      />
    );
  };

  /** Processos filtrados por seleção + permissão. */
  const processosVisiveis = useMemo(() => {
    return availableProcesses.filter((p) => {
      const min = p.requerSelecao ?? 1;
      if (count < min) return false;
      if (count > 1 && !p.permiteLote) return false;
      if (!hasPerm(p.permissao, permissions)) return false;
      return true;
    });
  }, [availableProcesses, count, permissions]);

  const hasRmRows = !!(statusActions?.length || layoutBar);

  const row1 = (
    <div
      role="toolbar"
      aria-label="Barra Operacional de Registro"
      data-entity-type={entityType}
      data-selection-mode={mode}
      data-selection-count={count}
      className={cn(
        "flex items-center gap-0.5 border border-slate-200",
        "bg-gradient-to-b from-white to-slate-50 px-1.5 py-1 overflow-x-auto shadow-sm",
        hasRmRows ? "rounded-t-sm border-b-0" : "rounded-sm",
      )}
    >
      {/* CRUD — ícones puros estilo RM */}
      {renderActionBtn("novo")}
      {renderActionBtn("editar")}
      {renderActionBtn("duplicar")}
      {renderActionBtn("salvar")}
      {renderActionBtn("excluir")}
      {renderActionBtn("cancelar")}
      <Sep />

      {/* Estado */}
      {renderActionBtn("atualizar")}
      {renderActionBtn("visualizar")}

      {/* Navegação RM (459/500 com setas) */}
      {position && onNavigate && (
        <>
          <Sep />
          <IconBtn icon={ChevronsLeft} label="Primeiro" tone="muted" onClick={() => onNavigate("first")} />
          <IconBtn icon={ChevronLeft} label="Anterior" tone="muted" onClick={() => onNavigate("prev")} />
          <span className="px-1.5 font-mono text-[11.5px] text-slate-700 tabular-nums select-none">
            {position.current}/{position.total}
          </span>
          <IconBtn icon={ChevronRight} label="Próximo" tone="muted" onClick={() => onNavigate("next")} />
          <IconBtn icon={ChevronsRight} label="Último" tone="muted" onClick={() => onNavigate("last")} />
        </>
      )}
      <Sep />

      {/* Anexos (label + chevron, azul) */}
      {enabled.has("anexos") && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fire("anexos")}
          disabled={mode === "none"}
          title="Anexos"
          className="h-7 px-2 gap-1 rounded-sm text-[12px] font-medium text-sky-700 hover:text-sky-800 hover:bg-sky-50"
        >
          <Paperclip className="h-4 w-4" />
          <span>Anexos</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      )}

      {/* Histórico/Comentários/Auditoria — ícones puros */}
      {renderActionBtn("historico")}
      {renderActionBtn("comentarios")}
      {renderActionBtn("auditoria")}

      {/* Processos contextuais (label + chevron, verde/esmeralda) */}
      {processosVisiveis.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 rounded-sm text-[12px] font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              title="Processos disponíveis"
            >
              <Cog className="h-4 w-4" />
              <span>Processos</span>
              {count > 1 && (
                <span className="ml-0.5 rounded bg-background px-1 font-mono text-[10px] border border-border/60">
                  {count}
                </span>
              )}
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[260px]">
            <DropdownMenuLabel className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Processos {count > 1 ? `· lote (${count})` : ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {processosVisiveis.map((p) => {
              const Icon = p.icon ?? Cog;
              return (
                <DropdownMenuItem
                  key={p.key}
                  onClick={() => onProcess?.(p.key, { selectedIds })}
                  className={cn(
                    "text-[12px] gap-2",
                    p.destructive && "text-destructive focus:text-destructive",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="flex-1">{p.label}</span>
                  {p.requerMotivo && (
                    <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
                      motivo
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Sep />

      {/* Filtro estilo "[Filtro: Todos] ▼" do RM — roxo/índigo */}
      {(enabled.has("filtroRapido") || enabled.has("filtroAvancado")) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (onFilter ? onFilter() : fire("filtroRapido"))}
          title="Filtro"
          className="h-7 px-2 gap-1 rounded-sm text-[12px] font-medium text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
        >
          <Filter className="h-4 w-4" />
          <span>Filtros: Todos</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      )}

      {extraLeft}

      <div className="ml-auto flex items-center gap-0">
        {renderActionBtn("filtroAvancado")}
        {renderActionBtn("visoes")}
        {renderActionBtn("colunas")}
        <Sep />
        {renderActionBtn("exportar")}
        {renderActionBtn("imprimir")}
        {renderActionBtn("enviar")}
        {extraRight}
        {count > 0 && (
          <span
            className="ml-1 rounded-sm border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            aria-label={`${count} selecionado(s)`}
          >
            {count} sel.
          </span>
        )}
        {/* D27 — Busca sempre à direita (padrão RM/TOTVS) */}
        {onSearchChange && (
          <>
            <Sep />
            <div className="relative">
              <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-6 w-56 rounded-sm pl-6 text-[11.5px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ------- Linha 2: ações de status (RM circulares coloridas) -------
  const STATUS_TONE: Record<StatusActionItem["tone"], string> = {
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    danger:  "bg-rose-500 text-white hover:bg-rose-600",
    info:    "bg-sky-500 text-white hover:bg-sky-600",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
    primary: "bg-indigo-500 text-white hover:bg-indigo-600",
    muted:   "bg-slate-300 text-slate-700 hover:bg-slate-400",
  };

  const row2 = statusActions?.length ? (
    <div
      role="toolbar"
      aria-label="Ações de status"
      className="flex items-center gap-1 border-x border-slate-200 bg-slate-50 px-1.5 py-1 overflow-x-auto"
    >
      {statusActions.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            type="button"
            disabled={s.disabled}
            onClick={s.onClick}
            title={s.label}
            aria-label={s.label}
            className={cn(
              "relative inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0 transition",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              STATUS_TONE[s.tone],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {s.badge && (
              <span className="absolute -top-1 -right-1 rounded-full bg-white text-[9px] font-mono text-slate-700 border border-slate-300 px-1 leading-none">
                {s.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  // ------- Linha 3: Layout / densidade (estilo "Layout: Padrão ▼ ...") -------
  const row3 = layoutBar ? (
    <div
      role="toolbar"
      aria-label="Layout"
      className="flex items-center gap-1 border border-slate-200 bg-white px-1.5 py-1 rounded-b-sm overflow-x-auto"
    >
      <span className="text-[11.5px] text-slate-600 px-1">Layout:</span>
      {layoutBar.presets && layoutBar.presets.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 gap-1 rounded-sm text-[11.5px]"
            >
              {layoutBar.presets.find((p) => p.key === layoutBar.currentPreset)?.label ?? "Padrão"}
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {layoutBar.presets.map((p) => (
              <DropdownMenuItem
                key={p.key}
                onClick={() => layoutBar.onPresetChange?.(p.key)}
                className="text-[12px]"
              >
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-[11.5px] font-medium text-slate-700 px-1">Padrão</span>
      )}
      <Sep />
      <IconBtn
        icon={Rows3}
        label="Densidade compacta"
        tone={layoutBar.density === "compact" ? "info" : "muted"}
        onClick={() => layoutBar.onDensityChange?.("compact")}
      />
      <IconBtn
        icon={Rows}
        label="Densidade confortável"
        tone={layoutBar.density === "comfortable" ? "info" : "muted"}
        onClick={() => layoutBar.onDensityChange?.("comfortable")}
      />
      <IconBtn
        icon={SquareStack}
        label="Densidade espaçosa"
        tone={layoutBar.density === "spacious" ? "info" : "muted"}
        onClick={() => layoutBar.onDensityChange?.("spacious")}
      />
      {/* D26.1 — removidos 3 ícones decorativos (Square/BarChart3/Mail) sem ação.
          Nenhum botão mudo na Linha 3. Slot `extra` continua disponível p/ visões reais. */}
      <div className="ml-auto">{layoutBar.extra}</div>
    </div>
  ) : null;

  if (!hasRmRows && !position) {
    return <div className={className}>{row1}</div>;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {row1}
      {row2}
      {row3}
    </div>
  );
}


