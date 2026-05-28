import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/financiamentos")({
  beforeLoad: () => { throw redirect({ to: "/analytics/financiamentos", replace: true }); },
});
