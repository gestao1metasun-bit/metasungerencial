/**
 * D17.UI Onda 3 — Cabeçalho RM/TOTVS reutilizável para abas do Financeiro.
 *
 * Monta um EnterpriseRecordToolbar com fita circular (ribbonRm /
 * ribbonRmAprovacao) + layoutBarRm + ações canônicas. NÃO toca em banco,
 * RLS, RPCs, workflow, auditoria ou regras de negócio — apenas padroniza
 * visualmente a barra superior das abas.
 */
import {
  EnterpriseRecordToolbar,
  type EnterpriseEntityType,
  type EnterpriseRecordAction,
} from "@/components/app/enterprise";
import { ribbonRm, ribbonRmAprovacao, layoutBarRm } from "@/components/app/enterprise/rm-ribbon-presets";

export type RmTabHeaderProps = {
  entityType?: EnterpriseEntityType;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  onNovo?: () => void;
  onEditar?: () => void;
  onCancelar?: () => void;
  onAtualizar?: () => void;
  onAnexos?: () => void;
  onHistorico?: () => void;
  onExportar?: () => void;
  /** Usa fita Aprovar/Reprovar/Baixar/Estornar em vez da fita padrão. */
  variant?: "padrao" | "aprovacao";
  /** Ações extras a expor além das default (anexos/historico/colunas/etc). */
  availableActions?: EnterpriseRecordAction[];
};

const DEFAULT_ACTIONS: EnterpriseRecordAction[] = [
  "novo", "editar", "cancelar", "atualizar",
  "anexos", "historico", "exportar",
  "filtroAvancado", "colunas", "imprimir",
];

export function RmTabHeader({
  entityType = "titulos_financeiros",
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  onNovo,
  onEditar,
  onCancelar,
  onAtualizar,
  onAnexos,
  onHistorico,
  onExportar,
  variant = "padrao",
  availableActions = DEFAULT_ACTIONS,
}: RmTabHeaderProps) {
  const fita = variant === "aprovacao" ? ribbonRmAprovacao() : ribbonRm();
  return (
    <EnterpriseRecordToolbar
      entityType={entityType}
      selectedIds={[]}
      availableActions={availableActions}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      statusActions={fita}
      layoutBar={layoutBarRm()}
      onAction={(a) => {
        if (a === "novo") onNovo?.();
        else if (a === "editar") onEditar?.();
        else if (a === "cancelar") onCancelar?.();
        else if (a === "atualizar") onAtualizar?.();
        else if (a === "anexos") onAnexos?.();
        else if (a === "historico") onHistorico?.();
        else if (a === "exportar") onExportar?.();
      }}
    />
  );
}
