import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboards")({
  beforeLoad: () => { throw redirect({ to: "/paineis", replace: true }); },
});
