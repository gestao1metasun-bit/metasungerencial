import { createFileRoute, redirect } from "@tanstack/react-router";

// D18.10 — Separação Proposta x Contrato.
// `/comercial/propostas` é a URL canônica oficial da camada Propostas.
// Hoje o workspace embarcado vive em `/comercial#tab=orcamentos`
// (PropostasPage embedded) — mantemos um redirect estável para que a URL
// canônica funcione tanto via ribbon quanto via deep-link/bookmark.
export const Route = createFileRoute("/comercial/propostas")({
  beforeLoad: () => {
    throw redirect({ to: "/comercial", hash: "tab=orcamentos", replace: true });
  },
});
