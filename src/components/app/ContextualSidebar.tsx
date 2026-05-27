/**
 * D6.1 — Painel Contextual (D6.7 hardenizado).
 *
 * Substitui a sidebar legada (sempre ativa desde D6.6).
 * Agora conectada a stores reais:
 *  - atalhos do macro módulo (NAV_ITEMS)
 *  - favoritos reais (useFavoritos)
 *  - recentes reais (useRecentes)
 *  - pendências reais (useWorkflowAprovacoes pendentes_para_mim)
 *
 * Sem placeholders "vazios".
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Bell, Zap, ClipboardCheck, Clock, X } from "lucide-react";
import { macroAtivoPorRota, NAV_ITEMS } from "@/lib/nav-structure";
import { useIdentidade, canAccessModule } from "@/lib/identidade";
import { useFavoritos, useRecentes } from "@/lib/favoritos-store";
import { useWorkflowAprovacoes } from "@/hooks/useWorkflowAprovacoes";

export function ContextualSidebar() {
  // Evita hydration mismatch: favoritos/recentes vêm de localStorage (vazio no SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const path = useRouterState({ select: (s) => s.location.pathname });
  const identidade = useIdentidade();
  const macro = macroAtivoPorRota(path);
  const { favoritos, remove: removeFav } = useFavoritos();
  const { recentes } = useRecentes();
  const wf = useWorkflowAprovacoes("pendentes_para_mim");
  const pendentes = wf.data ?? [];

  const atalhosModulo = NAV_ITEMS
    .filter((n) => n.macro === macro?.key)
    .filter((n) =>
      identidade.sessionLoading ? true : canAccessModule(identidade.role, n.accessKey),
    )
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-sidebar-border bg-gradient-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border/70 px-3 py-2">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold/80">
          Contexto
        </div>
        <div className="mt-0.5 text-[12px] font-semibold tracking-tight text-sidebar-foreground truncate">
          {macro?.label ?? "—"}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3" suppressHydrationWarning>
        {/* Atalhos do módulo */}
        <Section title="Atalhos do módulo" icon={<Zap className="h-3 w-3" />}>
          {atalhosModulo.length === 0 ? (
            <EmptyHint>Selecione um módulo no topo.</EmptyHint>
          ) : (
            <ul className="space-y-0.5">
              {atalhosModulo.map((it) => {
                const Icon = it.icon;
                const active = path === it.to || path.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-[12px] transition ${
                        active
                          ? "bg-gold/15 text-gold font-semibold"
                          : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${active ? "text-gold" : "text-sidebar-foreground/55"}`} />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Pendências reais */}
        <Section
          title="Pendências"
          icon={<Bell className="h-3 w-3" />}
          counter={mounted ? (pendentes.length || undefined) : undefined}
        >
          <Link
            to="/aprovacoes"
            className="flex items-center gap-2 rounded px-2 py-1 text-[12px] text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-sidebar-foreground/55" />
            Central de Aprovações
            {mounted && pendentes.length > 0 && (
              <span className="ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded bg-amber-500/90 px-1 text-[9.5px] font-bold text-amber-950">
                {pendentes.length}
              </span>
            )}
          </Link>
          {mounted && pendentes.length === 0 && (
            <EmptyHint className="mt-1">Sem aprovações pendentes para você.</EmptyHint>
          )}
        </Section>

        {/* Favoritos reais */}
        <Section
          title="Favoritos"
          icon={<Star className="h-3 w-3" />}
          counter={mounted ? (favoritos.length || undefined) : undefined}
        >
          {!mounted || favoritos.length === 0 ? (
            <EmptyHint>Use a estrela no topo das telas para fixar aqui.</EmptyHint>
          ) : (
            <ul className="space-y-0.5">
              {favoritos.slice(0, 8).map((f, i) => (
                <li key={`f-${i}`} className="group flex items-center gap-1">
                  <Link
                    to={f.path}
                    hash={f.tab ? `tab=${f.tab}` : undefined}
                    className="flex flex-1 items-center gap-2 rounded px-2 py-1 text-[12px] text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground"
                  >
                    <Star className="h-3 w-3 text-gold/80" />
                    <span className="truncate">{f.label}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Remover favorito"
                    onClick={() => removeFav(f)}
                    className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-sidebar-foreground/40 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Recentes reais */}
        <Section title="Recentes" icon={<Clock className="h-3 w-3" />}>
          {!mounted || recentes.length === 0 ? (
            <EmptyHint>Sem acessos recentes.</EmptyHint>
          ) : (
            <ul className="space-y-0.5">
              {recentes.slice(0, 6).map((r, i) => (
                <li key={`r-${i}`}>
                  <Link
                    to={r.path}
                    hash={r.tab ? `tab=${r.tab}` : undefined}
                    className="flex items-center gap-2 rounded px-2 py-1 text-[12px] text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-foreground"
                  >
                    <Clock className="h-3 w-3 text-sidebar-foreground/45" />
                    <span className="truncate">{r.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

      </nav>

      <div className="border-t border-sidebar-border p-2">
        <div className="rounded bg-sidebar-accent/50 px-2 py-1.5 ring-1 ring-white/5">
          <div className="text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
            Shell
          </div>
          <div className="text-[10.5px] font-semibold text-gold font-display">
            Enterprise RM · D6.7
          </div>
        </div>
      </div>
    </aside>
  );
}

function Section({
  title, icon, counter, children,
}: { title: string; icon: React.ReactNode; counter?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 px-1.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-gold/75">
        {icon}
        <span className="flex-1">{title}</span>
        {typeof counter === "number" && (
          <span className="rounded bg-sidebar-accent px-1 text-[9px] font-bold text-gold">
            {counter}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-2 text-[10.5px] leading-snug text-sidebar-foreground/45 ${className}`}>
      {children}
    </div>
  );
}
