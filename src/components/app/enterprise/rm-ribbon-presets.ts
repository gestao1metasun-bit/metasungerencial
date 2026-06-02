// ============================================================================
// D17.UI Fase 6.A — Presets canônicos de "ribbon RM" (Linha 2 + Linha 3)
// Reuso pelos módulos: Comercial / Financeiro / Aprovações / Pós-venda /
// Financiamentos. Mantém o mesmo padrão visual de Contas a Receber/Pagar.
// D17.4 — Adiciona ribbons "Processos" de Estoque e Compras.
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
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  ListChecks,
  ClipboardCheck,
  Sliders,
  History,
  ShoppingCart,
  FileText,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import type { StatusActionItem, LayoutBarConfig } from "./EnterpriseRecordToolbar";

export type RmRibbonOverrides = Partial<Record<
  | "whatsapp" | "cancelar" | "agendar" | "estornar"
  | "visualizar" | "imprimir" | "email" | "remessa"
  | "aprovar" | "reprovar" | "baixar",
  () => void
>>;

/**
 * 8 botões circulares no padrão da tela de Contas a Receber/Pagar.
 *
 * D26.1 — Nenhum botão mudo. Só renderiza ações cuja callback foi
 * explicitamente passada via `overrides`. Se nenhum override for fornecido,
 * retorna lista vazia (e a Linha 2 da toolbar não é renderizada).
 */
export function ribbonRm(overrides: RmRibbonOverrides = {}): StatusActionItem[] {
  const all: (StatusActionItem & { _ovKey: keyof RmRibbonOverrides })[] = [
    { _ovKey: "whatsapp",   key: "whatsapp",   label: "WhatsApp",      icon: MessageCircle, tone: "success", onClick: overrides.whatsapp   },
    { _ovKey: "cancelar",   key: "cancelar",   label: "Cancelar",      icon: XCircle,       tone: "danger",  onClick: overrides.cancelar   },
    { _ovKey: "agendar",    key: "agendar",    label: "Agendar",       icon: CalendarClock, tone: "info",    onClick: overrides.agendar    },
    { _ovKey: "estornar",   key: "estornar",   label: "Estornar",      icon: Undo2,         tone: "warning", onClick: overrides.estornar   },
    { _ovKey: "visualizar", key: "visualizar", label: "Visualizar",    icon: Eye,           tone: "info",    onClick: overrides.visualizar },
    { _ovKey: "imprimir",   key: "imprimir",   label: "Imprimir",      icon: Printer,       tone: "muted",   onClick: overrides.imprimir   },
    { _ovKey: "email",      key: "email",      label: "Enviar e-mail", icon: Mail,          tone: "info",    onClick: overrides.email      },
    { _ovKey: "remessa",    key: "remessa",    label: "Remessa",       icon: Send,          tone: "primary", onClick: overrides.remessa    },
  ];
  // Mantém referência a `toast` para compat sem warning de import órfão.
  void toast;
  return all.filter((a) => typeof a.onClick === "function").map(({ _ovKey, ...rest }) => rest);
}

/** Variante para módulos com fluxo Aprovar/Reprovar/Baixar (financeiro/aprovações). */
export function ribbonRmAprovacao(overrides: RmRibbonOverrides = {}): StatusActionItem[] {
  // D26.1 — Nenhum botão mudo. Só renderiza ações com callback real.
  const all: (StatusActionItem & { _ovKey: keyof RmRibbonOverrides })[] = [
    { _ovKey: "aprovar",    key: "aprovar",    label: "Aprovar",       icon: CheckCircle2, tone: "success", onClick: overrides.aprovar    },
    { _ovKey: "reprovar",   key: "reprovar",   label: "Reprovar",      icon: XCircle,      tone: "danger",  onClick: overrides.reprovar   },
    { _ovKey: "baixar",     key: "baixar",     label: "Baixar",        icon: Banknote,     tone: "success", onClick: overrides.baixar     },
    { _ovKey: "estornar",   key: "estornar",   label: "Estornar",      icon: Undo2,        tone: "warning", onClick: overrides.estornar   },
    { _ovKey: "visualizar", key: "visualizar", label: "Visualizar",    icon: Eye,          tone: "info",    onClick: overrides.visualizar },
    { _ovKey: "imprimir",   key: "imprimir",   label: "Imprimir",      icon: Printer,      tone: "muted",   onClick: overrides.imprimir   },
    { _ovKey: "email",      key: "email",      label: "Enviar e-mail", icon: Mail,         tone: "info",    onClick: overrides.email      },
    { _ovKey: "remessa",    key: "remessa",    label: "Remessa",       icon: Send,         tone: "primary", onClick: overrides.remessa    },
  ];
  return all.filter((a) => typeof a.onClick === "function").map(({ _ovKey, ...rest }) => rest);
}

/* ---------------------------------------------------------------------- */
/* D17.4 — Ribbons "Processos" específicos de Suprimentos.                */
/* Mantêm o mesmo formato visual (StatusActionItem[]) para reuso direto   */
/* em statusActions={...}.                                                */
/* ---------------------------------------------------------------------- */

export type RmRibbonEstoqueOverrides = Partial<Record<
  | "entrada" | "saida" | "transferencia" | "reserva"
  | "baixaReserva" | "ajuste" | "inventario" | "historico",
  () => void
>>;

