import { createFileRoute } from "@tanstack/react-router";
import { useEngMetricas } from "@/lib/repositories/use-eng-metricas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  HardHat,
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  RefreshCw,
  Activity,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/paineis/engenharia")({
  head: () => ({ meta: [{ title: "Painel Engenharia — Meta Sun Gerencial" }] }),
  component: PainelEngenharia,
});

function fmtBRL(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}
function fmtNum(v: number | null | undefined, frac = 2) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: frac }).format(Number(v));
}
function fmtInt(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(v ?? 0));
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "success";
}

function KpiCard({ icon: Icon, label, value, hint, tone = "default" }: KpiCardProps) {
  const color =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";
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

function sevBadge(s: string) {
  if (s === "CRITICA") return <Badge variant="destructive">Crítica</Badge>;
  if (s === "ALTA") return <Badge className="bg-amber-600 hover:bg-amber-600">Alta</Badge>;
  return <Badge variant="secondary">Média</Badge>;
}

function faixaBadge(f: string) {
  switch (f) {
    case "ESTOURO_CRITICO":
      return <Badge variant="destructive">Estouro crítico</Badge>;
    case "ESTOURO":
      return <Badge className="bg-amber-600 hover:bg-amber-600">Estouro</Badge>;
    case "NO_ALVO":
      return <Badge variant="secondary">No alvo</Badge>;
    case "ABAIXO":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Abaixo</Badge>;
    default:
      return <Badge variant="outline">Sem orçamento</Badge>;
  }
}

function PainelEngenharia() {
  const p = useEngMetricas();
  const r = p.resumo;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <HardHat className="h-6 w-6" /> Painel de Engenharia
          </h1>
          <p className="text-sm text-muted-foreground">
            Métricas operacionais reais — produtividade, atrasos, custo e backlog por equipe (D11.5).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => p.reload()} disabled={p.loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${p.loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {p.error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {p.error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard icon={Layers} label="Total obras" value={fmtInt(r?.total_obras)} />
        <KpiCard icon={Activity} label="Ativas" value={fmtInt(r?.obras_ativas)} />
        <KpiCard icon={CheckCircle2} label="Finalizadas" value={fmtInt(r?.obras_finalizadas)} tone="success" />
        <KpiCard
          icon={AlertTriangle}
          label="Atrasadas"
          value={fmtInt(r?.obras_atrasadas)}
          tone={r && r.obras_atrasadas > 0 ? "danger" : "default"}
        />
        <KpiCard
          icon={TrendingDown}
          label="Estouro crítico"
          value={fmtInt(r?.obras_estouro_critico)}
          tone={r && r.obras_estouro_critico > 0 ? "danger" : "default"}
        />
        <KpiCard icon={TrendingUp} label="Módulos instalados" value={fmtInt(r?.modulos_instalados_total)} />
        <KpiCard icon={Zap} label="kWp instalado" value={fmtNum(r?.kwp_instalado_total, 1)} hint="acumulado" />
        <KpiCard
          icon={Clock}
          label="Tempo médio"
          value={r?.tempo_medio_obra_geral != null ? `${fmtNum(r.tempo_medio_obra_geral, 1)} d` : "—"}
          hint="média geral"
        />
      </div>

      <Tabs defaultValue="produtividade">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="produtividade">
            Produtividade ({p.produtividade.length})
          </TabsTrigger>
          <TabsTrigger value="atrasadas">
            Atrasadas ({p.obrasAtrasadas.length})
          </TabsTrigger>
          <TabsTrigger value="desvio">
            Desvio custo ({p.desvioCusto.length})
          </TabsTrigger>
          <TabsTrigger value="backlog">
            Backlog ({p.backlog.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            Histórico ({p.tempoFaixa.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtividade">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Users className="h-3 w-3 inline mr-1" />Equipe</TableHead>
                    <TableHead className="text-right">Obras</TableHead>
                    <TableHead className="text-right">Finalizadas</TableHead>
                    <TableHead className="text-right">Em andamento</TableHead>
                    <TableHead className="text-right">Módulos inst.</TableHead>
                    <TableHead className="text-right">kWp</TableHead>
                    <TableHead className="text-right">Tempo médio</TableHead>
                    <TableHead className="text-right">Mód./dia</TableHead>
                    <TableHead className="text-right">Atrasadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.produtividade.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                        Sem dados.
                      </TableCell>
                    </TableRow>
                  )}
                  {p.produtividade.map((row) => (
                    <TableRow key={row.equipe}>
                      <TableCell className="font-medium">{row.equipe}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(row.total_obras)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(row.obras_finalizadas)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(row.obras_em_andamento)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(row.modulos_instalados)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.kwp_instalado, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.tempo_medio_obra_dias != null ? `${fmtNum(row.tempo_medio_obra_dias, 1)} d` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(row.modulos_por_dia_medio, 2)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.obras_atrasadas > 0 ? (
                          <span className="text-destructive font-semibold">{fmtInt(row.obras_atrasadas)}</span>
                        ) : (
                          fmtInt(row.obras_atrasadas)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atrasadas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Módulos</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead className="text-right">Dias aberta</TableHead>
                    <TableHead>Severidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.obrasAtrasadas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                        Nenhuma obra atrasada — bom trabalho.
                      </TableCell>
                    </TableRow>
                  )}
                  {p.obrasAtrasadas.map((o) => (
                    <TableRow key={o.obra_id}>
                      <TableCell className="font-mono text-xs">{o.codigo ?? "—"}</TableCell>
                      <TableCell>{o.equipe ?? "—"}</TableCell>
                      <TableCell>{o.status}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(o.modulos_qtde ?? 0)}</TableCell>
                      <TableCell>{o.data_inicio ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{fmtInt(o.dias_em_aberto)}</TableCell>
                      <TableCell>{sevBadge(o.severidade)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desvio">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Previsto</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">Desvio</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Faixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.desvioCusto.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                        Sem dados de custo realizado.
                      </TableCell>
                    </TableRow>
                  )}
                  {p.desvioCusto.map((o) => (
                    <TableRow key={o.obra_id}>
                      <TableCell className="font-mono text-xs">{o.codigo ?? "—"}</TableCell>
                      <TableCell>{o.equipe ?? "—"}</TableCell>
                      <TableCell>{o.status}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(o.custo_previsto)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(o.custo_realizado)}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          o.desvio_custo < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {fmtBRL(o.desvio_custo)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {o.desvio_pct != null ? `${fmtNum(o.desvio_pct, 1)}%` : "—"}
                      </TableCell>
                      <TableCell>{faixaBadge(o.faixa)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backlog">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Users className="h-3 w-3 inline mr-1" />Equipe</TableHead>
                    <TableHead className="text-right">Planejadas</TableHead>
                    <TableHead className="text-right">Em andamento</TableHead>
                    <TableHead className="text-right">Módulos pend.</TableHead>
                    <TableHead className="text-right">kWp pend.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.backlog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                        Backlog vazio.
                      </TableCell>
                    </TableRow>
                  )}
                  {p.backlog.map((b) => (
                    <TableRow key={b.equipe}>
                      <TableCell className="font-medium">{b.equipe}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(b.planejadas)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(b.em_andamento)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(b.modulos_pendentes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(b.kwp_pendente, 1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="p-0">
              <div className="p-3 text-xs text-muted-foreground border-b">
                Base do futuro motor de previsão (D11.8) — tempo médio histórico por faixa de módulos.
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faixa módulos</TableHead>
                    <TableHead className="text-right">Obras finalizadas</TableHead>
                    <TableHead className="text-right">Tempo médio</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Máximo</TableHead>
                    <TableHead className="text-right">Mód./dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.tempoFaixa.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                        Ainda sem obras finalizadas suficientes.
                      </TableCell>
                    </TableRow>
                  )}
                  {p.tempoFaixa.map((t) => (
                    <TableRow key={t.faixa_modulos}>
                      <TableCell className="font-mono">{t.faixa_modulos}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(t.obras)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.tempo_medio_dias != null ? `${fmtNum(t.tempo_medio_dias, 1)} d` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.tempo_min_dias != null ? `${fmtNum(t.tempo_min_dias, 1)} d` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.tempo_max_dias != null ? `${fmtNum(t.tempo_max_dias, 1)} d` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(t.modulos_dia_medio, 2)}</TableCell>
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
