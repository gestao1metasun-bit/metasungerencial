/**
 * D20.SUP.1 — Hub Suprimentos
 *
 * Camada Enterprise que UNIFICA o fluxo Requisição → Aprovação → Estoque /
 * Compras → Recebimento → Entrega → Baixa → Custo realizado.
 *
 * Esta sub-onda entrega APENAS a fundação visual (rota + macro + ribbon).
 * Nenhuma regra nova de negócio, nenhuma migração, nenhuma RPC. Cada aba
 * que ainda não tem implementação dedicada é uma vitrine que aponta para a
 * tela existente (Estoque, Solicitações de Material, Fornecedores).
 *
 * Próximas sub-ondas (D20.SUP.2..8) trazem schema, RPCs e UI dedicadas.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes, ClipboardList, Package, ShoppingCart, FileSearch,
  FileText, PackageCheck, Truck, Users2, BarChart3,
  ArrowRight, Workflow, Layers, Construction, BookOpen,
  ShieldCheck, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisicoesTab } from "@/modules/suprimentos/RequisicoesTab";
import { CotacoesTab } from "@/modules/suprimentos/CotacoesTab";
import { PedidosTab } from "@/modules/suprimentos/PedidosTab";
import { RecebimentosTab } from "@/modules/suprimentos/RecebimentosTab";
import { ItensServicosTab } from "@/modules/suprimentos/ItensServicosTab";
import { AlcadasTab } from "@/modules/suprimentos/AlcadasTab";
import { Button } from "@/components/ui/button";
import { useTabFromHash } from "@/lib/route-tabs";
import {
  useDashboardKpis, useDashboardPorFornecedor, useDashboardPorNatureza,
  useDashboardPorCC, useAlertasSuprimentos, SEVERIDADE_TONE,
} from "@/lib/repositories/suprimentos-alcadas-repo";

export const Route = createFileRoute("/suprimentos")({
  head: () => ({
    meta: [
      { title: "Suprimentos — Meta Sun Gerencial" },
      { name: "description", content: "Hub Enterprise de Suprimentos: requisições, estoque, compras, recebimentos e entregas." },
    ],
  }),
  component: SuprimentosPage,
});

type HubCard = {
  to: string;
  hash?: string;
  icon: typeof Boxes;
  label: string;
  desc: string;
  status: "ativo" | "em-construcao";
};

const CARDS: HubCard[] = [
  { to: "/solicitacoes-material", icon: ClipboardList, label: "Requisições", desc: "Material e serviço — solicitação, rastreio e atendimento.", status: "ativo" },
  { to: "/estoque", icon: Package, label: "Estoque", desc: "Saldo, reservas, entregas e necessidade de compra.", status: "ativo" },
  { to: "/solicitacoes-material", icon: ShoppingCart, label: "Compras", desc: "Solicitações de compra, aprovações e ordens.", status: "ativo" },
  { to: "/suprimentos", hash: "#tab=cotacoes", icon: FileSearch, label: "Cotações", desc: "Comparativo de fornecedores e condições.", status: "em-construcao" },
  { to: "/suprimentos", hash: "#tab=pedidos", icon: FileText, label: "Pedidos de Compra", desc: "Ordens emitidas, status e recebimento.", status: "em-construcao" },
  { to: "/suprimentos", hash: "#tab=recebimentos", icon: PackageCheck, label: "Recebimentos", desc: "Conferência, entrada e vínculo com pedido.", status: "em-construcao" },
  { to: "/estoque", hash: "#tab=entregas", icon: Truck, label: "Entregas", desc: "Separação, entrega para O.S./obra e baixa.", status: "ativo" },
  { to: "/fornecedores", icon: Users2, label: "Fornecedores", desc: "Cadastro, vínculos e histórico de compras.", status: "ativo" },
  { to: "/suprimentos", hash: "#tab=relatorios", icon: BarChart3, label: "Relatórios", desc: "Rastreabilidade ponta-a-ponta e indicadores.", status: "em-construcao" },
];

function FluxoPedra() {
  const passos = [
    "Requisição", "Aprovação", "Estoque?",
    "Reserva / Separação / Entrega / Baixa",
    "Custo Realizado", "Orçado × Realizado",
  ];
  const compras = [
    "Solicitação de Compra", "Cotação", "Aprovação",
    "Pedido", "Recebimento", "Entrada Estoque",
  ];
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <Workflow className="h-4 w-4 text-primary" />
        <h2 className="text-[13px] font-semibold">Fluxo oficial Suprimentos</h2>
      </div>
      <div className="space-y-2 text-[12px]">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Caminho com saldo em estoque</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {passos.map((p, i) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded border border-border/70 bg-background tabular-nums">{p}</span>
                {i < passos.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Quando falta estoque</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {compras.map((p, i) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/30 tabular-nums">{p}</span>
                {i < compras.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HubGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const dest = c.hash ? `${c.to}${c.hash}` : c.to;
        return (
          <Link
            key={c.label + c.to + (c.hash ?? "")}
            to={c.to}
            hash={c.hash?.replace(/^#/, "")}
            className="group"
          >
            <Card className="h-full p-3 transition-colors hover:border-primary/60 hover:bg-muted/30">
              <div className="flex items-start gap-2.5">
                <div className="rounded border border-border/70 bg-background p-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[13px] font-semibold truncate">{c.label}</h3>
                    {c.status === "em-construcao" ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">D20.SUP.5+</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Ativo</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-foreground line-clamp-2">{c.desc}</p>
                  <div className="mt-2 text-[10.5px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Abrir {dest} →
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function Placeholder({ titulo, descricao, sub }: { titulo: string; descricao: string; sub: string }) {
  return (
    <Card className="p-6 text-center">
      <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50/60 dark:bg-amber-950/30 p-2.5">
        <Construction className="h-5 w-5 text-amber-700 dark:text-amber-300" />
      </div>
      <h2 className="text-[14px] font-semibold mb-1">{titulo}</h2>
      <p className="text-[12px] text-muted-foreground max-w-xl mx-auto">{descricao}</p>
      <p className="mt-2 text-[10.5px] uppercase tracking-wider text-amber-700 dark:text-amber-300">{sub}</p>
    </Card>
  );
}

function SuprimentosPage() {
  const [tab, setTab] = useTabFromHash("/suprimentos");

  return (
    <div className="p-2">
      <PageHeader
        eyebrow="D20.SUP.1 · Fundação"
        title="Suprimentos"
        subtitle="Camada única para Requisições, Estoque, Compras, Cotações, Recebimentos e Entregas — com rastreabilidade até a O.S."
        actions={
          <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[11.5px]">
            <Link to="/solicitacoes-material">
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              Nova requisição
            </Link>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-8 mb-2">
          <TabsTrigger value="dashboard" className="text-[11.5px]"><Layers className="h-3.5 w-3.5 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="requisicoes" className="text-[11.5px]"><ClipboardList className="h-3.5 w-3.5 mr-1" />Requisições</TabsTrigger>
          <TabsTrigger value="cotacoes" className="text-[11.5px]"><FileSearch className="h-3.5 w-3.5 mr-1" />Cotações</TabsTrigger>
          <TabsTrigger value="pedidos" className="text-[11.5px]"><FileText className="h-3.5 w-3.5 mr-1" />Pedidos</TabsTrigger>
          <TabsTrigger value="recebimentos" className="text-[11.5px]"><PackageCheck className="h-3.5 w-3.5 mr-1" />Recebimentos</TabsTrigger>
          <TabsTrigger value="cadastros" className="text-[11.5px]"><BookOpen className="h-3.5 w-3.5 mr-1" />Cadastros</TabsTrigger>
          <TabsTrigger value="relatorios" className="text-[11.5px]"><BarChart3 className="h-3.5 w-3.5 mr-1" />Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-3 mt-0">
          <FluxoPedra />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="h-4 w-4 text-primary" />
              <h2 className="text-[13px] font-semibold">Módulos do hub</h2>
            </div>
            <HubGrid />
          </div>
        </TabsContent>

        <TabsContent value="requisicoes" className="mt-0">
          <RequisicoesTab />
        </TabsContent>



        <TabsContent value="cotacoes" className="mt-0">
          <CotacoesTab />
        </TabsContent>
        <TabsContent value="pedidos" className="mt-0">
          <PedidosTab />
        </TabsContent>
        <TabsContent value="recebimentos" className="mt-0">
          <RecebimentosTab />
        </TabsContent>
        <TabsContent value="cadastros" className="mt-0">
          <ItensServicosTab />
        </TabsContent>
        <TabsContent value="relatorios" className="mt-0">
          <Placeholder
            titulo="Relatórios & Rastreabilidade"
            descricao="Requisição → Reserva/Compra → Pedido → Recebimento → Entrega → Custo realizado na O.S. — ponta a ponta."
            sub="Disponível em D20.SUP.7"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
