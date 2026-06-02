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
  ListChecks, Users, Receipt, Banknote, ShoppingCart, ShieldCheck, Truck,
  Boxes,
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
  | "financiamentos"
  | "suprimentos"
  | "compras"
  | "engenharia"
  | "estoque"
  | "aprovacoes"
  | "posvenda"
  | "analytics"
  | "cadastros"
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

// ── Macro módulos (D20.SUP.4 — Suprimentos absorve Compras+Estoque no menu) ──
export const MACRO_MODULES: MacroModule[] = [
  { key: "analytics",      label: "Analytics",      to: "/analytics",              icon: LayoutDashboard, matches: ["/analytics", "/paineis", "/dashboards", "/dashboard", "/analises", "/relatorios", "/tarefas"], accessKey: "dashboard" },
  { key: "comercial",      label: "Comercial",      to: "/comercial",              icon: Briefcase,       matches: ["/comercial", "/leads", "/propostas"], accessKey: "comercial" },
  { key: "financeiro",     label: "Financeiro",     to: "/financeiro",             icon: Wallet,          matches: ["/financeiro", "/financeiro-titulos", "/pedidos-venda", "/operacoes-financeiras"], accessKey: "financeiro" },
  { key: "financiamentos", label: "Financiamentos", to: "/financiamentos",         icon: Banknote,        matches: ["/financiamentos"], accessKey: "financiamentos" },
  { key: "suprimentos",    label: "Suprimentos",    to: "/suprimentos",            icon: Boxes,           matches: ["/suprimentos", "/solicitacoes-material", "/compras", "/estoque", "/estoque-fundacao", "/fornecedores"], accessKey: "estoque" },
  // D20.SUP.4 — "Compras" e "Estoque" REMOVIDOS do macro nav (vivem dentro de Suprimentos).
  // Rotas continuam ativas para reaproveitamento interno; cards do hub apontam para elas.
  { key: "engenharia",     label: "Engenharia",     to: "/engenharia",             icon: HardHat,         matches: ["/engenharia"], accessKey: "engenharia" },
  { key: "aprovacoes",     label: "Aprovações",     to: "/aprovacoes",             icon: ClipboardCheck,  matches: ["/aprovacoes"], accessKey: "dashboard" },
  { key: "posvenda",       label: "Pós-venda",      to: "/posvenda",               icon: Headset,         matches: ["/posvenda"], accessKey: "posvenda" },
  { key: "cadastros",      label: "Cadastros",      to: "/cadastros",              icon: Database,        matches: ["/cadastros", "/fornecedores"], accessKey: "cadastros" },
  { key: "configuracoes",  label: "Configurações",  to: "/configuracoes",          icon: Settings,        matches: ["/configuracoes"], accessKey: "configuracoes" },
];

