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
  Plus, Pencil, X, Save, RefreshCw, Eye, Trash2,
  Paperclip, History, MessageSquare, Shield,
  Settings as Cog, ChevronDown, Filter, FilterX,
  Layout, Columns3, Download, Printer, Search,
  CheckCircle2, Send, FileText, Calculator, Wrench,
  PackageCheck, FileSignature, Banknote, Undo2, Wallet,
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
  | "financiamentos" | "compras";

/** Ações básicas do CRUD/registro (chave canônica). */
export type EnterpriseRecordAction =
  | "novo" | "editar" | "excluir" | "cancelar" | "salvar"
  | "atualizar" | "visualizar"
  | "anexos" | "historico" | "comentarios" | "auditoria"
  | "exportar" | "imprimir"
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

  className?: string;
};

// ============================================================================
// Utilitários internos
// ============================================================================

const ALL_ACTIONS: EnterpriseRecordAction[] = [
  "novo", "editar", "excluir", "cancelar", "salvar",
  "atualizar", "visualizar",
  "anexos", "historico", "comentarios", "auditoria",
  "exportar", "imprimir",
  "filtroRapido", "filtroAvancado", "visoes", "layout", "colunas",
];

const ACTION_ICON: Record<EnterpriseRecordAction, ComponentType<{ className?: string }>> = {
  novo: Plus, editar: Pencil, excluir: Trash2, cancelar: X, salvar: Save,
  atualizar: RefreshCw, visualizar: Eye,
  anexos: Paperclip, historico: History, comentarios: MessageSquare, auditoria: Shield,
  exportar: Download, imprimir: Printer,
  filtroRapido: Filter, filtroAvancado: FilterX, visoes: Layout, layout: Layout, colunas: Columns3,
};

const ACTION_LABEL: Record<EnterpriseRecordAction, string> = {
  novo: "Novo", editar: "Editar", excluir: "Excluir", cancelar: "Cancelar", salvar: "Salvar",
  atualizar: "Atualizar", visualizar: "Visualizar",
  anexos: "Anexos", historico: "Histórico", comentarios: "Comentários", auditoria: "Auditoria",
  exportar: "Exportar", imprimir: "Imprimir",
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
  tone?: "default" | "primary" | "danger" | "muted";
  title?: string;
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
      title={title ?? label}
      aria-label={label}
      className={cn(
        "h-6 w-6 rounded-sm p-0 shrink-0",
        toneClass[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5" />
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
        return ["editar", "visualizar", "anexos", "historico",
                "comentarios", "auditoria", "cancelar", "excluir",
                "salvar", "atualizar", "exportar", "imprimir",
                "filtroRapido", "filtroAvancado", "visoes", "layout", "colunas"].includes(a);
      case "multi":
        return ["exportar", "imprimir", "cancelar", "excluir",
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
    const tone: "default" | "primary" | "danger" | "muted" =
      a === "novo" ? "primary"
      : (a === "excluir" || a === "cancelar") ? "danger"
      : (a === "atualizar" || a === "visualizar") ? "muted"
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

  return (
    <div
      role="toolbar"
      aria-label="Barra Operacional de Registro"
      data-entity-type={entityType}
      data-selection-mode={mode}
      data-selection-count={count}
      className={cn(
        "flex items-center gap-0 border border-border/80",
        "bg-muted/30 px-1 py-0.5 rounded-sm overflow-x-auto",
        className,
      )}
    >
      {/* CRUD — ícones puros estilo RM */}
      {renderActionBtn("novo")}
      {renderActionBtn("editar")}
      {renderActionBtn("salvar")}
      {renderActionBtn("excluir")}
      {renderActionBtn("cancelar")}
      <Sep />

      {/* Estado */}
      {renderActionBtn("atualizar")}
      {renderActionBtn("visualizar")}
      <Sep />

      {/* Busca rápida (quando o consumidor injetar) */}
      {onSearchChange && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-6 w-44 rounded-sm pl-6 text-[11.5px]"
            />
          </div>
          <Sep />
        </>
      )}

      {/* Anexos (com label + chevron, como no print) */}
      {enabled.has("anexos") && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fire("anexos")}
          disabled={mode === "none"}
          title="Anexos"
          className="h-6 px-1.5 gap-1 rounded-sm text-[11.5px] text-foreground/85"
        >
          <Paperclip className="h-3.5 w-3.5" />
          <span>Anexos</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      )}

      {/* Histórico/Comentários/Auditoria — ícones puros */}
      {renderActionBtn("historico")}
      {renderActionBtn("comentarios")}
      {renderActionBtn("auditoria")}

      {/* Processos contextuais (label + chevron) */}
      {processosVisiveis.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 gap-1 rounded-sm text-[11.5px] text-foreground/85"
              title="Processos disponíveis"
            >
              <Cog className="h-3.5 w-3.5" />
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

      {/* Filtro estilo "[Filtro: Todos] ▼" do RM */}
      {(enabled.has("filtroRapido") || enabled.has("filtroAvancado")) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (onFilter ? onFilter() : fire("filtroRapido"))}
          title="Filtro"
          className="h-6 px-1.5 gap-1 rounded-sm text-[11.5px] text-foreground/85"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>[Filtro: Todos]</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      )}

      {extraLeft}

      <div className="ml-auto flex items-center gap-0">
        {renderActionBtn("exportar")}
        {renderActionBtn("imprimir")}
        <Sep />
        {renderActionBtn("filtroAvancado")}
        {renderActionBtn("visoes")}
        {renderActionBtn("colunas")}
        {extraRight}
        {count > 0 && (
          <span
            className="ml-1 rounded-sm border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            aria-label={`${count} selecionado(s)`}
          >
            {count} sel.
          </span>
        )}
      </div>
    </div>
  );
}

