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
} from "./EnterpriseRecordToolbar";

// Re-exports oficiais (componentes já existentes consolidados sob o framework)
export { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
export { EnterpriseDataGrid } from "@/components/app/grid/EnterpriseDataGrid";
export { EnterpriseDialog } from "@/components/app/grid/EnterpriseDialog";
export { HistoricoDrawer } from "@/components/app/grid/HistoricoDrawer";
export { ProcessosMenu } from "@/components/app/grid/ProcessosMenu";
export type { ProcessoItem } from "@/components/app/grid/ProcessosMenu";
export { FlagPicker } from "@/components/app/flags/FlagPicker";
export { CommandPalette } from "@/components/app/CommandPalette";
