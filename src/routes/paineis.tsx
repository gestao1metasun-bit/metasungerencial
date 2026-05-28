import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/paineis")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics", replace: true });
  },
});
