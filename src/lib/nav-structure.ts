/**
 * D6.1 — Fonte ÚNICA de navegação do Meta Sun (Enterprise Shell RM).
 *
 * Consumida por:
 *  - TopNav (macro módulos + ribbon contextual)
 *  - AppLayout (sidebar legada — modo compat enquanto ENTERPRISE_SHELL_FULL=false)
 *  - ContextualSidebar (painel lateral no modo enterprise full)
 *
 * NÃO duplicar definição de rota/permissão em outros lugares.
 * Para alterar visibilidade por papel, ajustar `accessKey` aqui e
 * `canAccessModule` em src/lib/identidade.ts (responsável final).
 */
import {
  LayoutDashboard, Briefcase, Wallet, HardHat, Package, Headset,
  ClipboardCheck, LineChart, Settings, FileBarChart, Database,
  ListChecks, Users, Receipt, Banknote,
} from "lucide-react";
import type { ROUTE_TABS } from "@/lib/route-tabs";

export type NavTier = "operacao" | "controle" | "estrutura";

export type NavItem = {
  to: string;
  label: string;
  icon: any;
  /** chave usada em canAccessModule(role, key) */
  accessKey: string;
  tier: NavTier;
  /** macro módulo do top-nav a que pertence */
  macro: MacroKey;
  /** ordem dentro do macro (menor = primeiro) */
  ordem: number;
  /** rota crítica para checklist de validação D6.1 */
  critica?: boolean;
};

export type MacroKey =
  | "paineis"
  | "comercial"
  | "financeiro"
  | "engenharia"
  | "estoque"
  | "aprovacoes"
  | "posvenda"
  | "analytics"
  | "configuracoes";

export type MacroModule = {
  key: MacroKey;
  label: string;
  to: string;
  icon: any;
  /** prefixos de rota que ativam este macro */
  matches: string[];
  /** chave de permissão em canAccessModule */
  accessKey: string;
};

// ── Macro módulos (D6.E — Painéis centralizados, separados da operação) ──
export const MACRO_MODULES: MacroModule[] = [
  { key: "paineis",       label: "Painéis",       to: "/paineis",       icon: LayoutDashboard, matches: ["/paineis", "/dashboards", "/dashboard", "/tarefas"], accessKey: "dashboard" },
  { key: "comercial",     label: "Comercial",     to: "/comercial",     icon: Briefcase,       matches: ["/comercial", "/leads", "/propostas", "/financiamentos"], accessKey: "comercial" },
  { key: "financeiro",    label: "Financeiro",    to: "/financeiro",    icon: Wallet,          matches: ["/financeiro", "/financeiro-titulos", "/pedidos-venda"], accessKey: "financeiro" },
  { key: "engenharia",    label: "Engenharia",    to: "/engenharia",    icon: HardHat,         matches: ["/engenharia"], accessKey: "engenharia" },
  { key: "estoque",       label: "Estoque",       to: "/estoque",       icon: Package,         matches: ["/estoque", "/estoque-fundacao", "/solicitacoes-material"], accessKey: "estoque" },
  { key: "aprovacoes",    label: "Aprovações",    to: "/aprovacoes",    icon: ClipboardCheck,  matches: ["/aprovacoes"], accessKey: "dashboard" },
  { key: "posvenda",      label: "Pós-venda",     to: "/posvenda",      icon: Headset,         matches: ["/posvenda"], accessKey: "posvenda" },
  { key: "analytics",     label: "Analytics",     to: "/analises",      icon: LineChart,       matches: ["/analises", "/analytics", "/relatorios"], accessKey: "analytics" },
  { key: "configuracoes", label: "Configurações", to: "/configuracoes", icon: Settings,        matches: ["/configuracoes", "/cadastros"], accessKey: "configuracoes" },
];

