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
      className={`group relative overflow-hidden border-border/70 bg-card p-5 shadow-elegant transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Left accent bar */}
      <span className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r ${accentBar[tone]} opacity-80`} />
      {/* Subtle corner glow */}
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${toneRing[tone]} opacity-60 blur-2xl`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
            {onView && <EyeButton onClick={onView} />}
          </div>
          <div className="mt-3 truncate font-display text-[2rem] leading-none font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
          {trend && (
            <div className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {trend.positive ? "▲" : "▼"} {trend.value}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${toneRing[tone]} ring-1 shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
