/**
 * D6.1 — Painel Contextual (preparação).
 *
 * Substitui a sidebar legada quando featureFlags.ENTERPRISE_SHELL_FULL = true.
 * Aqui ficam: favoritos, pendências, atalhos e contexto do módulo ativo.
 *
 * Esta versão é o esqueleto da D6.1: estrutura visual + slots prontos,
 * sem implementar workflow/fila pessoal real (isso entra na D6.4).
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { Star, Bell, Zap, Filter, ClipboardCheck } from "lucide-react";
import { macroAtivoPorRota, NAV_ITEMS } from "@/lib/nav-structure";
import { useIdentidade, canAccessModule } from "@/lib/identidade";

export function ContextualSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const identidade = useIdentidade();
  const macro = macroAtivoPorRota(path);

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

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
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
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition ${
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

        {/* Favoritos (placeholder integrável com favoritos-store) */}
        <Section title="Favoritos" icon={<Star className="h-3 w-3" />}>
          <EmptyHint>
            Marque telas frequentes com a estrela no topo para fixar aqui.
          </EmptyHint>
        </Section>

        {/* Pendências do usuário (placeholder D6.4) */}
        <Section title="Pendências" icon={<Bell className="h-3 w-3" />}>
          <Link
            to="/aprovacoes"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-foreground"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-sidebar-foreground/55" />
            Central de Aprovações
          </Link>
          <EmptyHint className="mt-1">
            Fila pessoal (workflow) será ligada na D6.4.
          </EmptyHint>
        </Section>

        {/* Filtros contextuais (placeholder D6.3) */}
        <Section title="Filtros rápidos" icon={<Filter className="h-3 w-3" />}>
          <EmptyHint>Sem filtros disponíveis neste módulo ainda.</EmptyHint>
        </Section>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md bg-sidebar-accent/50 px-3 py-2 ring-1 ring-white/5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
            Shell
          </div>
          <div className="text-[11px] font-semibold text-gold font-display">
            Enterprise RM
          </div>
        </div>
      </div>
    </aside>
  );
}

function Section({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gold/70">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-2.5 text-[11px] leading-snug text-sidebar-foreground/45 ${className}`}>
      {children}
    </div>
  );
}
