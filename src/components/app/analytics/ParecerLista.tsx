import { Card } from "@/components/ui/card";
import type { Parecer } from "@/lib/analytics-kpis";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

const ICONS = {
  ok: CheckCircle2,
  info: Info,
  atencao: AlertTriangle,
  critico: ShieldAlert,
};
const COLORS = {
  ok: "text-emerald-600 border-emerald-300/40",
  info: "text-foreground border-border",
  atencao: "text-amber-600 border-amber-300/40",
  critico: "text-destructive border-destructive/40",
};

export function ParecerLista({ pareceres }: { pareceres: Parecer[] }) {
  return (
    <div className="space-y-3">
      {pareceres.map((p) => {
        const Icon = ICONS[p.severidade];
        return (
          <Card key={p.codigo} className={`flex items-start gap-3 border-l-4 p-4 ${COLORS[p.severidade]}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{p.titulo}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{p.mensagem}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
