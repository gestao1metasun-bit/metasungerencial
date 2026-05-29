/**
 * D17.UI Fase 5 — Operações Financeiras (chrome Enterprise)
 *
 * Página oficial do módulo Operações Financeiras (empréstimos, aportes,
 * devoluções, capital de giro, aplicações, parcelamentos especiais).
 *
 * Estado atual:
 *  • F1 (DB foundation) e F2 (7 RPCs) já aplicadas — ver
 *    mem://features/onda-f1-op-financeiras-foundation e onda-f2-op-financeiras-rpcs.
 *  • F3 (UI funcional + view v_op_fin_enriquecido) é a próxima onda.
 *  • Esta tela entrega o CHROME Enterprise RM/TOTVS (toolbar + grid stub +
 *    abas) para padronização visual sem mexer em backend.
 *
 * Regra de pedra (Onda F):
 *  NUNCA toca contratos/propostas/PV/engenharia/comissão. 100% segregado.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Landmark, Wallet, Undo2, Star, CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EnterpriseRecordToolbar } from "@/components/app/enterprise";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/operacoes-financeiras")({
  head: () => ({ meta: [{ title: "Operações Financeiras — Meta Sun" }] }),
  component: OperacoesFinanceirasPage,
});

type Tab = "emprestimos" | "aportes" | "devolucoes" | "especiais" | "parcelamentos";

const TAB_META: Record<Tab, { label: string; icon: typeof Landmark; descricao: string }> = {
  emprestimos:   { label: "Empréstimos",            icon: Landmark,      descricao: "Capital de giro, BNDES, FCO, linhas bancárias." },
  aportes:       { label: "Aportes",                icon: Wallet,        descricao: "Aportes de sócios e capital próprio." },
  devolucoes:    { label: "Devoluções",             icon: Undo2,         descricao: "Devoluções a sócios e amortizações antecipadas." },
  especiais:     { label: "Operações Especiais",    icon: Star,          descricao: "Aplicações financeiras, resgates, operações pontuais." },
  parcelamentos: { label: "Parcelamentos",          icon: CalendarRange, descricao: "Parcelamentos negociados (REFIS, governo, fornecedores)." },
};

function OperacoesFinanceirasPage() {
  const [tab, setTab] = useState<Tab>("emprestimos");
  const meta = TAB_META[tab];
  const Icon = meta.icon;

  return (
    <>
      <PageHeader
        title="Operações Financeiras"
        subtitle="Empréstimos, aportes, devoluções, aplicações e parcelamentos — segregados do fluxo comercial."
      />
      <div className="mb-3">
        <EnterpriseRecordToolbar
          entityType="operacoes_financeiras"
          availableActions={["novo", "atualizar", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
          selectedIds={[]}
          searchPlaceholder="Buscar operação, contraparte, banco, descrição…"
          onAction={(a) => {
            if (a === "novo") toast.info("Cadastro de operação chega em D17.UI Fase 5b (F3 UI funcional).");
            else if (a === "atualizar") toast.success("Lista recarregada.");
            else if (a === "historico") toast.info("Histórico chega em D17.UI Fase 5b.");
            else if (a === "imprimir") window.print();
            else if (a === "colunas") toast.info("Gestor de colunas chega em D17.UI.4b.");
            else if (a === "filtroAvancado") toast.info("Filtros avançados chegam em D17.UI.4b.");
            else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.4b.");
          }}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {(Object.keys(TAB_META) as Tab[]).map((k) => {
            const m = TAB_META[k];
            const I = m.icon;
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5">
                <I className="h-3.5 w-3.5" /> {m.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(TAB_META) as Tab[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-5">
            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                <Icon className="h-4 w-4 text-primary" /> {meta.label}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{meta.descricao}</p>
              <div className="rounded-md border border-dashed border-border p-10 text-center">
                <div className="text-sm font-medium text-foreground">
                  Backend pronto · UI funcional em D17.UI Fase 5b
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tabelas <code>operacoes_financeiras</code>, <code>_parcelas</code> e <code>_eventos</code> já
                  existem (Onda F1). RPCs <code>rpc_op_fin_*</code> oficiais já publicadas (Onda F2).
                  <br />
                  Listagem, formulário e fluxos de aprovação/liberação/renegociação serão ligados em F3 sem
                  alterar este chrome Enterprise.
                </p>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
