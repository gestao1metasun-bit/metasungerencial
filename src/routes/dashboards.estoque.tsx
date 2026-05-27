import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/estoque")({
  beforeLoad: () => { throw redirect({ to: "/paineis/estoque", replace: true }); },
});
