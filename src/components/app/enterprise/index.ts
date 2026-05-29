/**
 * D6.13.2 — Enterprise Framework · Barrel oficial
 *
 * Porta única de importação para componentes enterprise reutilizáveis.
 * Telas DEVEM importar daqui em vez de caçar arquivos avulsos em
 * `components/app/grid/*` ou `components/app/*`.
 *
 *   import {
 *     EntityHeader, EntityStatusBadge, EntityTimeline, AttachmentPanel,
 *     EnterpriseToolbar, EnterpriseDataGrid, EnterpriseDialog,
 *     HistoricoDrawer, ProcessosMenu, FlagPicker, CommandPalette,
 *   } from "@/components/app/enterprise";
 *
 * Regra: este barrel NUNCA contém lógica. Só re-exports. Mudanças de API
 * acontecem nos arquivos de origem.
 */

// D6.13.2 — novos
export { EntityHeader } from "./EntityHeader";
export type { EntityHeaderProps, EntityCrumb } from "./EntityHeader";

export { EntityStatusBadge } from "./EntityStatusBadge";
export type { EntityStatusBadgeProps, EntityStatusTone } from "./EntityStatusBadge";

export { EntityTimeline } from "./EntityTimeline";
export type { EntityTimelineProps, EntityTimelineEventType } from "./EntityTimeline";

export { AttachmentPanel } from "./AttachmentPanel";
export type { AttachmentPanelProps } from "./AttachmentPanel";
export { AttachmentDialog } from "./AttachmentDialog";
export type { AttachmentDialogProps } from "./AttachmentDialog";
export { AnexosButton } from "./AnexosButton";
export type { AnexosButtonProps } from "./AnexosButton";

// D14.5 — Paginação server-side universal
export { ServerPaginationFooter } from "./ServerPaginationFooter";
export { useServerPagination } from "@/lib/repositories/use-server-pagination";
export type {
  ServerPaginationOptions,
  ServerPaginationResult,
} from "@/lib/repositories/use-server-pagination";


export { EnterpriseRecordToolbar, ENTERPRISE_PROCESS_ICON_HINT } from "./EnterpriseRecordToolbar";
export type {
  EnterpriseRecordToolbarProps,
  EnterpriseEntityType,
  EnterpriseRecordAction,
  EnterpriseProcessItem,
  StatusActionItem,
  LayoutBarConfig,
} from "./EnterpriseRecordToolbar";

// Re-exports oficiais (componentes já existentes consolidados sob o framework)
export { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
export { EnterpriseDataGrid } from "@/components/app/grid/EnterpriseDataGrid";
export { EnterpriseDialog } from "@/components/app/grid/EnterpriseDialog";
export { HistoricoDrawer } from "@/components/app/grid/HistoricoDrawer";

// D17.UI.4c — Drawer universal de histórico (per-record + per-module)
export { ModuloHistoricoDrawer } from "./ModuloHistoricoDrawer";
export type { ModuloHistoricoDrawerProps } from "./ModuloHistoricoDrawer";
export { ProcessosMenu } from "@/components/app/grid/ProcessosMenu";
export type { ProcessoItem } from "@/components/app/grid/ProcessosMenu";
export { FlagPicker } from "@/components/app/flags/FlagPicker";
export { CommandPalette } from "@/components/app/CommandPalette";

// D17.UI.1 — Padrão UI Enterprise RM/TOTVS
export { RowActions } from "./RowActions";
export type { RowAction, RowActionKind, RowActionsProps } from "./RowActions";
export { ColumnManager } from "./ColumnManager";
export type { ColumnManagerProps, ColumnManagerPrefs } from "./ColumnManager";
export { useColumnPrefs } from "@/lib/ui/column-prefs";
export type { ColumnDef } from "@/lib/ui/column-prefs";
export { FilterPanel } from "./FilterPanel";
export type { FilterPanelProps } from "./FilterPanel";

// D17.UI Fase 6.A — Presets canônicos de ribbon RM (Linha 2 + Linha 3)
export { ribbonRm, ribbonRmAprovacao, layoutBarRm } from "./rm-ribbon-presets";
export type { RmRibbonOverrides } from "./rm-ribbon-presets";

// D17.UI.3 — Seleção múltipla + ações em lote
export { BulkActionBar } from "./BulkActionBar";
export type { BulkAction, BulkActionBarProps, BulkActionTone } from "./BulkActionBar";
export { useRowSelection } from "@/lib/ui/use-row-selection";

// D17.UI.4 — Casca de página + orquestrador
export { EnterprisePageShell } from "./EnterprisePageShell";
export type { EnterprisePageShellProps } from "./EnterprisePageShell";
export { useEnterpriseGrid } from "@/lib/ui/use-enterprise-grid";
export type {
  UseEnterpriseGridReturn,
  EnterpriseGridFilters,
  GridDensity,
  GridLayout,
} from "@/lib/ui/use-enterprise-grid";
