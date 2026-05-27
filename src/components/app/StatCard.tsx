import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EyeButton } from "./EyeButton";

type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "muted" | "gold";

const toneRing: Record<Tone, string> = {
  primary: "from-primary/15 to-primary/5 text-primary ring-primary/20",
  success: "from-success/15 to-success/5 text-success ring-success/20",
  warning: "from-warning/20 to-warning/5 text-warning-foreground ring-warning/30",
  info: "from-info/15 to-info/5 text-info ring-info/20",
  destructive: "from-destructive/15 to-destructive/5 text-destructive ring-destructive/20",
  muted: "from-muted to-muted/40 text-muted-foreground ring-border",
  gold: "from-gold/25 to-gold/5 text-gold-foreground ring-gold/30",
};

const accentBar: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
  gold: "bg-gold",
};

export function StatCard({
  label, value, hint, icon: Icon, tone = "primary", trend, onView, onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  trend?: { value: string; positive?: boolean };
  onView?: () => void;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`group relative overflow-hidden border-border/70 bg-card p-2.5 shadow-sm ${onClick ? "cursor-pointer hover:bg-accent/40" : ""}`}
    >
      {/* D6.6 — barra lateral fina, sem glow corner SaaS */}
      <span className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r ${accentBar[tone]} opacity-80`} />

      <div className="relative flex items-center justify-between gap-2 pl-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">{label}</div>
            {onView && <EyeButton onClick={onView} />}
          </div>
          <div className="mt-0.5 truncate font-display text-[18px] leading-tight font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {hint && <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{hint}</div>}
          {trend && (
            <div className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0 text-[10px] font-semibold ${trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {trend.positive ? "▲" : "▼"} {trend.value}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`grid h-7 w-7 shrink-0 place-items-center rounded bg-gradient-to-br ${toneRing[tone]} ring-1`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </Card>
  );
}
