import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/aprovacoes")({
  beforeLoad: () => { throw redirect({ to: "/analytics/aprovacoes", replace: true }); },
});
