import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "@/modules/leads";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Meta Sun Gerencial" }] }),
  component: LeadsPage,
});