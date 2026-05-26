/**
 * Onda D4.5 — Dashboard de KPIs reais.
 *
 * Substitui mock como fonte primária. Quando dados reais estão disponíveis,
 * exibe badge "Dados reais". Quando não (sem sessão, erro de RLS, etc.),
 * exibe badge "Modo mock — fallback DEV ONLY" e oculta o painel real.
 *
 * Regra: nunca há merge silencioso entre real e mock.
 */
import {
  Banknote, Clock, AlertCircle, TrendingUp, HardHat, Layers,
  Package, ShoppingCart, CheckCircle2, FileCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useKpisReais } from "@/lib/repositories/use-kpis-reais";
import { fmtBRL } from "@/lib/mock-data";

function Kpi({
  label, value, hint, icon: Icon, tone = "primary",
}: {
  label: string; value: string | number; hint?: string;
  icon: any; tone?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneClass: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="mt-1 text-xl font-bold tabular-nums truncate">{value}</div>
          {hint && <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{hint}</div>}
        </div>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${toneClass[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function Section({
  title, subtitle, children,
}: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {children}
      </div>
    </div>
  );
}

export function DashboardReaisOverview() {
  const { financeiro, engenharia, estoque, comercial, loading, disponivel } = useKpisReais(true);

  if (loading && !disponivel) {
    return (
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Indicadores operacionais</div>
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Card>
    );
  }

  if (!disponivel) {
    return (
      <Card className="p-4 border-warning/40 bg-warning/5">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              Modo mock — fallback DEV ONLY
            </div>
            <div className="text-xs text-muted-foreground">
              Dados reais indisponíveis (sem sessão ou erro de leitura). Os gráficos abaixo
              são demonstração visual e não refletem o estado real do ERP.
            </div>
          </div>
          <Badge variant="outline" className="ml-auto border-warning text-warning">MOCK</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-success/30 bg-success/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Indicadores operacionais — Dados reais
          </div>
          <div className="text-xs text-muted-foreground">
            Consolidado direto das tabelas transacionais (D1–D4.4). Atualização automática a cada 60s.
          </div>
        </div>
        <Badge variant="outline" className="border-success text-success">DADOS REAIS</Badge>
      </div>

      {financeiro && (
        <Section title="Financeiro" subtitle="títulos + movimentações reais">
          <Kpi label="Títulos pendentes" value={financeiro.pendentes}
            hint={fmtBRL(financeiro.valorPendente)} icon={Clock} tone="warning" />
          <Kpi label="Recebidos" value={financeiro.recebidos}
            hint={fmtBRL(financeiro.valorRecebido)} icon={CheckCircle2} tone="success" />
          <Kpi label="Atrasados" value={financeiro.atrasados}
            hint={fmtBRL(financeiro.valorAtrasado)} icon={AlertCircle} tone="destructive" />
          <Kpi label="Fluxo previsto" value={fmtBRL(financeiro.fluxoPrevisto)}
            icon={TrendingUp} tone="info" />
          <Kpi label="Fluxo realizado" value={fmtBRL(financeiro.fluxoRealizado)}
            icon={Banknote} tone="primary" />
          <Kpi label="Saldo operacional"
            value={fmtBRL(financeiro.saldoOperacional)}
            tone={financeiro.saldoOperacional >= 0 ? "success" : "destructive"}
            icon={Banknote} />
        </Section>
      )}

      {engenharia && (
        <Section title="Engenharia" subtitle="obras + custos reais (v_saldo_operacional_obra)">
          <Kpi label="Obras totais" value={engenharia.totalObras} icon={HardHat} tone="primary" />
          <Kpi label="Em andamento" value={engenharia.obrasAtivas} icon={HardHat} tone="info" />
          <Kpi label="Finalizadas" value={engenharia.obrasFinalizadas}
            icon={CheckCircle2} tone="success" />
          <Kpi label="Custo previsto" value={fmtBRL(engenharia.custoPrevisto)}
            icon={Banknote} tone="info" />
          <Kpi label="Custo realizado" value={fmtBRL(engenharia.custoRealizado)}
            icon={Banknote} tone="warning" />
          <Kpi label="% consumido" value={`${engenharia.consumoPct}%`}
            tone={engenharia.consumoPct > 100 ? "destructive" :
                  engenharia.consumoPct > 80 ? "warning" : "success"}
            icon={TrendingUp} />
        </Section>
      )}

      {estoque && (
        <Section title="Estoque" subtitle="movimentos + reservas + entregas reais">
          <Kpi label="Saldo físico" value={estoque.saldoFisico.toLocaleString("pt-BR")}
            hint="entradas − saídas" icon={Layers} tone="primary" />
          <Kpi label="Reservado" value={estoque.reservado.toLocaleString("pt-BR")}
            icon={Package} tone="warning" />
          <Kpi label="Disponível" value={estoque.disponivel.toLocaleString("pt-BR")}
            icon={CheckCircle2} tone="success" />
          <Kpi label="Entregas pendentes" value={estoque.entregasPendentes}
            icon={Clock} tone="info" />
          <Kpi label="Custo estoque" value={fmtBRL(estoque.custoEstoque)}
            icon={Banknote} tone="info" />
        </Section>
      )}

      {comercial && (
        <Section title="Comercial / PV" subtitle="pedidos de venda + contratos reais">
          <Kpi label="PVs totais" value={comercial.totalPv} icon={ShoppingCart} tone="primary" />
          <Kpi label="Aprovados" value={comercial.pvAprovados} icon={CheckCircle2} tone="success" />
          <Kpi label="Em execução" value={comercial.pvExecucao} icon={HardHat} tone="info" />
          <Kpi label="Rascunho" value={comercial.pvRascunho} icon={Clock} tone="warning" />
          <Kpi label="Ticket médio" value={fmtBRL(comercial.ticketMedio)}
            icon={TrendingUp} tone="primary" hint="média dos aprovados" />
          <Kpi label="Contratos" value={comercial.totalContratos}
            icon={FileCheck} tone="info" />
        </Section>
      )}
    </Card>
  );
}
