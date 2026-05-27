import { Card } from "@/components/ui/card";
import type { Classificacao } from "@/lib/analytics-kpis";

export type KPICardProps = {
  titulo: string;
  valor: string;
  subtexto?: string;
  classificacao?: Classificacao;
  hint?: string;
};

export function KPICard({ titulo, valor, subtexto, classificacao, hint }: KPICardProps) {
  return (
    <Card className="bg-card p-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">{titulo}</div>
        {classificacao && (
          <span className={`text-[9.5px] font-bold uppercase tracking-wider ${classificacao.cor}`}>
            {classificacao.label}
          </span>
        )}
      </div>
      <div className={`mt-0.5 text-[17px] leading-tight font-bold tabular-nums ${classificacao?.cor ?? "text-foreground"}`}>{valor}</div>
      {subtexto && <div className="mt-0.5 text-[10.5px] text-muted-foreground truncate">{subtexto}</div>}
      {hint && <div className="mt-1 border-t border-border/60 pt-1 text-[10px] text-muted-foreground/80 truncate">{hint}</div>}
    </Card>
  );
}
