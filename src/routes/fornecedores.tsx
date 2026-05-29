/**
 * D19.UX — Fornecedores como entidade mestre corporativa.
 * Reusa FornecedoresTabSupabase (mesma fonte de dados / mesmo repo /
 * mesma RLS / mesma auditoria). Apenas reposiciona a navegação:
 * fornecedor passa a viver em Cadastros e Compras, não dentro do Financeiro.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { FornecedoresTabSupabase } from "@/modules/financeiro/FornecedoresTabSupabase";

export const Route = createFileRoute("/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — Meta Sun Gerencial" },
      {
        name: "description",
        content:
          "Cadastro corporativo único de fornecedores (compras, financeiro, estoque e integração contábil).",
      },
    ],
  }),
  component: FornecedoresPage,
});

function FornecedoresPage() {
  return (
    <>
      <PageHeader
        title="Fornecedores"
        subtitle="Cadastro corporativo único · compartilhado por Compras, Estoque, Financeiro e Contábil."
      />
      <FornecedoresTabSupabase />
    </>
  );
}
