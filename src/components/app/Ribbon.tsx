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

const TONE_CLASSES: Record<string, string> = {
  neutral: "text-foreground/70",
  ok:      "text-emerald-700",
  warn:    "text-amber-700",
  muted:   "text-muted-foreground",
};

export type RibbonProps = {
  /** rota ativa (usada para href dos botões) */
  routePath: string;
  /** tabs já filtradas (sem hidden) */
  tabs: SubTab[];
  /** valor da tab atualmente ativa (parseHash) */
  activeValue: string;
  /** tab default se nenhuma estiver na URL */
  defaultValue: string;
};

export function Ribbon({ routePath, tabs, activeValue, defaultValue }: RibbonProps) {
  // Agrupa preservando ordem original (groupBy estável)
  const groups: { name: string; tabs: SubTab[] }[] = [];
  for (const t of tabs) {
    const name = t.group ?? "Geral";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.tabs.push(t);
    else groups.push({ name, tabs: [t] });
  }

  const effectiveActive = activeValue || defaultValue;

  return (
    <div className="border-t border-border/60 bg-secondary/30">
      <div className="flex items-stretch gap-0 overflow-x-auto px-3 py-1.5">
        {groups.map((g, gi) => {
          const meta = GROUP_META[g.name] ?? GROUP_META.Geral;
          const GIcon = meta.icon;
          return (
            <div key={`${g.name}-${gi}`} className="flex items-stretch">
              {gi > 0 && <div className="mx-1 w-px self-stretch bg-border/70" />}
              <div className="flex flex-col items-stretch px-2 py-0.5 min-w-0">
                <div className="flex flex-wrap items-start gap-0.5">
                  {g.tabs.map((t) => {
                    const Icon = iconFor(t);
                    const isActive = effectiveActive === t.value;
                    return (
                      <Link
                        key={t.value}
                        to={routePath}
                        hash={`tab=${t.value}`}
                        className={`group inline-flex flex-col items-center gap-0.5 rounded px-2 py-1 min-w-[58px] transition ${
                          isActive
                            ? "bg-gold/15 text-gold"
                            : "text-foreground/70 hover:bg-accent/60 hover:text-foreground"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? "text-gold" : "text-muted-foreground group-hover:text-foreground"}`} />
                        <span className={`text-[10.5px] leading-tight text-center whitespace-nowrap ${isActive ? "font-semibold" : ""}`}>
                          {t.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <div className={`mt-0.5 flex items-center gap-1 px-1 text-[9px] font-bold uppercase tracking-[0.16em] ${TONE_CLASSES[meta.tone]}`}>
                  <GIcon className="h-2.5 w-2.5" />
                  {g.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
