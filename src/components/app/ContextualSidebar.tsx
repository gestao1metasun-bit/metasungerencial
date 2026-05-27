/**
 * D6.1 — Painel Contextual (D6.9 hardenizado — visual técnico/discreto).
 *
 * Substitui a sidebar legada (sempre ativa desde D6.6).
 * D6.9: removido protagonismo visual — cinza corporativo, integração
 * contínua com o shell, sem gradiente azul, sem acentos dourados pesados.
 * Inspiração: TOTVS RM / Sankhya / SAP GUI (painel auxiliar técnico).
 *
 * Conectada a stores reais:
 *  - atalhos do macro módulo (NAV_ITEMS)
 *  - favoritos reais (useFavoritos)
 *  - recentes reais (useRecentes)
 *  - pendências reais (useWorkflowAprovacoes pendentes_para_mim)
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
    <aside className="flex w-44 shrink-0 flex-col border-r border-border bg-muted/30 text-foreground/85">
      <div className="border-b border-border px-2 py-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Contexto
        </div>
        <div className="mt-0.5 text-[11.5px] font-semibold tracking-tight text-foreground truncate">
          {macro?.label ?? "—"}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-2" suppressHydrationWarning>
        {/* Atalhos do módulo */}
        <Section title="Atalhos" icon={<Zap className="h-2.5 w-2.5" />}>
          {atalhosModulo.length === 0 ? (
            <EmptyHint>Selecione um módulo no topo.</EmptyHint>
          ) : (
            <ul className="space-y-px">
              {atalhosModulo.map((it) => {
                const Icon = it.icon;
                const active = path === it.to || path.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={`flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] leading-tight transition ${
                        active
                          ? "bg-foreground/10 text-foreground font-semibold"
                          : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-3 w-3 ${active ? "text-foreground/80" : "text-muted-foreground"}`} />
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
          icon={<Bell className="h-2.5 w-2.5" />}
          counter={mounted ? (pendentes.length || undefined) : undefined}
        >
          <Link
            to="/aprovacoes"
            className="flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] leading-tight text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
          >
            <ClipboardCheck className="h-3 w-3 text-muted-foreground" />
            Aprovações
            {mounted && pendentes.length > 0 && (
              <span className="ml-auto inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-sm bg-amber-500/85 px-1 text-[9px] font-bold text-amber-950">
                {pendentes.length}
              </span>
            )}
          </Link>
          {mounted && pendentes.length === 0 && (
            <EmptyHint className="mt-0.5">Sem pendências.</EmptyHint>
          )}
        </Section>

        {/* Favoritos reais */}
        <Section
          title="Favoritos"
          icon={<Star className="h-2.5 w-2.5" />}
          counter={mounted ? (favoritos.length || undefined) : undefined}
        >
          {!mounted || favoritos.length === 0 ? (
            <EmptyHint>Fixe telas pela estrela do topo.</EmptyHint>
          ) : (
            <ul className="space-y-px">
              {favoritos.slice(0, 8).map((f, i) => (
                <li key={`f-${i}`} className="group flex items-center gap-0.5">
                  <Link
                    to={f.path}
                    hash={f.tab ? `tab=${f.tab}` : undefined}
                    className="flex flex-1 items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] leading-tight text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Star className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="truncate">{f.label}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Remover favorito"
                    onClick={() => removeFav(f)}
                    className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Recentes reais */}
        <Section title="Recentes" icon={<Clock className="h-2.5 w-2.5" />}>
          {!mounted || recentes.length === 0 ? (
            <EmptyHint>Sem acessos recentes.</EmptyHint>
          ) : (
            <ul className="space-y-px">
              {recentes.slice(0, 6).map((r, i) => (
                <li key={`r-${i}`}>
                  <Link
                    to={r.path}
                    hash={r.tab ? `tab=${r.tab}` : undefined}
                    className="flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] leading-tight text-foreground/65 hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="truncate">{r.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

      </nav>

      <div className="border-t border-border px-2 py-1">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <span>Shell</span>
          <span className="font-semibold text-foreground/70">Enterprise · D6.9</span>
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
      <div className="mb-0.5 flex items-center gap-1 px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        <span className="flex-1">{title}</span>
        {typeof counter === "number" && (
          <span className="rounded-sm bg-foreground/10 px-1 text-[8.5px] font-bold text-foreground/75">
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
    <div className={`px-1.5 text-[10px] leading-snug text-muted-foreground/70 ${className}`}>
      {children}
    </div>
  );
}
