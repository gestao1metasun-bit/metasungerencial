import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * D6.E — Alias /analises → /analytics
 *
 * O macro Painéis exibe "Análises" no nav, mas o módulo real continua em
 * /analytics (rota grande, ~800 linhas, com estado próprio). Mantemos o
 * path amigável e redirecionamos preservando o hash (#tab=...).
 */
export const Route = createFileRoute("/analises")({
  component: () => <Navigate to="/analytics" replace hash={(h) => h} />,
});