// ── Rotas (sidebar legada + mapeamento para macro) ────────────────────────
export const NAV_ITEMS: NavItem[] = [
  // Macro Painéis (gestão / KPIs)
  { to: "/paineis",                label: "Visão Geral",              icon: LayoutDashboard, accessKey: "dashboard",     tier: "operacao",  macro: "paineis",       ordem: 5,  critica: true },
  { to: "/dashboard",              label: "Dashboard Geral (legado)", icon: LayoutDashboard, accessKey: "dashboard",     tier: "operacao",  macro: "paineis",       ordem: 8 },
  { to: "/paineis/comercial",      label: "Comercial",                icon: Briefcase,       accessKey: "comercial",     tier: "operacao",  macro: "paineis",       ordem: 10 },
  { to: "/paineis/financeiro",     label: "Financeiro",               icon: Wallet,          accessKey: "financeiro",    tier: "operacao",  macro: "paineis",       ordem: 20 },
  { to: "/paineis/engenharia",     label: "Engenharia",               icon: HardHat,         accessKey: "engenharia",    tier: "operacao",  macro: "paineis",       ordem: 30 },
  { to: "/paineis/estoque",        label: "Estoque",                  icon: Package,         accessKey: "estoque",       tier: "operacao",  macro: "paineis",       ordem: 40 },
  { to: "/paineis/financiamentos", label: "Financiamentos",           icon: Banknote,        accessKey: "financiamentos",tier: "operacao",  macro: "paineis",       ordem: 50 },
  { to: "/paineis/aprovacoes",     label: "Aprovações",               icon: ClipboardCheck,  accessKey: "dashboard",     tier: "operacao",  macro: "paineis",       ordem: 60 },
  { to: "/paineis/posvenda",       label: "Pós-venda",                icon: Headset,         accessKey: "posvenda",      tier: "operacao",  macro: "paineis",       ordem: 70 },
  { to: "/analises",               label: "Análises / Executivo",     icon: LineChart,       accessKey: "analytics",     tier: "controle",  macro: "paineis",       ordem: 80 },
  { to: "/relatorios",             label: "Relatórios",               icon: FileBarChart,    accessKey: "relatorios",    tier: "controle",  macro: "paineis",       ordem: 90 },
  { to: "/tarefas",                label: "Tarefas",                  icon: ListChecks,      accessKey: "dashboard",     tier: "operacao",  macro: "paineis",       ordem: 100 },

  // Operação
  { to: "/comercial",          label: "Comercial",          icon: Briefcase,       accessKey: "comercial",     tier: "operacao",  macro: "comercial",     ordem: 10, critica: true },
  { to: "/leads",              label: "Leads / Pistas",     icon: Users,           accessKey: "comercial",     tier: "operacao",  macro: "comercial",     ordem: 20 },
  { to: "/pedidos-venda",      label: "Pedidos de Venda",   icon: Receipt,         accessKey: "financeiro",    tier: "operacao",  macro: "financeiro",    ordem: 15, critica: true },
  { to: "/financeiro",         label: "Financeiro",         icon: Wallet,          accessKey: "financeiro",    tier: "operacao",  macro: "financeiro",    ordem: 10, critica: true },
  { to: "/financeiro-titulos", label: "Títulos Financeiros",icon: Receipt,         accessKey: "financeiro",    tier: "operacao",  macro: "financeiro",    ordem: 20, critica: true },
  { to: "/financiamentos",     label: "Financiamentos",     icon: Banknote,        accessKey: "financiamentos",tier: "operacao",  macro: "comercial",     ordem: 40 },
  { to: "/engenharia",         label: "Engenharia",         icon: HardHat,         accessKey: "engenharia",    tier: "operacao",  macro: "engenharia",    ordem: 10, critica: true },
  { to: "/posvenda",           label: "Pós-venda",          icon: Headset,         accessKey: "posvenda",      tier: "operacao",  macro: "posvenda",      ordem: 10, critica: true },
  { to: "/estoque",            label: "Estoque",            icon: Package,         accessKey: "estoque",       tier: "operacao",  macro: "estoque",       ordem: 10, critica: true },
  { to: "/estoque-fundacao",   label: "Estoque Fundação",   icon: Package,         accessKey: "estoque",       tier: "operacao",  macro: "estoque",       ordem: 20 },
  { to: "/solicitacoes-material", label: "Solicitações de Material", icon: Package,  accessKey: "estoque",       tier: "operacao",  macro: "estoque",       ordem: 30, critica: true },
  { to: "/aprovacoes",         label: "Central de Aprovações", icon: ClipboardCheck, accessKey: "dashboard",   tier: "operacao",  macro: "aprovacoes",    ordem: 10, critica: true },
  { to: "/cadastros",          label: "Cadastros Operacionais", icon: Database,    accessKey: "cadastros",     tier: "estrutura", macro: "configuracoes", ordem: 10 },
  { to: "/configuracoes",      label: "Configurações",      icon: Settings,        accessKey: "configuracoes", tier: "estrutura", macro: "configuracoes", ordem: 20, critica: true },
];

/** Lookup utilitário usado pelo TopNav/ribbon. */
export function macroAtivoPorRota(pathname: string): MacroModule | undefined {
  return MACRO_MODULES.find((m) =>
    m.matches.some((p) => pathname === p || pathname.startsWith(p + "/")),
  );
}

/** Itens da sidebar legada agrupados por tier (compat). */
export function navItemsPorTier(): Record<NavTier, NavItem[]> {
  const g: Record<NavTier, NavItem[]> = { operacao: [], controle: [], estrutura: [] };
  for (const it of NAV_ITEMS) g[it.tier].push(it);
  return g;
}

/** Checklist D6.1 — rotas críticas que precisam continuar abrindo após cada onda. */
export const ROTAS_CRITICAS: { to: string; label: string }[] = NAV_ITEMS
  .filter((n) => n.critica)
  .map((n) => ({ to: n.to, label: n.label }));

// Re-export tipos auxiliares
export type { ROUTE_TABS };
