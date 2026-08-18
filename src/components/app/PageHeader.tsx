import { ReactNode } from "react";
import { FavoritarPaginaButton } from "@/components/app/FavoritosMenu";

/**
 * D6.6 — Cabeçalho ERP corporativo.
 * Densificado: título menor, sem timestamp "última atualização" (sensação SaaS),
 * margem inferior reduzida, regra fina inferior padronizada.
 */
export function PageHeader({
  title, subtitle, actions, eyebrow,
}: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</div>
        )}
        <div className="flex items-center gap-2">
          <h1 className="font-display text-[20px] leading-tight font-semibold tracking-tight text-foreground">{title}</h1>
          <FavoritarPaginaButton title={title} />
        </div>
        {subtitle && (
          <p className="mt-1 max-w-3xl truncate text-[13px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
