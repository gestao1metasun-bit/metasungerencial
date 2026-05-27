import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/engenharia")({
  beforeLoad: () => { throw redirect({ to: "/paineis/engenharia", replace: true }); },
});
