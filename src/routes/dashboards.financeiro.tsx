import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/financeiro")({
  beforeLoad: () => { throw redirect({ to: "/analytics/financeiro", replace: true }); },
});
