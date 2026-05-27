import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, Activity } from "lucide-react";
import { useSaudeDados, type SaudeDadosRow } from "@/lib/repositories/use-kpis-oficiais";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/paineis/saude-dados")({
  head: () => ({ meta: [{ title: "Saúde dos Dados — Meta Sun Gerencial" }] }),
  component: SaudeDados,
});

const fmtNum = (v: number | null | undefined, frac = 2) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: frac }).format(Number(v));

const fmtPct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${fmtNum(v, 2)}%`;

const MODULOS = [
  "todos", "financeiro", "comercial", "engenharia", "estoque", "aprovacoes", "pv",
] as const;

function statusBadge(s: string) {
  const v = String(s ?? "").toLowerCase();
  if (v === "ok") return <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>;
  if (v === "critico" || v === "crítico")
    return <Badge variant="destructive">Crítico</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Atenção</Badge>;
}

function SaudeDados() {
  const { data, isLoading, isError, error } = useSaudeDados();
  const qc = useQueryClient();
  const [modulo, setModulo] = useState<(typeof MODULOS)[number]>("todos");
  const [busca, setBusca] = useState("");

  const rows: SaudeDadosRow[] = data ?? [];

  const lista = useMemo(() => {
    return rows.filter((r) => {
      if (modulo !== "todos" && r.modulo !== modulo) return false;
      if (busca && !r.indicador.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [rows, modulo, busca]);

  const totais = useMemo(() => {
    const acc = { total: 0, ok: 0, atencao: 0, critico: 0 };
    for (const r of rows) {
      acc.total += 1;
      const s = String(r.status ?? "").toLowerCase();
      if (s === "ok") acc.ok += 1;
      else if (s === "critico" || s === "crítico") acc.critico += 1;
      else acc.atencao += 1;
    }
    return acc;
  }, [rows]);

  return (
    <div className="space-y-3">
      {/* Strip de status enterprise — denso, sem card SaaS */}
      <div className="flex flex-wrap items-center gap-3 border-b pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Saúde dos Dados
        </div>
        <span className="text-xs text-muted-foreground">
          Reconciliação oficial · valor_base (verdade) vs valor_dashboard (UI)
        </span>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            OK <b>{totais.ok}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-amber-500" />
            Atenção <b>{totais.atencao}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Crítico <b>{totais.critico}</b>
          </span>
          <span className="text-muted-foreground">Total <b>{totais.total}</b></span>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => qc.invalidateQueries({ queryKey: ["saude-dados"] })}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={modulo} onValueChange={(v) => setModulo(v as any)}>
          <TabsList className="h-8">
            {MODULOS.map((m) => (
              <TabsTrigger key={m} value={m} className="h-7 px-2 text-xs capitalize">
                {m}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Buscar indicador…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 max-w-xs"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {lista.length} de {rows.length} indicadores
        </span>
      </div>

      {/* Grade densa */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="h-8 w-[120px] text-xs">Módulo</TableHead>
              <TableHead className="h-8 text-xs">Indicador</TableHead>
              <TableHead className="h-8 w-[110px] text-xs">Status</TableHead>
              <TableHead className="h-8 w-[140px] text-right text-xs">Valor oficial</TableHead>
              <TableHead className="h-8 w-[140px] text-right text-xs">Valor dashboard</TableHead>
              <TableHead className="h-8 w-[120px] text-right text-xs">Divergência</TableHead>
              <TableHead className="h-8 w-[100px] text-right text-xs">% Diverg.</TableHead>
              <TableHead className="h-8 text-xs">Origem provável</TableHead>
              <TableHead className="h-8 text-xs">Sugestão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="h-16 text-center text-xs text-muted-foreground">
                  Carregando reconciliação oficial…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={9} className="h-16 text-center text-xs text-destructive">
                  Erro ao ler v_saude_dados: {(error as Error)?.message ?? "desconhecido"}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-16 text-center text-xs text-muted-foreground">
                  Nenhum indicador encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
            {lista.map((r, i) => (
              <TableRow key={`${r.modulo}-${r.indicador}-${i}`} className="text-xs">
                <TableCell className="capitalize font-medium">{r.modulo}</TableCell>
                <TableCell>{r.indicador}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(r.valor_base)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(r.valor_dashboard)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(r.diferenca)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.perc_divergencia)}</TableCell>
                <TableCell className="text-muted-foreground">{r.origem_provavel ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.sugestao ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        D14.1 · Enterprise Data Truth — view oficial <code>v_saude_dados</code>. Valores divergentes apontam
        para hooks/components com cálculo paralelo: substituir por leitura das views <code>v_kpis_*_oficial</code>.
      </p>
    </div>
  );
}