// ── Rotas (sidebar legada + mapeamento para macro) ────────────────────────
export const NAV_ITEMS: NavItem[] = [
  // Macro Analytics (gestão / KPIs — consolidado 2026-05-28: paineis absorvido)
  { to: "/analytics",                label: "Visão Executiva",          icon: LineChart,       accessKey: "analytics",     tier: "operacao",  macro: "analytics",      ordem: 1,  critica: true },
  { to: "/dashboard",                label: "Dashboard Geral (legado)", icon: LayoutDashboard, accessKey: "dashboard",     tier: "operacao",  macro: "analytics",      ordem: 8 },
  { to: "/analytics/comercial",      label: "Comercial",                icon: Briefcase,       accessKey: "comercial",     tier: "operacao",  macro: "analytics",      ordem: 10 },
  { to: "/analytics/financeiro",     label: "Financeiro",               icon: Wallet,          accessKey: "financeiro",    tier: "operacao",  macro: "analytics",      ordem: 20 },
  { to: "/analytics/engenharia",     label: "Engenharia",               icon: HardHat,         accessKey: "engenharia",    tier: "operacao",  macro: "analytics",      ordem: 30 },
  { to: "/analytics/estoque",        label: "Estoque",                  icon: Package,         accessKey: "estoque",       tier: "operacao",  macro: "analytics",      ordem: 40 },
  { to: "/analytics/financiamentos", label: "Financiamentos",           icon: Banknote,        accessKey: "financiamentos",tier: "operacao",  macro: "analytics",      ordem: 50 },
  { to: "/analytics/aprovacoes",     label: "Aprovações",               icon: ClipboardCheck,  accessKey: "dashboard",     tier: "operacao",  macro: "analytics",      ordem: 60 },
  { to: "/analytics/posvenda",       label: "Pós-venda",                icon: Headset,         accessKey: "posvenda",      tier: "operacao",  macro: "analytics",      ordem: 70 },
  { to: "/analytics/saude-dados",    label: "Saúde dos Dados",          icon: ShieldCheck,     accessKey: "dashboard",     tier: "controle",  macro: "analytics",      ordem: 75, critica: true },
  { to: "/analytics/saude-sistema",  label: "Saúde do Sistema",         icon: ShieldCheck,     accessKey: "dashboard",     tier: "controle",  macro: "analytics",      ordem: 76, critica: true },
  { to: "/analytics/governanca",     label: "Governança",               icon: ShieldCheck,     accessKey: "dashboard",     tier: "controle",  macro: "analytics",      ordem: 77, critica: true },
  { to: "/analytics/performance",    label: "Performance",              icon: LineChart,       accessKey: "dashboard",     tier: "controle",  macro: "analytics",      ordem: 78 },
  { to: "/analytics/erros",          label: "Erros",                    icon: FileBarChart,    accessKey: "dashboard",     tier: "controle",  macro: "analytics",      ordem: 79 },
  { to: "/relatorios",               label: "Relatórios",               icon: FileBarChart,    accessKey: "relatorios",    tier: "controle",  macro: "analytics",      ordem: 90 },
  { to: "/tarefas",                  label: "Tarefas",                  icon: ListChecks,      accessKey: "dashboard",     tier: "operacao",  macro: "analytics",      ordem: 100 },

  // Operação
  { to: "/comercial",          label: "Comercial",          icon: Briefcase,       accessKey: "comercial",     tier: "operacao",  macro: "comercial",     ordem: 10, critica: true },
  { to: "/leads",              label: "Leads / Pistas",     icon: Users,           accessKey: "comercial",     tier: "operacao",  macro: "comercial",     ordem: 20 },
  { to: "/pedidos-venda",      label: "Pedidos de Venda",   icon: Receipt,         accessKey: "financeiro",    tier: "operacao",  macro: "financeiro",    ordem: 15, critica: true },
  { to: "/financeiro",         label: "Financeiro",         icon: Wallet,          accessKey: "financeiro",    tier: "operacao",  macro: "financeiro",    ordem: 10, critica: true },
  { to: "/financeiro-titulos", label: "Títulos Financeiros",icon: Receipt,         accessKey: "financeiro",    tier: "operacao",  macro: "financeiro",    ordem: 20, critica: true },
  { to: "/operacoes-financeiras", label: "Operações Financeiras", icon: Banknote,   accessKey: "financeiro",    tier: "operacao",  macro: "financeiro",    ordem: 25 },
  { to: "/financiamentos",     label: "Financiamentos",     icon: Banknote,        accessKey: "financiamentos",tier: "operacao",  macro: "financiamentos",ordem: 10 },
  { to: "/engenharia",         label: "Engenharia",         icon: HardHat,         accessKey: "engenharia",    tier: "operacao",  macro: "engenharia",    ordem: 10, critica: true },
  { to: "/posvenda",           label: "Pós-venda",          icon: Headset,         accessKey: "posvenda",      tier: "operacao",  macro: "posvenda",      ordem: 10, critica: true },
  { to: "/estoque",            label: "Estoque",            icon: Package,         accessKey: "estoque",       tier: "operacao",  macro: "suprimentos",   ordem: 30, critica: true },
  { to: "/estoque-fundacao",   label: "Estoque Fundação",   icon: Package,         accessKey: "estoque",       tier: "operacao",  macro: "suprimentos",   ordem: 40 },
  { to: "/suprimentos",        label: "Suprimentos (Hub)",  icon: Boxes,           accessKey: "estoque",       tier: "operacao",  macro: "suprimentos",   ordem: 5,  critica: true },
  { to: "/solicitacoes-material", label: "Solicitações de Material", icon: ShoppingCart,  accessKey: "estoque",       tier: "operacao",  macro: "suprimentos",   ordem: 20, critica: true },
  { to: "/fornecedores",       label: "Fornecedores",       icon: Truck,           accessKey: "estoque",       tier: "operacao",  macro: "suprimentos",   ordem: 50 },
  { to: "/aprovacoes",         label: "Central de Aprovações", icon: ClipboardCheck, accessKey: "dashboard",   tier: "operacao",  macro: "aprovacoes",    ordem: 10, critica: true },
  { to: "/fornecedores",       label: "Fornecedores",       icon: Truck,           accessKey: "cadastros",     tier: "estrutura", macro: "cadastros",     ordem: 5,  critica: true },
  { to: "/cadastros",          label: "Cadastros Operacionais", icon: Database,    accessKey: "cadastros",     tier: "estrutura", macro: "cadastros",     ordem: 10 },
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
