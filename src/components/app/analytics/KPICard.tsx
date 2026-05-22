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
    <Card className="bg-[image:var(--gradient-card)] p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{titulo}</div>
        {classificacao && (
          <span className={`text-[10px] font-bold uppercase tracking-wider ${classificacao.cor}`}>
            {classificacao.label}
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-bold ${classificacao?.cor ?? "text-foreground"}`}>{valor}</div>
      {subtexto && <div className="mt-1 text-xs text-muted-foreground">{subtexto}</div>}
      {hint && <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground/80">{hint}</div>}
    </Card>
  );
}
