/**
 * AppSidebar — menu lateral corporativo (Meta Sun).
 *
 * Navegação mestra por macro módulo, com submenus em accordion.
 * Mudança apenas visual/estrutural: rotas e permissões seguem vindo de
 * `nav-structure.ts` + `identidade.ts`.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { MACRO_MODULES, NAV_ITEMS, macroAtivoPorRota, type MacroKey } from "@/lib/nav-structure";
import { useIdentidade, canAccessModule } from "@/lib/identidade";
import logoMetaSun from "@/assets/logo-metasun.png";

const LS_KEY = "ui.sidebar.collapsed.v1";
const LS_SECOES = "ui.sidebar.secoes.v1";

/** Agrupamento visual dos macros (não altera rotas). */
type Secao = { id: string; label: string; macros: MacroKey[]; defaultOpen: boolean };

const SECOES: Secao[] = [
  {
    id: "operacao",
    label: "Operação",
    macros: ["comercial", "financeiro", "financiamentos", "suprimentos", "engenharia", "posvenda", "aprovacoes"],
    defaultOpen: true,
  },
  { id: "gestao", label: "Gestão & Análise", macros: ["analytics"], defaultOpen: true },
  { id: "estrutura", label: "Estrutura", macros: ["cadastros", "configuracoes"], defaultOpen: false },
];

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

  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>(() => {
    const base = Object.fromEntries(SECOES.map((s) => [s.id, s.defaultOpen]));
    if (typeof window === "undefined") return base;
    try {
      const raw = window.localStorage.getItem(LS_SECOES);
      return raw ? { ...base, ...JSON.parse(raw) } : base;
    } catch {
      return base;
    }
  });

  // Seção que contém a rota atual sempre abre.
  useEffect(() => {
    if (!macroAtivo) return;
    const sec = SECOES.find((s) => s.macros.includes(macroAtivo.key));
    if (sec && !secoesAbertas[sec.id]) {
      setSecoesAbertas((prev) => ({ ...prev, [sec.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macroAtivo?.key]);

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

  function toggleSecao(id: string) {
    setSecoesAbertas((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { window.localStorage.setItem(LS_SECOES, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function renderMacro(m: (typeof MACRO_MODULES)[number]) {
    const Icon = m.icon;
    const isActiveMacro = macroAtivo?.key === m.key;
    const isOpen = !collapsed && macroAberto === m.key;
    const filhos = NAV_ITEMS.filter((n) => n.macro === m.key).sort((a, b) => a.ordem - b.ordem);

    return (
      <div key={m.key} className="px-2">
        <div
          className={`group relative flex items-center rounded-md transition-colors ${
            isActiveMacro
              ? "bg-primary/10 text-primary"
              : "text-foreground/90 hover:bg-muted/70"
          }`}
        >
          {isActiveMacro && (
            <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" aria-hidden />
          )}
          <Link
            to={m.to}
            title={m.label}
            className={`flex min-w-0 flex-1 items-center gap-2.5 py-2 text-[12.5px] font-medium ${
              collapsed ? "justify-center px-0" : "pl-3 pr-2"
            }`}
          >
            <Icon
              className={`h-[17px] w-[17px] shrink-0 ${
                isActiveMacro ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }`}
              strokeWidth={isActiveMacro ? 2.4 : 1.9}
            />
            {!collapsed && <span className="truncate">{m.label}</span>}
          </Link>
          {!collapsed && filhos.length > 0 && (
            <button
              type="button"
              aria-label={`${isOpen ? "Recolher" : "Expandir"} ${m.label}`}
              aria-expanded={isOpen}
              onClick={() => setAberto(isOpen ? null : m.key)}
              className="mr-1.5 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? "" : "-rotate-90"}`} />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="relative my-1 ml-[18px] space-y-0.5 border-l border-border/70 pl-3">
            {filhos.map((n) => {
              const active = path === n.to;
              const ItemIcon = n.icon;
              return (
                <Link
                  key={`${m.key}-${n.to}-${n.ordem}`}
                  to={n.to}
                  className={`flex items-center gap-2 truncate rounded-md py-1.5 pl-2 pr-2 text-[11.5px] transition-colors ${
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <ItemIcon
                    className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/70"}`}
                    strokeWidth={1.9}
                  />
                  <span className="truncate">{n.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-card md:flex ${
        collapsed ? "w-14" : "w-60"
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

      <nav className="flex-1 space-y-3 overflow-y-auto py-3">
        {SECOES.map((sec) => {
          const macrosSecao = sec.macros
            .map((k) => modulos.find((m) => m.key === k))
            .filter(Boolean) as typeof MACRO_MODULES;
          if (macrosSecao.length === 0) return null;
          const aberta = collapsed ? true : secoesAbertas[sec.id];

          return (
            <div key={sec.id}>
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSecao(sec.id)}
                  aria-expanded={aberta}
                  className="mb-1 flex w-full items-center justify-between px-4 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 hover:text-foreground"
                >
                  <span>{sec.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${aberta ? "" : "-rotate-90"}`} />
                </button>
              ) : (
                <div className="mx-3 mb-2 border-t border-border/60" aria-hidden />
              )}

              {aberta && <div className="space-y-0.5">{macrosSecao.map(renderMacro)}</div>}
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
