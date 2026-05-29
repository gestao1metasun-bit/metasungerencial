// ============================================================================
// D17.UI Fase 6.A — Presets canônicos de "ribbon RM" (Linha 2 + Linha 3)
// Reuso pelos módulos: Comercial / Financeiro / Aprovações / Pós-venda /
// Financiamentos. Mantém o mesmo padrão visual de Contas a Receber/Pagar.
// As callbacks são opcionais — sem onClick, vira toast "em breve".
// ============================================================================
import {
  Banknote,
  CheckCircle2,
  Eye,
  Mail,
  MessageCircle,
  Printer,
  Send,
  Undo2,
  XCircle,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import type { StatusActionItem, LayoutBarConfig } from "./EnterpriseRecordToolbar";

export type RmRibbonOverrides = Partial<Record<
  | "whatsapp" | "cancelar" | "agendar" | "estornar"
  | "visualizar" | "imprimir" | "email" | "remessa"
  | "aprovar" | "reprovar" | "baixar",
  () => void
>>;

/** 8 botões circulares no padrão da tela de Contas a Receber/Pagar. */
export function ribbonRm(overrides: RmRibbonOverrides = {}): StatusActionItem[] {
  const stub = (label: string) => () => toast.message(`${label} — em breve`);
  return [
    { key: "whatsapp",   label: "WhatsApp",    icon: MessageCircle,  tone: "success", onClick: overrides.whatsapp   ?? stub("WhatsApp") },
    { key: "cancelar",   label: "Cancelar",    icon: XCircle,        tone: "danger",  onClick: overrides.cancelar   ?? stub("Cancelar") },
    { key: "agendar",    label: "Agendar",     icon: CalendarClock,  tone: "info",    onClick: overrides.agendar    ?? stub("Agendar") },
    { key: "estornar",   label: "Estornar",    icon: Undo2,          tone: "warning", onClick: overrides.estornar   ?? stub("Estornar") },
    { key: "visualizar", label: "Visualizar",  icon: Eye,            tone: "info",    onClick: overrides.visualizar ?? stub("Visualizar") },
    { key: "imprimir",   label: "Imprimir",    icon: Printer,        tone: "muted",   onClick: overrides.imprimir   ?? stub("Imprimir") },
    { key: "email",      label: "Enviar e-mail", icon: Mail,         tone: "info",    onClick: overrides.email      ?? stub("E-mail") },
    { key: "remessa",    label: "Remessa",     icon: Send,           tone: "primary", onClick: overrides.remessa    ?? stub("Remessa") },
  ];
}

/** Variante para módulos com fluxo Aprovar/Reprovar/Baixar (financeiro/aprovações). */
export function ribbonRmAprovacao(overrides: RmRibbonOverrides = {}): StatusActionItem[] {
  const stub = (label: string) => () => toast.message(`${label} — em breve`);
  return [
    { key: "aprovar",    label: "Aprovar",     icon: CheckCircle2,   tone: "success", onClick: overrides.aprovar    ?? stub("Aprovar") },
    { key: "reprovar",   label: "Reprovar",    icon: XCircle,        tone: "danger",  onClick: overrides.reprovar   ?? stub("Reprovar") },
    { key: "baixar",     label: "Baixar",      icon: Banknote,       tone: "success", onClick: overrides.baixar     ?? stub("Baixar") },
    { key: "estornar",   label: "Estornar",    icon: Undo2,          tone: "warning", onClick: overrides.estornar   ?? stub("Estornar") },
    { key: "visualizar", label: "Visualizar",  icon: Eye,            tone: "info",    onClick: overrides.visualizar ?? stub("Visualizar") },
    { key: "imprimir",   label: "Imprimir",    icon: Printer,        tone: "muted",   onClick: overrides.imprimir   ?? stub("Imprimir") },
    { key: "email",      label: "Enviar e-mail", icon: Mail,         tone: "info",    onClick: overrides.email      ?? stub("E-mail") },
    { key: "remessa",    label: "Remessa",     icon: Send,           tone: "primary", onClick: overrides.remessa    ?? stub("Remessa") },
  ];
}

/** Linha 3 de Layout no padrão RM (Padrão/Em aberto/Vencidos + densidade). */
export function layoutBarRm(opts?: {
  presets?: { key: string; label: string }[];
  currentPreset?: string;
  onPresetChange?: (key: string) => void;
  density?: "compact" | "comfortable" | "spacious";
  onDensityChange?: (d: "compact" | "comfortable" | "spacious") => void;
}): LayoutBarConfig {
  return {
    presets: opts?.presets ?? [
      { key: "padrao", label: "Padrão" },
    ],
    currentPreset: opts?.currentPreset ?? "padrao",
    onPresetChange: opts?.onPresetChange,
    density: opts?.density ?? "compact",
    onDensityChange: opts?.onDensityChange ?? (() => {}),
  };
}
