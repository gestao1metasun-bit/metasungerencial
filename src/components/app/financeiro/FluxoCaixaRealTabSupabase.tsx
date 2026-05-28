/**
 * D15.3.d — FluxoCaixaRealTab Supabase
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/app/StatCard";
import { TrendingUp, Wallet } from "lucide-react";
import { useFluxoCaixaOficial } from "@/lib/repositories/fluxo-caixa-repo";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FluxoCaixaRealTabSupabase() {
  const hoje = new Date();
  const fim = hoje.toISOString().slice(0, 10);
  const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(ini);
  const [to, setTo] = useState(fim);

  const { data: linhas = [], isLoading } = useFluxoCaixaOficial({ from, to });

  const agregado = useMemo(() => {
    const porData = new Map<string, { entrada: number; saida: number }>();
    let totalEnt = 0, totalSai = 0;
    for (const l of linhas) {
      const cur = porData.get(l.data) ?? { entrada: 0, saida: 0 };
      const isEntrada = l.tipo_lancamento === "ENTRADA" || l.tipo_lancamento === "AR";
      if (isEntrada) { cur.entrada += Number(l.total); totalEnt += Number(l.total); }
      else { cur.saida += Number(l.total); totalSai += Number(l.total); }
      porData.set(l.data, cur);
    }
    const linhasOrd = [...porData.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([data, v]) => ({ data, ...v, saldo: v.entrada - v.saida }));
    return { linhas: linhasOrd, totalEnt, totalSai };
  }, [linhas]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Entradas" value={fmtBRL(agregado.totalEnt)} icon={TrendingUp} tone="emerald" />
        <StatCard label="Saídas" value={fmtBRL(agregado.totalSai)} icon={Wallet} tone="red" />
        <StatCard label="Saldo líquido" value={fmtBRL(agregado.totalEnt - agregado.totalSai)} icon={Wallet} tone="indigo" />
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <Label>De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="text-xs text-muted-foreground self-center">
            {isLoading ? "Carregando…" : `${agregado.linhas.length} dia(s) — fonte: v_fluxo_caixa_oficial`}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Saldo do dia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agregado.linhas.map((l) => (
              <TableRow key={l.data}>
                <TableCell>{new Date(l.data).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-right text-emerald-600 font-mono">{fmtBRL(l.entrada)}</TableCell>
                <TableCell className="text-right text-red-600 font-mono">{fmtBRL(l.saida)}</TableCell>
                <TableCell className={`text-right font-mono ${l.saldo >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtBRL(l.saldo)}</TableCell>
              </TableRow>
            ))}
            {agregado.linhas.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem movimentação no período.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
