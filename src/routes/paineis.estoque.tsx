import { createFileRoute } from "@tanstack/react-router";
import { useEstoquePendencias } from "@/lib/repositories/use-estoque-pendencias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package, Truck, Clock, ShoppingCart, Archive, HardHat, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/paineis/estoque")({
  head: () => ({ meta: [{ title: "Painel Estoque — Meta Sun Gerencial" }] }),
  component: PainelEstoque,
});

function fmtBRL(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}
function fmtNum(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(v ?? 0));
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "warn" | "danger";
}

function KpiCard({ icon: Icon, label, value, hint, tone = "default" }: KpiCardProps) {
  const color = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md bg-muted ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PainelEstoque() {
  const p = useEstoquePendencias();
  const r = p.resumo;

  const total = r
    ? r.estoque_baixo + r.reservas_atrasadas + r.entregas_pendentes + r.oc_atrasada + r.material_parado + r.obra_sem_reserva
    : 0;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="h-6 w-6" /> Painel Estoque — Pendências Operacionais
          </h1>
          <p className="text-sm text-muted-foreground">
            D10.6 — Rotinas diárias de almoxarifado. Atualização automática a cada 60s.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => p.reload()} disabled={p.loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${p.loading ? "animate-spin" : ""}`} /> Recarregar
        </Button>
      </div>

      {p.error && (
        <Card className="border-destructive">
          <CardContent className="p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Erro ao carregar pendências: {p.error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard icon={AlertTriangle} label="Total pendências" value={total} tone={total > 0 ? "warn" : "default"} />
        <KpiCard icon={Archive} label="Estoque baixo" value={r?.estoque_baixo ?? 0} tone={(r?.estoque_baixo ?? 0) > 0 ? "danger" : "default"} hint="< mínimo" />
        <KpiCard icon={Clock} label="Reservas atrasadas" value={r?.reservas_atrasadas ?? 0} tone="warn" hint="> 7 dias" />
        <KpiCard icon={Truck} label="Entregas pendentes" value={r?.entregas_pendentes ?? 0} tone="warn" hint="> 3 dias" />
        <KpiCard icon={ShoppingCart} label="OC atrasada" value={r?.oc_atrasada ?? 0} tone="danger" hint="prazo vencido" />
        <KpiCard icon={Package} label="Material parado" value={r?.material_parado ?? 0} hint={fmtBRL(r?.valor_parado_total)} />
        <KpiCard icon={HardHat} label="Obra sem reserva" value={r?.obra_sem_reserva ?? 0} tone="warn" />
      </div>

      <Tabs defaultValue="estoque_baixo" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="estoque_baixo">Estoque baixo ({p.estoqueBaixo.length})</TabsTrigger>
          <TabsTrigger value="reservas">Reservas ({p.reservasAtrasadas.length})</TabsTrigger>
          <TabsTrigger value="entregas">Entregas ({p.entregasPendentes.length})</TabsTrigger>
          <TabsTrigger value="oc">OC atrasada ({p.ocAtrasada.length})</TabsTrigger>
          <TabsTrigger value="parado">Material parado ({p.materialParado.length})</TabsTrigger>
          <TabsTrigger value="obras">Obras s/ reserva ({p.obraSemReserva.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="estoque_baixo">
          <Card>
            <CardHeader><CardTitle className="text-base">Produtos abaixo do estoque mínimo</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código</TableHead><TableHead>Produto</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Físico</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead className="text-right">Déficit</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {p.estoqueBaixo.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhuma pendência</TableCell></TableRow>
                  ) : p.estoqueBaixo.map((row) => (
                    <TableRow key={row.produto_id}>
                      <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                      <TableCell>{row.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.estoque_minimo)} {row.unidade}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.saldo_fisico)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.saldo_reservado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.saldo_disponivel)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive font-medium">{fmtNum(row.deficit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservas">
          <Card>
            <CardHeader><CardTitle className="text-base">Reservas abertas há mais de 7 dias</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produto</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {p.reservasAtrasadas.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhuma pendência</TableCell></TableRow>
                  ) : p.reservasAtrasadas.map((row) => (
                    <TableRow key={row.reserva_id}>
                      <TableCell><span className="font-mono text-xs mr-2">{row.produto_codigo}</span>{row.produto_nome}</TableCell>
                      <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.quantidade_pendente)}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">{row.dias_aberta}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregas">
          <Card>
            <CardHeader><CardTitle className="text-base">Entregas pendentes há mais de 3 dias</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {p.entregasPendentes.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhuma pendência</TableCell></TableRow>
                  ) : p.entregasPendentes.map((row) => (
                    <TableRow key={row.entrega_id}>
                      <TableCell><span className="font-mono text-xs mr-2">{row.produto_codigo}</span>{row.produto_nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.quantidade)}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">{row.dias_pendente}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oc">
          <Card>
            <CardHeader><CardTitle className="text-base">Ordens de compra com prazo de entrega vencido</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>OC</TableHead><TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Prevista</TableHead>
                  <TableHead className="text-right">Dias atraso</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {p.ocAtrasada.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma pendência</TableCell></TableRow>
                  ) : p.ocAtrasada.map((row) => (
                    <TableRow key={row.ordem_id}>
                      <TableCell className="font-mono text-xs">{row.codigo ?? row.ordem_id.slice(0, 8)}</TableCell>
                      <TableCell>{row.fornecedor_nome ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(row.valor_total)}</TableCell>
                      <TableCell>{row.data_prevista}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive font-medium">{row.dias_atraso}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parado">
          <Card>
            <CardHeader><CardTitle className="text-base">Material sem movimento há 90+ dias</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código</TableHead><TableHead>Produto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Valor parado</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {p.materialParado.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma pendência</TableCell></TableRow>
                  ) : p.materialParado.map((row) => (
                    <TableRow key={row.produto_id}>
                      <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                      <TableCell>{row.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.saldo_fisico)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(row.valor_parado)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{row.dias_parado}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="obras">
          <Card>
            <CardHeader><CardTitle className="text-base">Obras ativas sem reserva de material</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código</TableHead><TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Dias desde criação</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {p.obraSemReserva.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhuma pendência</TableCell></TableRow>
                  ) : p.obraSemReserva.map((row) => (
                    <TableRow key={row.obra_id}>
                      <TableCell className="font-mono text-xs">{row.codigo ?? row.obra_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                      <TableCell>{row.data_inicio ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">{row.dias_desde_criacao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
