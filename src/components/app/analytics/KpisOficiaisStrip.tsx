/**
 * D14.4 — Tira oficial de KPIs (Verdade Oficial).
 *
 * Renderiza, no topo de cada painel, os KPIs lidos da view oficial
 * `v_kpis_<area>_oficial` via useKpisOficiais. Mostra status (OK / Atencao
 * / Critico) e divergência vs valor_dashboard — sem cálculo paralelo no JS.
 *
 * Regra: se existir view oficial, não calcular KPI manualmente.
 */
import { useKpisOficiais, type KpiArea, type KpiOficialRow } from "@/lib/repositories/use-kpis-oficiais";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function StatusDot({ s }: { s: string }) {
  if (s === "Critico") return <AlertCircle className="h-3 w-3 text-destructive" />;
  if (s === "Atencao") return <AlertTriangle className="h-3 w-3 text-amber-500" />;
  return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
}

function fmt(v: number) {
  if (Math.abs(v) >= 1000) return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function KpiCell({ r }: { r: KpiOficialRow }) {
  const div = r.perc_divergencia ?? 0;
  const hasDiv = div !== null && Math.abs(div) > 0.01;
  return (
    <div className="flex flex-col gap-0.5 rounded border border-border/60 bg-card px-2 py-1.5 min-w-[140px]">
      <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground truncate">
        <StatusDot s={r.status} />
        <span className="truncate" title={r.indicador}>{r.indicador}</span>
      </div>
      <div className="text-sm font-semibold tabular-nums">{fmt(r.valor)}</div>
      {hasDiv && (
        <div
          className={cn(
            "text-[10px] tabular-nums",
            r.status === "Critico" ? "text-destructive" :
            r.status === "Atencao" ? "text-amber-600" : "text-muted-foreground",
          )}
          title={r.sugestao ?? ""}
        >
          Δ {div.toFixed(1)}% vs dashboard
        </div>
      )}
    </div>
  );
}

export function KpisOficiaisStrip({ area }: { area: KpiArea }) {
  const { data, isLoading, isError, error } = useKpisOficiais(area);

  if (isLoading) {
    return (
      <Card className="p-2.5">
        <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Verdade oficial · carregando…
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-36" />)}
        </div>
      </Card>
    );
  }
  if (isError) {
    return (
      <Card className="p-2.5 border-destructive/40 bg-destructive/5">
        <div className="text-[11px] text-destructive">
          Falha ao ler verdade oficial ({area}): {(error as Error)?.message}
        </div>
      </Card>
    );
  }
  const rows = data ?? [];
  if (!rows.length) return null;

  const criticos = rows.filter(r => r.status === "Critico").length;
  const atencao = rows.filter(r => r.status === "Atencao").length;

  return (
    <Card className="p-2.5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">Verdade oficial</span>
        <span className="text-[10.5px] text-muted-foreground capitalize">{area} · v_kpis_{area}_oficial</span>
        <div className="ml-auto flex items-center gap-1.5">
          {criticos > 0 && <Badge variant="destructive" className="h-4 px-1.5 text-[9.5px]">{criticos} crítico</Badge>}
          {atencao > 0 && <Badge className="h-4 px-1.5 text-[9.5px] bg-amber-500 text-white">{atencao} atenção</Badge>}
          {criticos === 0 && atencao === 0 && <Badge variant="outline" className="h-4 px-1.5 text-[9.5px] border-emerald-500 text-emerald-700">OK</Badge>}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {rows.map(r => <KpiCell key={r.indicador} r={r} />)}
      </div>
    </Card>
  );
}
