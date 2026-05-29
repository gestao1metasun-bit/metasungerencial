/**
 * D15.3.d — CmvTab Supabase
 * Custo de mercadoria/serviço consolidado pela view v_cmv_oficial.
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/app/StatCard";
import { TrendingDown, Package } from "lucide-react";
import { useCmvOficial } from "@/lib/repositories/cmv-repo";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CmvTabSupabase() {
  const hoje = new Date();
  const fim = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const ini = `${hoje.getFullYear() - 1}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const [from, setFrom] = useState(ini);
  const [to, setTo] = useState(fim);

  const { data: linhas = [], isLoading } = useCmvOficial({ from, to });

  const totais = useMemo(() => {
    let tot = 0, real = 0, prev = 0;
    for (const l of linhas) {
      tot += Number(l.custo_total);
      real += Number(l.custo_realizado);
      prev += Number(l.custo_previsto);
    }
    return { tot, real, prev };
  }, [linhas]);

  // Group by competencia
  const porComp = useMemo(() => {
    const m = new Map<string, { qtde: number; total: number; real: number; prev: number }>();
    for (const l of linhas) {
      const cur = m.get(l.competencia) ?? { qtde: 0, total: 0, real: 0, prev: 0 };
      cur.qtde += Number(l.qtde_titulos);
      cur.total += Number(l.custo_total);
      cur.real += Number(l.custo_realizado);
      cur.prev += Number(l.custo_previsto);
      m.set(l.competencia, cur);
    }
    return [...m.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [linhas]);

  const qc = useQueryClient();
  return (
    <div className="space-y-4">
      <RmTabHeader
        onAtualizar={() => qc.invalidateQueries({ queryKey: ["cmv-oficial"] })}
        searchPlaceholder="Buscar competência…"
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Custo total (AP)" value={fmtBRL(totais.tot)} icon={TrendingDown} tone="destructive" />
        <StatCard label="Custo realizado" value={fmtBRL(totais.real)} icon={Package} tone="success" />
        <StatCard label="Custo previsto" value={fmtBRL(totais.prev)} icon={Package} tone="warning" />
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <Label>De (competência)</Label>
            <Input type="month" value={from.slice(0, 7)} onChange={(e) => setFrom(`${e.target.value}-01`)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="month" value={to.slice(0, 7)} onChange={(e) => setTo(`${e.target.value}-01`)} />
          </div>
          <div className="text-xs text-muted-foreground self-center">
            {isLoading ? "Carregando…" : `${porComp.length} mês(es) — fonte: v_cmv_oficial`}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead className="text-right">Títulos AP</TableHead>
              <TableHead className="text-right">Custo total</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Previsto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {porComp.map(([comp, v]) => {
              const [y, m] = comp.split("-");
              return (
                <TableRow key={comp}>
                  <TableCell>{m}/{y}</TableCell>
                  <TableCell className="text-right font-mono">{v.qtde}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(v.total)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700">{fmtBRL(v.real)}</TableCell>
                  <TableCell className="text-right font-mono text-amber-700">{fmtBRL(v.prev)}</TableCell>
                </TableRow>
              );
            })}
            {porComp.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem dados no período.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
