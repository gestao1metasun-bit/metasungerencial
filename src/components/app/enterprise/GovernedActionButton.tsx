/**
 * D14.4 — GovernedActionButton.
 *
 * Botão que consulta a matriz de governança em tempo real para uma ação
 * (modulo + acao) e aplica gating consistente:
 *
 *   • Bloqueia se permissão ausente (mostra blockedReason no title).
 *   • Marca visualmente quando exige motivo / workflow.
 *   • Exibe badge de criticidade.
 *   • Passa metadados para o handler — quem chama decide se abre dialog
 *     de motivo, redireciona para workflow, etc.
 *
 * Não substitui o motor real (workflow_aprovacoes / motivos exigidos no
 * backend). É a primeira linha de defesa visual + UX consistente com a
 * matriz oficial.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertTriangle, ShieldCheck, FileText, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGovernanceAction,
  type GovernanceActionInfo,
} from "@/lib/repositories/use-governance-action";
import type { ComponentType, ReactNode } from "react";

export type GovernedActionButtonProps = {
  modulo: string;
  acao: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onExecute: (info: GovernanceActionInfo) => void;
  disabled?: boolean;
  className?: string;
  tone?: "default" | "primary" | "danger" | "success" | "warning";
  children?: ReactNode;
  showBadges?: boolean;
};

const toneClass: Record<string, string> = {
  default: "text-foreground/80",
  primary: "text-primary",
  danger:  "text-destructive",
  success: "text-success",
  warning: "text-amber-600",
};

export function GovernedActionButton({
  modulo, acao, label, icon: Icon, onExecute, disabled, className, tone = "default", children, showBadges = true,
}: GovernedActionButtonProps) {
  const info = useGovernanceAction(modulo, acao);
  const blocked = !info.allowed && info.found;
  const isDisabled = disabled || info.loading || blocked;

  const title = blocked
    ? info.blockedReason ?? "Ação bloqueada"
    : [
        label,
        info.requiresMotivo && "exige motivo",
        info.requiresWorkflow && "exige workflow",
        info.slaHoras && `SLA ${info.slaHoras}h`,
        info.criticidade && `criticidade ${info.criticidade}`,
      ].filter(Boolean).join(" · ");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onExecute(info)}
      disabled={isDisabled}
      title={title}
      className={cn(
        "h-7 px-2 gap-1.5 text-[11.5px] font-medium rounded",
        toneClass[tone],
        blocked && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      {blocked ? <Lock className="h-3.5 w-3.5" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      <span className="hidden md:inline">{children ?? label}</span>
      {showBadges && info.found && !blocked && (
        <>
          {info.requiresWorkflow && (
            <GitBranch className="h-3 w-3 text-indigo-600" aria-label="Workflow obrigatório" />
          )}
          {info.requiresMotivo && (
            <FileText className="h-3 w-3 text-amber-600" aria-label="Motivo obrigatório" />
          )}
          {info.criticidade === "critica" && (
            <AlertTriangle className="h-3 w-3 text-destructive" aria-label="Crítica" />
          )}
        </>
      )}
      {showBadges && info.found && !blocked && info.criticidade === "critica" && (
        <Badge variant="destructive" className="h-3.5 px-1 text-[9px] ml-0.5">crít</Badge>
      )}
    </Button>
  );
}
