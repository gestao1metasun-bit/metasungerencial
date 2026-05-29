/**
 * D6.2 — Ribbon TOTVS/RM.
 *
 * Renderiza as tabs de ROUTE_TABS agrupadas por `group` em painéis horizontais
 * (Visão | Operação | Controle | Estrutura | etc), com ícones e separadores.
 *
 * Compatibilidade:
 *  - Continua usando ROUTE_TABS como fonte (sem migração necessária).
 *  - Tab `value` continua sendo `#tab=<value>` — rotas existentes não quebram.
 *  - Tabs sem `group` caem em "Geral".
 *  - `icon` em SubTab é opcional; se ausente, deriva-se do label/grupo.
 */
import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  Eye, Zap, ShieldCheck, Database, Settings as Cog,
  LineChart, BarChart3, Table2, Receipt, FileText,
  Wallet, Banknote, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  CheckCircle2, Lock, RotateCcw, HandCoins, XCircle,
  Truck, Package, ShoppingCart, ClipboardList, Users,
  HardHat, Calendar, Wrench, AlertTriangle, FolderTree,
  Briefcase, Layers, ListChecks, Headset, Phone, Tag,
  Building2, Sliders, KeySquare, ShieldAlert, History, Trash2,
  Calculator, FileBarChart, Activity,
} from "lucide-react";
import type { SubTab } from "@/lib/route-tabs";

type Icon = ComponentType<{ className?: string }>;

// Heurísticas: mapeia label → ícone. Mantém ROUTE_TABS limpo.
const LABEL_ICONS: Array<[RegExp, Icon]> = [
  [/dashboard|visão geral|visão executiva|indicadores/i, BarChart3],
  [/fluxo.*caixa/i, TrendingUp],
  [/fluxo real/i, Activity],
  [/visão gerencial|gerencial/i, LineChart],
  [/cmv|compras/i, ShoppingCart],
  [/contas a receber|receber/i, ArrowDownToLine],
  [/contas a pagar|pagar/i, ArrowUpFromLine],
  [/lançamentos/i, Receipt],
  [/despesas|recorrentes/i, Wallet],
  [/concilia/i, CheckCircle2],
  [/fechamento/i, Lock],
  [/renegocia/i, RotateCcw],
  [/adiantamentos/i, HandCoins],
  [/rescis/i, XCircle],
  [/fornecedores/i, Truck],
  [/plano de contas|categorias/i, FolderTree],
  [/parâmetros financ/i, Sliders],
  [/centros|naturezas/i, FolderTree],
  [/proposta|orçamento/i, FileText],
  [/contrato/i, FileText],
  [/aditivos/i, Layers],
  [/pedidos? de venda|pedidos/i, Receipt],
  [/leads|pistas/i, Users],
  [/carteira|financiados|cancelados|finalizados|previsão|sem financ|pendências/i, ClipboardList],
  [/obras|necessidade/i, HardHat],
  [/cronograma/i, Calendar],
  [/itens|estoque atual/i, Package],
  [/entregas/i, Truck],
  [/kanban|projetos/i, Layers],
  [/equipes/i, Users],
  [/chamados/i, Phone],
  [/tipos/i, Tag],
  [/empresa/i, Building2],
  [/parâmetros do sistema|parâmetros/i, Sliders],
  [/perfis/i, Users],
  [/permissões/i, KeySquare],
  [/usuários/i, Users],
  [/consultores/i, Users],
  [/sessões|logs de sessão/i, History],
  [/cfg-/i, Cog],
  [/integrações/i, ShieldAlert],
  [/feature flags|sistema/i, Cog],
  [/logs/i, History],
  [/lixeira/i, Trash2],
  [/bancos/i, Building2],
  [/gerentes/i, Users],
  [/vendedores|consultores/i, Users],
  [/status/i, Tag],
  [/ebitda|margens/i, Calculator],
  [/roi|payback/i, TrendingUp],
  [/capital/i, Wallet],
  [/alavancagem|cobertura/i, BarChart3],
  [/conversão|inadimplência/i, LineChart],
  [/dre/i, FileBarChart],
  [/financiamento/i, Banknote],
  [/expansão/i, TrendingUp],
  [/cfo|controladoria/i, ShieldCheck],
  [/parecer/i, FileText],
  [/parâmetros gerenciais/i, Sliders],
];

function iconFor(tab: SubTab): Icon {
  if (tab.icon && (ICON_REGISTRY as any)[tab.icon]) return (ICON_REGISTRY as any)[tab.icon];
  for (const [re, ic] of LABEL_ICONS) if (re.test(tab.label)) return ic;
  return Table2;
}

