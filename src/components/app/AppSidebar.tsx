/**
 * AppSidebar — menu lateral corporativo (Meta Sun).
 *
 * Coexiste com o MacroNav do header: aqui o usuário navega por módulo
 * e vê as rotas internas de cada macro. Colapsável (mini com ícones),
 * com o macro da rota atual sempre aberto.
 */
import { useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { MACRO_MODULES, NAV_ITEMS, macroAtivoPorRota, type MacroKey } from "@/lib/nav-structure";
import { useIdentidade, canAccessModule } from "@/lib/identidade";
import logoMetaSun from "@/assets/logo-metasun.png";

const LS_KEY = "ui.sidebar.collapsed.v1";

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const identidade = useIdentidade();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LS_KEY) === "1";
  });

  const macroAtivo = macroAtivoPorRota(path);
  const [aberto, setAberto] = useState<MacroKey | null>(macroAtivo?.key ?? null);
  const macroAberto = aberto ?? macroAtivo?.key ?? null;

  const modulos = useMemo(() => {
    if (!identidade.sessionLoading && identidade.isAuthenticated && identidade.role === "usuario") {
      return MACRO_MODULES.filter((m) => canAccessModule(identidade.role, m.accessKey));
    }
    return MACRO_MODULES;
  }, [identidade.sessionLoading, identidade.isAuthenticated, identidade.role]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { window.localStorage.setItem(LS_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-card md:flex ${
        collapsed ? "w-12" : "w-56"
      } transition-[width] duration-150`}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-meta-bar-active/40 bg-meta-bar px-3 text-meta-bar-foreground">
        <img src={logoMetaSun} alt="META SUN" className="h-6 w-auto object-contain" />
        {!collapsed && (
          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-meta-bar-foreground/70">
            Gerencial
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {modulos.map((m) => {
          const Icon = m.icon;
          const isActiveMacro = macroAtivo?.key === m.key;
          const isOpen = !collapsed && macroAberto === m.key;
          const filhos = NAV_ITEMS
            .filter((n) => n.macro === m.key)
            .sort((a, b) => a.ordem - b.ordem);

          return (
            <div key={m.key} className="px-1.5">
              <div
                className={`group flex items-center rounded ${
                  isActiveMacro ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60"
                }`}
              >
                <Link
                  to={m.to}
                  title={m.label}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-[12px] font-medium"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActiveMacro ? "text-primary" : "text-muted-foreground"}`} />
                  {!collapsed && <span className="truncate">{m.label}</span>}
                </Link>
                {!collapsed && filhos.length > 0 && (
                  <button
                    type="button"
                    aria-label={`Expandir ${m.label}`}
                    onClick={() => setAberto(isOpen ? null : m.key)}
                    className="mr-1 rounded p-0.5 text-muted-foreground hover:bg-muted"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="mb-1 ml-4 border-l pl-2">
                  {filhos.map((n) => {
                    const active = path === n.to;
                    return (
                      <Link
                        key={`${m.key}-${n.to}-${n.ordem}`}
                        to={n.to}
                        className={`block truncate rounded px-2 py-1 text-[11.5px] ${
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {n.label}
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
        className="flex items-center justify-center gap-1.5 border-t py-1.5 text-[11px] text-muted-foreground hover:bg-muted/60"
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <><ChevronsLeft className="h-3.5 w-3.5" /> Recolher</>}
      </button>
    </aside>
  );
}
