import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/financiamentos")({
  beforeLoad: () => { throw redirect({ to: "/paineis/financiamentos", replace: true }); },
});