/** Processos canônicos de Estoque (D17.4). */
export function ribbonRmEstoque(overrides: RmRibbonEstoqueOverrides = {}): StatusActionItem[] {
  const stub = (label: string) => () => toast.message(`${label} — em breve`);
  return [
    { key: "entrada",       label: "Entrada",         icon: PackagePlus,    tone: "success", onClick: overrides.entrada       ?? stub("Entrada de estoque") },
    { key: "saida",         label: "Saída",           icon: PackageMinus,   tone: "warning", onClick: overrides.saida         ?? stub("Saída de estoque") },
    { key: "transferencia", label: "Transferência",   icon: ArrowLeftRight, tone: "info",    onClick: overrides.transferencia ?? stub("Transferência") },
    { key: "reserva",       label: "Reserva",         icon: ListChecks,     tone: "primary", onClick: overrides.reserva       ?? stub("Reserva") },
    { key: "baixaReserva",  label: "Baixar reserva",  icon: ClipboardCheck, tone: "success", onClick: overrides.baixaReserva  ?? stub("Baixar reserva") },
    { key: "ajuste",        label: "Ajuste",          icon: Sliders,        tone: "warning", onClick: overrides.ajuste        ?? stub("Ajuste de estoque") },
    { key: "inventario",    label: "Inventário",      icon: ClipboardCheck, tone: "info",    onClick: overrides.inventario    ?? stub("Inventário") },
    { key: "historico",     label: "Histórico",       icon: History,        tone: "info",    onClick: overrides.historico     ?? stub("Histórico") },
  ];
}

export type RmRibbonComprasOverrides = Partial<Record<
  | "aprovar" | "reprovar" | "cotacao" | "pedido"
  | "receber" | "cancelar" | "imprimir" | "historico",
  () => void
>>;

/** Processos canônicos de Compras / Suprimentos (D17.4). */
export function ribbonRmCompras(overrides: RmRibbonComprasOverrides = {}): StatusActionItem[] {
  const stub = (label: string) => () => toast.message(`${label} — em breve`);
  return [
    { key: "aprovar",   label: "Aprovar",        icon: CheckCircle2, tone: "success", onClick: overrides.aprovar   ?? stub("Aprovar solicitação") },
    { key: "reprovar",  label: "Reprovar",       icon: XCircle,      tone: "danger",  onClick: overrides.reprovar  ?? stub("Reprovar") },
    { key: "cotacao",   label: "Gerar cotação",  icon: FileText,     tone: "info",    onClick: overrides.cotacao   ?? stub("Gerar cotação") },
    { key: "pedido",    label: "Gerar pedido",   icon: ShoppingCart, tone: "primary", onClick: overrides.pedido    ?? stub("Gerar pedido") },
    { key: "receber",   label: "Receber",        icon: Truck,        tone: "success", onClick: overrides.receber   ?? stub("Receber material") },
    { key: "cancelar",  label: "Cancelar",       icon: XCircle,      tone: "danger",  onClick: overrides.cancelar  ?? stub("Cancelar") },
    { key: "imprimir",  label: "Imprimir",       icon: Printer,      tone: "muted",   onClick: overrides.imprimir  ?? stub("Imprimir") },
    { key: "historico", label: "Histórico",      icon: History,      tone: "info",    onClick: overrides.historico ?? stub("Histórico") },
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

/* ---------------------------------------------------------------------- */
/* D27.COM — Ribbon "Processos" canônico do Comercial (10 botões).        */
/* Ordem: Aprovar · Reprovar · Gerar Contrato · Gerar Aditivo · Enviar    */
/* Engenharia · Enviar Financiamento · Gerar Comissão · Enviar Assinatura */
/* · Cancelar · Reabrir.                                                  */
/* ---------------------------------------------------------------------- */
export type RmRibbonComercialOverrides = Partial<Record<
  | "aprovar" | "reprovar" | "gerarContrato" | "gerarAditivo"
  | "enviarEngenharia" | "enviarFinanciamento" | "gerarComissao"
  | "enviarAssinatura" | "cancelar" | "reabrir",
  () => void
>>;

export function ribbonRmComercial(overrides: RmRibbonComercialOverrides = {}): StatusActionItem[] {
  const stub = (label: string) => () => toast.message(`${label} — em breve`);
  return [
    { key: "aprovar",              label: "Aprovar",               icon: CheckCircle2, tone: "success", onClick: overrides.aprovar              ?? stub("Aprovar") },
    { key: "reprovar",             label: "Reprovar",              icon: XCircle,      tone: "danger",  onClick: overrides.reprovar             ?? stub("Reprovar") },
    { key: "gerarContrato",        label: "Gerar Contrato",        icon: FileText,     tone: "primary", onClick: overrides.gerarContrato        ?? stub("Gerar Contrato") },
    { key: "gerarAditivo",         label: "Gerar Aditivo",         icon: FileText,     tone: "info",    onClick: overrides.gerarAditivo         ?? stub("Gerar Aditivo") },
    { key: "enviarEngenharia",     label: "Enviar Engenharia",     icon: Truck,        tone: "info",    onClick: overrides.enviarEngenharia     ?? stub("Enviar Engenharia") },
    { key: "enviarFinanciamento",  label: "Enviar Financiamento",  icon: Banknote,     tone: "warning", onClick: overrides.enviarFinanciamento  ?? stub("Enviar Financiamento") },
    { key: "gerarComissao",        label: "Gerar Comissão",        icon: Banknote,     tone: "success", onClick: overrides.gerarComissao        ?? stub("Gerar Comissão") },
    { key: "enviarAssinatura",     label: "Enviar Assinatura",     icon: Send,         tone: "primary", onClick: overrides.enviarAssinatura     ?? stub("Enviar Assinatura") },
    { key: "cancelar",             label: "Cancelar",              icon: XCircle,      tone: "danger",  onClick: overrides.cancelar             ?? stub("Cancelar") },
    { key: "reabrir",              label: "Reabrir",               icon: Undo2,        tone: "warning", onClick: overrides.reabrir              ?? stub("Reabrir") },
  ];
}
