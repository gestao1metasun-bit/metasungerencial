/**
 * D17.UI.4 — EnterprisePageShell
 *
 * Casca padrão de tela operacional Meta Sun (modelo RM/TOTVS):
 *
 *   Linha 1 — Título + breadcrumb + ações de página (header compacto)
 *   Linha 2 — EnterpriseRecordToolbar (Novo/Editar/Excluir/Processos/Filtros/Colunas/Exportar/Atualizar)
 *   Linha 3 — Strip de filtros ativos / contagem / paginação
 *   Conteúdo — slot do grid
 *
 * Zero regra de negócio. Zero IO. Só layout consistente.
 * Toda tela operacional do ERP deve consumir esta casca.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EnterprisePageShellProps = {
  /** Título da tela (ex.: "Contratos", "Contas a Pagar"). */
  title: string;
  /** Subtítulo discreto opcional (ex.: contagem total, contexto). */
  subtitle?: ReactNode;
  /** Toolbar enterprise da tela (montada pelo consumidor). */
  toolbar: ReactNode;
  /** Strip opcional de filtros aplicados / KPIs leves / paginação topo. */
  stripe?: ReactNode;
  /** Grid principal. */
  children: ReactNode;
  /** Densidade visual (compact=padrão RM, normal=padrão SaaS, comfortable=acessibilidade). */
  density?: "compact" | "normal" | "comfortable";
  /** Classe extra no container raiz. */
  className?: string;
};

const densityPad: Record<NonNullable<EnterprisePageShellProps["density"]>, string> = {
  compact: "[&_table_td]:py-1 [&_table_th]:py-1.5 text-[13px]",
  normal: "[&_table_td]:py-2 [&_table_th]:py-2 text-[13px]",
  comfortable: "[&_table_td]:py-2.5 [&_table_th]:py-3 text-sm",
};

export function EnterprisePageShell({
  title,
  subtitle,
  toolbar,
  stripe,
  children,
  density = "compact",
  className,
}: EnterprisePageShellProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-1.5",
        densityPad[density],
        className
      )}
      data-enterprise-shell
    >
      {/* Linha 1 — header compacto */}
      <header className="flex items-baseline justify-between gap-2 px-1">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          ) : null}
        </div>
      </header>

      {/* Linha 2 — toolbar enterprise */}
      <div className="rounded-sm border border-border bg-card">{toolbar}</div>

      {/* Linha 3 — strip opcional */}
      {stripe ? (
        <div className="rounded-sm border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
          {stripe}
        </div>
      ) : null}

      {/* Conteúdo principal */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-border bg-card">
        {children}
      </div>
    </div>
  );
}
