import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  modulo: string;
  indicador: string;
  valor_dashboard: number;
  valor_base: number;
  diferenca: number;
  perc_divergencia: number;
  status: "OK" | "DIVERGENTE" | "CRITICO";
  origem_provavel: string | null;
  sugestao: string | null;
};

const MODULOS = [
  "financeiro",
  "estoque",
  "pv",
  "aprovacoes",
  "engenharia",
  "comercial",
] as const;

function StatusIcon({ s }: { s: Row["status"] }) {
  if (s === "OK") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "DIVERGENTE") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <AlertOctagon className="h-4 w-4 text-destructive" />;
}

export function ReconciliacaoCard() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["reconciliacao-resumo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_reconciliacao_resumo" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
  });

  const rows = data ?? [];
  const ok = rows.filter((r) => r.status === "OK").length;
  const div = rows.filter((r) => r.status === "DIVERGENTE").length;
  const crit = rows.filter((r) => r.status === "CRITICO").length;

  const porModulo = MODULOS.map((m) => {
    const list = rows.filter((r) => r.modulo === m);
    const critC = list.filter((r) => r.status === "CRITICO").length;
    const divC = list.filter((r) => r.status === "DIVERGENTE").length;
    const status: Row["status"] =
      critC > 0 ? "CRITICO" : divC > 0 ? "DIVERGENTE" : "OK";
    return { modulo: m, total: list.length, status };
  });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Reconciliação com Base Oficial
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compara valores dos dashboards com cálculo direto da base.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Ver detalhe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Reconciliação detalhada</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead className="text-right">Dashboard</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sugestão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={`${r.modulo}-${r.indicador}`}>
                      <TableCell className="font-medium">{r.modulo}</TableCell>
                      <TableCell>{r.indicador}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.valor_dashboard).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.valor_base).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.diferenca).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.perc_divergencia).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon s={r.status} />
                          <span className="text-xs">{r.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                        {r.status === "OK" ? "—" : r.sugestao}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {porModulo.map((m) => (
          <div
            key={m.modulo}
            className="rounded-md border p-2 flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] uppercase text-muted-foreground tracking-wide">
                {m.modulo}
              </div>
              <div className="text-sm font-medium">{m.total} indic.</div>
            </div>
            <StatusIcon s={m.status} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> OK: {ok}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-500" /> Divergente: {div}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <AlertOctagon className="h-3 w-3 text-destructive" /> Crítico: {crit}
        </Badge>
        {isLoading && (
          <span className="text-muted-foreground">Carregando…</span>
        )}
        <span className="ml-auto text-muted-foreground">
          Última verificação: {new Date().toLocaleTimeString("pt-BR")}
        </span>
      </div>
    </Card>
  );
}
