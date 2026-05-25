// Aba Fluxo de Caixa Real × Previsto — gráfico acumulado estilo banco.
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { TrendingUp, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/app/StatCard";
import { useFluxoCaixa } from "@/lib/fin-fluxo-caixa";
import { useContasFinanceiras } from "@/lib/fin-contas-store";
import { useOrcamentoObras } from "@/lib/fin-orcamento-obras";
import { fmtBRLPrecise } from "@/lib/financeiro-store";

function isoAddDays(base: Date, days: number) {
  const d = new Date(base); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FluxoCaixaRealTab() {
  const contas = useContasFinanceiras().filter((c) => c.ativo);
  const [dias, setDias] = useState<30 | 60 | 90 | 180>(60);
  const [contaNome, setContaNome] = useState<string>("__all");
  const [saldoInicial, setSaldoInicial] = useState<string>("0");

  const { ini, fim } = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return { ini: isoAddDays(hoje, -Math.floor(dias / 3)), fim: isoAddDays(hoje, dias) };
  }, [dias]);

  const data = useFluxoCaixa({
    dataInicio: ini,
    dataFim: fim,
    contaId: contaNome === "__all" ? undefined : contaNome,
    saldoInicial: Number(saldoInicial) || 0,
  });

  const orc = useOrcamentoObras();
  const ultimoReal = data[data.length - 1]?.caixaReal ?? 0;
  const ultimoPrev = data[data.length - 1]?.caixaPrevisto ?? 0;
  const totalEntradaPrev = data.reduce((s, d) => s + d.entradaPrevista, 0);
  const totalSaidaPrev = data.reduce((s, d) => s + d.saidaPrevista, 0);
  const pctConsumidoTotal = orc.totalOrcado > 0 ? Math.min(1, orc.totalConsumido / orc.totalOrcado) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Caixa real (acumulado)" value={fmtBRLPrecise(ultimoReal)} tone={ultimoReal >= 0 ? "success" : "destructive"} />
        <StatCard label="Caixa previsto (acumulado)" value={fmtBRLPrecise(ultimoPrev)} tone={ultimoPrev >= 0 ? "primary" : "destructive"} />
        <StatCard label="Entradas previstas" value={fmtBRLPrecise(totalEntradaPrev)} tone="success" />
        <StatCard label="Saídas previstas" value={fmtBRLPrecise(totalSaidaPrev)} tone="warning" />
        <StatCard
          label="Orçado restante (obras)"
          value={fmtBRLPrecise(orc.totalRestante)}
          tone={orc.totalRestante > 0 ? "primary" : "destructive"}
          hint={`Orçado ${fmtBRLPrecise(orc.totalOrcado)} · Consumido ${fmtBRLPrecise(orc.totalConsumido)}`}
        />
      </div>

      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Fluxo de caixa — Real × Previsto</div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Horizonte</Label>
              <Select value={String(dias)} onValueChange={(v) => setDias(Number(v) as any)}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Próximos 30 dias</SelectItem>
                  <SelectItem value="60">Próximos 60 dias</SelectItem>
                  <SelectItem value="90">Próximos 90 dias</SelectItem>
                  <SelectItem value="180">Próximos 180 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Conta</Label>
              <Select value={contaNome} onValueChange={setContaNome}>
                <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas as contas</SelectItem>
                  {contas.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Saldo inicial (R$)</Label>
              <Input type="number" step="0.01" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} className="h-9 w-32" />
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="diaLabel" stroke="var(--muted-foreground)" fontSize={11} interval="preserveStartEnd" minTickGap={32} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => fmtBRLPrecise(v)}
              labelFormatter={(l) => `Data: ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
            <Area
              type="monotone" dataKey="caixaPrevisto" name="Caixa previsto"
              stroke="oklch(0.7 0.12 240)" fill="oklch(0.7 0.12 240 / 0.18)" strokeWidth={2} dot={false}
            />
            <Line
              type="monotone" dataKey="caixaReal" name="Caixa real"
              stroke="oklch(0.55 0.2 250)" strokeWidth={2.5} dot={{ r: 2.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Caixa real = baixas efetivamente registradas. Caixa previsto = real + saldos em aberto projetados pelo vencimento (AR soma, AP subtrai).
        </div>
      </Card>
    </div>
  );
}
