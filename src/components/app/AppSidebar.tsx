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
      className={`sticky top-14 z-30 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-border/70 bg-card md:flex ${
        collapsed ? "w-16" : "w-64"
      } transition-[width] duration-150`}
    >
      {/* Seletor de módulo */}
      <div className={`border-b border-border/70 ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>
        {!collapsed && (
          <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Módulo
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={moduloAtual ? `Módulo: ${moduloAtual.label}` : "Início — selecionar módulo"}
              className={`flex w-full items-center gap-2.5 rounded-xl border border-border/70 bg-muted/50 text-left text-[13px] font-semibold text-foreground shadow-sm transition-colors hover:bg-muted ${
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              }`}
            >
              {ModuloIcon && <ModuloIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />}
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate">{moduloAtual?.label ?? "Início"}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem onSelect={voltarInicio} className="gap-2 text-[13px]">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">Início</span>
              {modoInicio && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

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
                        className="gap-2 text-[13px]"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{m.label}</span>
                        {sel && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

      </div>


      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {/* Modo Início — menu enxuto: Dashboard + módulos */}
        {modoInicio && (
          <>
            <Link
              to="/dashboard"
              title="Dashboard"
              className={`flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                rotaInicial
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-foreground/85 hover:bg-muted"
              }`}
            >
              <Home className="h-4 w-4 shrink-0" strokeWidth={2} />
              {!collapsed && <span className="truncate">Dashboard</span>}
            </Link>

            {!collapsed && (
              <div className="mt-4 rounded-xl bg-muted/50 px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">
                Selecione um módulo acima para abrir suas opções.
              </div>
            )}
          </>
        )}

        {/* Abas do módulo selecionado aparecem direto, sem repetir o nome do módulo */}
        {!collapsed && abasDoModulo.length > 0 && (
          <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {moduloAtual?.label}
          </div>
        )}

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
                className={`block truncate rounded-lg px-3 py-2 text-[13px] transition-colors ${
                  abaAtiva
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground/85 hover:bg-muted"
                }`}
              >
                {t.label}
              </Link>
            );
          })}

        {filhos.length > 0 && !collapsed && (
          <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Telas
          </div>
        )}

        {filhos.map((n) => {
          const active = path === n.to;
          const ItemIcon = n.icon;
          const abas = (ROUTE_TABS[n.to]?.tabs ?? []).filter((t) => !t.hidden);
          const subOpen = !collapsed && itemAberto === n.to && abas.length > 0;

          return (
            <div key={`${n.to}-${n.ordem}`}>
              <div
                className={`group relative flex items-center rounded-lg transition-colors ${
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground/85 hover:bg-muted"
                }`}
              >
                <Link
                  to={n.to}
                  title={n.label}
                  onClick={() => abas.length > 0 && setSubAberto(n.to)}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 truncate py-2 text-[13px] ${
                    collapsed ? "justify-center px-0" : "px-3"
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
                    className="mr-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${subOpen ? "" : "-rotate-90"}`} />
                  </button>
                )}
              </div>

              {subOpen && (
                <div className="my-1 ml-6 space-y-0.5 border-l border-border pl-3">
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
                        className={`block truncate rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors ${
                          abaAtiva
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        className="flex items-center justify-center gap-1.5 border-t border-border/70 py-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Recolher</>}
      </button>
    </aside>
  );
}

