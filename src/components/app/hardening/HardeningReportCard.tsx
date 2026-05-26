/**
 * Onda D4.6 — Card de relatório de hardening.
 *
 * Exibe pontos frágeis residuais (órfãos, status inconsistente, etc.) e
 * permite disparar recálculo de vencidos. Indicado para painel admin.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { useHardeningReport, recalcularVencidos } from "@/lib/repositories/use-hardening";
import { toast } from "sonner";

const sevTone: Record<string, string> = {
  alto: "border-destructive text-destructive bg-destructive/10",
  medio: "border-warning text-warning bg-warning/10",
  baixo: "border-info text-info bg-info/10",
};

export function HardeningReportCard() {
  const { rows, loading, error, refresh } = useHardeningReport();
  const [busy, setBusy] = useState(false);

  async function handleRecalc() {
    setBusy(true);
    try {
      const r: any = await recalcularVencidos();
      const arr = Array.isArray(r) ? r[0] : r;
      toast.success(`Recalculado: ${arr?.parcelas_atualizadas ?? 0} parcelas, ${arr?.titulos_atualizados ?? 0} títulos`);
      refresh();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? "erro desconhecido"}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>;
  }

  const total = (rows ?? []).reduce((a, r) => a + r.qtd, 0);
  const altos = (rows ?? []).filter(r => r.severidade === "alto" && r.qtd > 0).length;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Relatório de Hardening (D4.6)
          </div>
          <div className="text-xs text-muted-foreground">
            Inconsistências estruturais residuais. Severidade alto deve ser zerada antes de novas frentes.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={altos > 0 ? sevTone.alto : "border-success text-success bg-success/10"}>
            {altos > 0 ? `${altos} alto(s)` : "OK"}
          </Badge>
          <Button size="sm" variant="outline" onClick={handleRecalc} disabled={busy}>
            <RefreshCw className={`h-3 w-3 mr-1 ${busy ? "animate-spin" : ""}`} />
            Recalcular vencidos
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-xs text-destructive">Erro ao carregar relatório: {error}</div>
      )}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {(rows ?? []).map((r) => (
          <div key={r.categoria}
            className={`rounded-md border p-2 text-xs flex items-start gap-2 ${
              r.qtd === 0 ? "bg-muted/30" : sevTone[r.severidade] ?? ""
            }`}>
            {r.qtd === 0
              ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] uppercase opacity-70">{r.categoria}</div>
              <div className="font-semibold">{r.qtd} {r.descricao}</div>
            </div>
          </div>
        ))}
        {(rows ?? []).length === 0 && (
          <div className="text-xs text-muted-foreground">Sem registros.</div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-muted-foreground">
        Total de inconsistências detectadas: <span className="font-bold">{total}</span>
      </div>
    </Card>
  );
}
