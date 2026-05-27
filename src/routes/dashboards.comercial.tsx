import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/comercial")({
  beforeLoad: () => { throw redirect({ to: "/paineis/comercial", replace: true }); },
});
