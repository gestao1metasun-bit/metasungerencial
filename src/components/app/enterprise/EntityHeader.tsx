/**
 * D6.13.2 — EntityHeader
 *
 * Cabeçalho padrão de tela operacional enterprise. Inspirado em TOTVS RM /
 * SAP desktop: título compacto, código/identificador monoespaçado, badges
 * de status, breadcrumbs curtos, ações primárias à direita.
 *
 * NÃO substitui PageHeader ainda — é a versão "enterprise entity" para
 * telas que mostram UMA entidade focada (PV, Contrato, Obra, Título…).
 * Telas de listagem continuam com PageHeader convencional.
 */
import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityStatusBadge, type EntityStatusTone } from "./EntityStatusBadge";

export type EntityCrumb = { label: string; to?: string };

export type EntityHeaderProps = {
  /** Título principal (ex.: "Pedido de Venda"). */
  titulo: string;
  /** Identificador monoespaçado (ex.: "PV-0001/2025"). */
  codigo?: string;
  /** Subtítulo curto (ex.: cliente, valor formatado). */
  subtitulo?: string;
  /** Badges de status. Pode ser string única ou array. */
  status?: string | { label: string; tone?: EntityStatusTone }[];
  /** Breadcrumbs opcionais. */
  crumbs?: EntityCrumb[];
  /** Ações primárias à direita (botões compactos). */
  actions?: ReactNode;
  className?: string;
};

export function EntityHeader({
  titulo, codigo, subtitulo, status, crumbs, actions, className,
}: EntityHeaderProps) {
  const statusList = !status
    ? []
    : typeof status === "string"
      ? [{ label: status }]
      : status;

  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {c.to
                  ? <Link to={c.to} className="hover:text-foreground">{c.label}</Link>
                  : <span>{c.label}</span>}
                {i < crumbs.length - 1 && <ChevronRight className="h-3 w-3 opacity-60" />}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[14px] font-semibold leading-tight text-foreground">{titulo}</h1>
          {codigo && (
            <span className="font-mono text-[12px] text-muted-foreground select-all">
              {codigo}
            </span>
          )}
          {statusList.map((s, i) => (
            <EntityStatusBadge key={i} status={s.label} tone={s.tone} />
          ))}
        </div>
        {subtitulo && (
          <p className="text-[12px] text-muted-foreground">{subtitulo}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
