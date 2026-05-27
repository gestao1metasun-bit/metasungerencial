import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards/posvenda")({
  beforeLoad: () => { throw redirect({ to: "/paineis/posvenda", replace: true }); },
});
