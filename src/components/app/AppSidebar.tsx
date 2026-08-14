/**
 * AppSidebar — menu lateral corporativo (Meta Sun).
 *
 * Seletor de módulo no topo: a sidebar exibe apenas o módulo selecionado
 * (Financeiro, Comercial, Engenharia, Suprimentos...), com seus itens e
 * as respectivas abas como subitens.
 * Rotas e permissões seguem vindo de `nav-structure.ts` + `identidade.ts`.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronsLeft, ChevronsRight, Check, Home } from "lucide-react";
import { MACRO_MODULES, NAV_ITEMS, macroAtivoPorRota, type MacroKey } from "@/lib/nav-structure";
import { ROUTE_TABS } from "@/lib/route-tabs";
import { useIdentidade, canAccessModule } from "@/lib/identidade";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LS_KEY = "ui.sidebar.collapsed.v1";
const LS_MODULO = "ui.sidebar.modulo.v1";

/** Agrupamento visual dos macros no seletor (não altera rotas). */
type Secao = { id: string; label: string; macros: MacroKey[] };

const SECOES: Secao[] = [
  {
    id: "operacao",
    label: "Operação",
    macros: ["comercial", "financeiro", "financiamentos", "suprimentos", "engenharia", "posvenda", "aprovacoes"],
  },
  { id: "gestao", label: "Gestão & Análise", macros: ["analytics"] },
  { id: "estrutura", label: "Estrutura", macros: ["cadastros", "configuracoes"] },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const identidade = useIdentidade();

  /** aba ativa lida do hash (#tab=valor) */
  const tabAtiva = (() => {
    const raw = (hash ?? "").replace(/^#/, "");
    const m = /(?:^|&)tab=([^&]+)/.exec(raw);
    return m ? decodeURIComponent(m[1]) : "";
  })();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LS_KEY) === "1";
  });

  const macroAtivo = macroAtivoPorRota(path);

  const modulos = useMemo(() => {
    if (!identidade.sessionLoading && identidade.isAuthenticated && identidade.role === "usuario") {
      return MACRO_MODULES.filter((m) => canAccessModule(identidade.role, m.accessKey));
    }
    return MACRO_MODULES;
  }, [identidade.sessionLoading, identidade.isAuthenticated, identidade.role]);

  const [moduloSel, setModuloSel] = useState<MacroKey | null>(() => {
    if (typeof window === "undefined") return null;
    return (window.localStorage.getItem(LS_MODULO) as MacroKey) || null;
  });

  /** Rota de entrada do sistema — sidebar abre em modo "Início" (enxuto). */
  const rotaInicial = path === "/" || path === "/dashboard";

  // Navegou para outro módulo → o seletor acompanha a rota.
  useEffect(() => {
    if (rotaInicial) return;
    if (macroAtivo && macroAtivo.key !== moduloSel) {
      setModuloSel(macroAtivo.key);
      try { window.localStorage.setItem(LS_MODULO, macroAtivo.key); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macroAtivo?.key, rotaInicial]);

  // Voltou para a home → volta ao menu inicial enxuto.
  useEffect(() => {
    if (!rotaInicial) return;
    setModuloSel(null);
    try { window.localStorage.removeItem(LS_MODULO); } catch { /* ignore */ }
  }, [rotaInicial]);

  const moduloAtual = moduloSel ? modulos.find((m) => m.key === moduloSel) ?? null : null;
  const modoInicio = !moduloAtual;

  /** item (2º nível) expandido — accordion */
  const [subAberto, setSubAberto] = useState<string | null>(null);
  const itemAberto = subAberto ?? (ROUTE_TABS[path] ? path : null);

  function selecionarModulo(key: MacroKey) {
    setModuloSel(key);
    setSubAberto(null);
    try { window.localStorage.setItem(LS_MODULO, key); } catch { /* ignore */ }
  }

  function voltarInicio() {
    setModuloSel(null);
    setSubAberto(null);
    try { window.localStorage.removeItem(LS_MODULO); } catch { /* ignore */ }
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { window.localStorage.setItem(LS_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  /** abas da rota principal do módulo — exibidas direto, sem repetir o nome do módulo */
  const abasDoModulo = moduloAtual
    ? (ROUTE_TABS[moduloAtual.to]?.tabs ?? []).filter((t) => !t.hidden)
    : [];

  const filhos = moduloAtual
    ? NAV_ITEMS.filter((n) => n.macro === moduloAtual.key && n.to !== moduloAtual.to).sort(
        (a, b) => a.ordem - b.ordem,
      )
    : [];

  const ModuloIcon = moduloAtual?.icon ?? Home;


  return (
    <aside
      className={`sticky top-11 z-30 hidden h-[calc(100vh-2.75rem)] shrink-0 flex-col border-r bg-card md:flex ${
        collapsed ? "w-14" : "w-60"
      } transition-[width] duration-150`}
    >
      {/* Seletor de módulo */}
      <div className={`border-b ${collapsed ? "px-1.5 py-2" : "px-2 py-2"}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={moduloAtual ? `Módulo: ${moduloAtual.label}` : "Selecionar módulo"}
              className={`flex w-full items-center gap-2 rounded-md border bg-muted/40 text-left text-[12px] font-semibold text-foreground transition-colors hover:bg-muted ${
                collapsed ? "justify-center px-0 py-2" : "px-2.5 py-2"
              }`}
            >
              {ModuloIcon && <ModuloIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />}
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate">{moduloAtual?.label ?? "Módulo"}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {SECOES.map((sec, i) => {
              const itens = sec.macros
                .map((k) => modulos.find((m) => m.key === k))
                .filter(Boolean) as typeof MACRO_MODULES;
              if (itens.length === 0) return null;
              return (
                <div key={sec.id}>
                  {i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
                    {sec.label}
                  </DropdownMenuLabel>
                  {itens.map((m) => {
                    const Icon = m.icon;
                    const sel = moduloAtual?.key === m.key;
                    return (
                      <DropdownMenuItem
                        key={m.key}
                        onSelect={() => selecionarModulo(m.key)}
                        className="gap-2 text-[12px]"
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">{m.label}</span>
                        {sel && <Check className="h-3.5 w-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {/* Abas do módulo selecionado aparecem direto, sem repetir o nome do módulo */}
        {!collapsed &&
          abasDoModulo.map((t) => {
            const destino = t.to ?? moduloAtual!.to;
            const abaAtiva = t.to
              ? path === t.to
              : path === moduloAtual!.to && (tabAtiva || ROUTE_TABS[moduloAtual!.to]?.default) === t.value;
            return (
              <Link
                key={`mod-${t.value}`}
                to={destino}
                hash={t.to ? undefined : `tab=${t.value}`}
                className={`block truncate rounded py-1.5 pl-3 pr-1.5 text-[12px] transition-colors ${
                  abaAtiva
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground/90 hover:bg-meta-bar hover:text-meta-bar-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}

        {filhos.map((n) => {
          const active = path === n.to;
          const ItemIcon = n.icon;
          const abas = (ROUTE_TABS[n.to]?.tabs ?? []).filter((t) => !t.hidden);
          const subOpen = !collapsed && itemAberto === n.to && abas.length > 0;

          return (
            <div key={`${n.to}-${n.ordem}`}>
              <div
                className={`group relative flex items-center rounded-md transition-colors ${
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground/90 hover:bg-meta-bar hover:text-meta-bar-foreground [&_svg]:hover:text-meta-bar-foreground"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" aria-hidden />
                )}
                <Link
                  to={n.to}
                  title={n.label}
                  onClick={() => abas.length > 0 && setSubAberto(n.to)}
                  className={`flex min-w-0 flex-1 items-center gap-2 truncate py-1.5 text-[12px] ${
                    collapsed ? "justify-center px-0" : "pl-3 pr-1"
                  }`}
                >
                  <ItemIcon
                    className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={active ? 2.3 : 1.9}
                  />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </Link>
                {!collapsed && abas.length > 0 && (
                  <button
                    type="button"
                    aria-label={`${subOpen ? "Recolher" : "Expandir"} ${n.label}`}
                    aria-expanded={subOpen}
                    onClick={() => setSubAberto(subOpen ? "" : n.to)}
                    className="mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${subOpen ? "" : "-rotate-90"}`} />
                  </button>
                )}
              </div>

              {subOpen && (
                <div className="my-0.5 ml-[19px] space-y-px border-l border-border/70 pl-2.5">
                  {abas.map((t) => {
                    const destino = t.to ?? n.to;
                    const abaAtiva = t.to
                      ? path === t.to
                      : path === n.to && (tabAtiva || ROUTE_TABS[n.to]?.default) === t.value;
                    return (
                      <Link
                        key={`${n.to}-${t.value}`}
                        to={destino}
                        hash={t.to ? undefined : `tab=${t.value}`}
                        className={`block truncate rounded py-1 pl-2 pr-1.5 text-[11.5px] transition-colors ${
                          abaAtiva
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-meta-bar hover:text-meta-bar-foreground"
                        }`}
                      >
                        {t.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        className="flex items-center justify-center gap-1.5 border-t py-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <><ChevronsLeft className="h-3.5 w-3.5" /> Recolher</>}
      </button>
    </aside>
  );
}
