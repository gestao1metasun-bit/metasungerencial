// Banner compacto com KPIs vindos das views materializadas no Supabase.
// Atualizadas automaticamente a cada 15min via pg_cron (refresh_mv_kpis).
import { useMemo } from "react";
import { RefreshCw, Database, TrendingUp, HardHat, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useKpiComercial, useKpiEngenharia, useKpiConsultor, refreshKpisAgora,
} from "@/lib/kpi-rpc";
import { fmtBRLPrecise } from "@/lib/financeiro-store";
import { fmtPct, fmtNum } from "@/lib/analytics-kpis";
import { useMyPermissions } from "@/hooks/use-permissions";

function Bloco({ icon: Icon, titulo, children }: { icon: any; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {titulo}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Linha({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold tabular-nums">{v}</span>
    </div>
  );
}

export function KpiServidorBanner() {
  const isAdmin = useMyPermissions().isAdmin;
  const com = useKpiComercial();
  const eng = useKpiEngenharia();
  const con = useKpiConsultor();

  const mesAtualCom = useMemo(() => com.data?.[0], [com.data]);
  const mesAtualEng = useMemo(() => eng.data?.[0], [eng.data]);
  const topConsultor = useMemo(() => con.data?.[0], [con.data]);
  const loading = com.isLoading || eng.isLoading || con.isLoading;
  const erro = com.error || eng.error || con.error;

  const handleRefresh = async () => {
    try {
      const r = await refreshKpisAgora();
      toast.success(`KPIs atualizados em ${r.duration_ms} ms`);
      com.refetch(); eng.refetch(); con.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar KPIs");
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">KPIs servidor (views agregadas)</span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success border border-success/30">
            auto-refresh 15min
          </span>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar agora
          </Button>
        )}
      </div>

      {erro ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Erro ao carregar KPIs do servidor: {String((erro as Error).message ?? erro)}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <Bloco icon={TrendingUp} titulo={`Comercial · ${mesAtualCom?.mes ?? "—"}`}>
            <Linha k="Contratos" v={fmtNum(mesAtualCom?.total_contratos ?? 0)} />
            <Linha k="Assinados" v={fmtNum(mesAtualCom?.assinados ?? 0)} />
            <Linha k="Receita assinada" v={fmtBRLPrecise(Number(mesAtualCom?.receita_assinada ?? 0))} />
            <Linha k="Pipeline aberto" v={fmtBRLPrecise(Number(mesAtualCom?.pipeline_total ?? 0))} />
            <Linha k="Ticket médio" v={fmtBRLPrecise(Number(mesAtualCom?.ticket_medio ?? 0))} />
          </Bloco>

          <Bloco icon={HardHat} titulo={`Engenharia · ${mesAtualEng?.mes ?? "—"}`}>
            <Linha k="Obras totais" v={fmtNum(mesAtualEng?.total_obras ?? 0)} />
            <Linha k="Em andamento" v={fmtNum(mesAtualEng?.em_andamento ?? 0)} />
            <Linha k="Finalizadas" v={fmtNum(mesAtualEng?.finalizadas ?? 0)} />
            <Linha k="Atrasadas" v={
              <span className={Number(mesAtualEng?.atrasadas ?? 0) > 0 ? "text-destructive" : ""}>
                {fmtNum(mesAtualEng?.atrasadas ?? 0)}
              </span>
            } />
            <Linha k="kWp total" v={fmtNum(Number(mesAtualEng?.kwp_total ?? 0))} />
          </Bloco>

          <Bloco icon={Users} titulo="Top consultor (receita)">
            {topConsultor ? (
              <>
                <Linha k="Nome" v={topConsultor.consultor_nome ?? "—"} />
                <Linha k="Contratos" v={fmtNum(topConsultor.total_contratos ?? 0)} />
                <Linha k="Assinados" v={fmtNum(topConsultor.assinados ?? 0)} />
                <Linha k="Receita" v={fmtBRLPrecise(Number(topConsultor.receita ?? 0))} />
                <Linha k="Conversão" v={fmtPct(Number(topConsultor.conversao_pct ?? 0))} />
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Sem dados de consultor.</div>
            )}
          </Bloco>
        </div>
      )}
    </div>
  );
}
