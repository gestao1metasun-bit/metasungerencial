import { createFileRoute, redirect } from "@tanstack/react-router";

// C-ENT.11.d — Rota legada. Verdade oficial = /comercial (aba "orcamentos"),
// que já renderiza <PropostasPage embedded />. Mantido como redirect para
// preservar bookmarks e links externos sem deixar tela duplicada como
// fonte alternativa.
export const Route = createFileRoute("/propostas")({
  beforeLoad: () => {
    throw redirect({ to: "/comercial", search: { tab: "orcamentos" } as never, replace: true });
  },
});
