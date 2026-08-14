import { createFileRoute, redirect } from "@tanstack/react-router";

// Redirect legado: /paineis/* → /analytics/*
// Migração 2026-05-28: módulo "paineis" foi absorvido por "analytics".
export const Route = createFileRoute("/paineis/$")({
  beforeLoad: ({ params }) => {
    const rest = (params as { _splat?: string })._splat ?? "";
    throw redirect({
      to: (rest ? `/analytics/${rest}` : "/analytics") as string,
      replace: true,
    });

  },
});