const ICON_REGISTRY: Record<string, Icon> = {
  Wallet, Banknote, HardHat, Package, Headset, Briefcase, LineChart, FileBarChart,
  ListChecks, Users, Receipt, BarChart3, FileText, Calendar, Wrench, AlertTriangle,
};

const GROUP_META: Record<string, { icon: Icon; tone: "neutral" | "ok" | "warn" | "muted" }> = {
  "Visão":      { icon: Eye,         tone: "neutral" },
  "Operação":   { icon: Zap,         tone: "ok"      },
  "Controle":   { icon: ShieldCheck, tone: "warn"    },
  "Estrutura":  { icon: Database,    tone: "muted"   },
  "Empresa":    { icon: Building2,   tone: "neutral" },
  "Acessos":    { icon: KeySquare,   tone: "warn"    },
  "Módulos":    { icon: Cog,         tone: "muted"   },
  "Orçamentos": { icon: FileText,    tone: "ok"      },
  "Sistema":    { icon: Cog,         tone: "muted"   },
  "Geral":      { icon: Table2,      tone: "neutral" },
};

// Tom da faixa inferior (label centralizado) por grupo.
const GROUP_STRIP_CLASS: Record<string, string> = {
  neutral: "text-meta-bar-active/80",
  ok:      "text-orange-600/85",
  warn:    "text-meta-bar/85",
  muted:   "text-slate-600/80",
};

export type RibbonProps = {
  /** rota ativa (usada para href das tabs por hash) */
  routePath: string;
  /** tabs já filtradas (sem hidden) */
  tabs: SubTab[];
  /** valor da tab atualmente ativa (parseHash) */
  activeValue: string;
  /** tab default se nenhuma estiver na URL */
  defaultValue: string;
  /** rota corrente real do router — usada para marcar como ativa abas cross-route (`SubTab.to`). */
  currentPath?: string;
};

export function Ribbon({ routePath, tabs, activeValue, defaultValue, currentPath }: RibbonProps) {
  // Agrupa preservando ordem original (groupBy estável)
  const groups: { name: string; tabs: SubTab[] }[] = [];
  for (const t of tabs) {
    const name = t.group ?? "Geral";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.tabs.push(t);
    else groups.push({ name, tabs: [t] });
  }

  const effectiveActive = activeValue || defaultValue;

  // D6.13 — Faixas sólidas: cada grupo é um bloco com botões em linha e
  // tira inferior h-4 carregando o nome do agrupamento centralizado.
  return (
    <div className="bg-card border-b border-border shadow-sm">
      <div className="flex items-stretch overflow-x-auto">
        {groups.map((g, gi) => {
          const meta = GROUP_META[g.name] ?? GROUP_META.Geral;
          const stripClass = GROUP_STRIP_CLASS[meta.tone];
          return (
            <div
              key={`${g.name}-${gi}`}
              className={`flex flex-col min-w-max ${gi < groups.length - 1 ? "border-r border-border/70" : ""}`}
            >
              <div className="flex flex-1 items-center px-3 py-1 gap-1">
                {g.tabs.map((t) => {
                  const Icon = iconFor(t);
                  // D19.NAV — tab cross-route (t.to) ativa quando currentPath bate;
                  // tab por hash ativa só quando estamos na própria routePath.
                  const isCrossRoute = !!t.to;
                  const onOwnRoute = currentPath === undefined || currentPath === routePath;
                  const isActive = isCrossRoute
                    ? currentPath === t.to
                    : onOwnRoute && effectiveActive === t.value;
                  const linkProps = isCrossRoute
                    ? { to: t.to! }
                    : { to: routePath, hash: `tab=${t.value}` };
                  return (
                    <Link
                      key={t.value}
                      {...linkProps}
                      className={`group inline-flex flex-col items-center justify-center gap-0.5 rounded-[0.375rem] px-2.5 h-14 min-w-[64px] transition-colors ${
                        isActive
                          ? "bg-meta-bar/10 text-meta-bar"
                          : "text-foreground/75 hover:bg-accent/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] ${isActive ? "text-meta-bar" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <span className={`text-[10px] leading-tight text-center whitespace-nowrap ${isActive ? "font-bold" : "font-semibold"}`}>
                        {t.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="h-4 bg-muted/40 border-t border-border/60 flex items-center justify-center">
                <span className={`text-[9px] font-bold tracking-[0.18em] uppercase ${stripClass}`}>
                  {g.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
