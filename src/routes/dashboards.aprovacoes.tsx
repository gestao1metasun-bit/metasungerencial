import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/aprovacoes")({
  beforeLoad: () => { throw redirect({ to: "/paineis/aprovacoes", replace: true }); },
});
