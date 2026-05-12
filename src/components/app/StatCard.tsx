import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EyeButton } from "./EyeButton";

type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "muted";

const toneMap: Record<Tone, string> = {
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({
  label, value, hint, icon: Icon, tone = "primary", trend, onView,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  trend?: { value: string; positive?: boolean };
  onView?: () => void;
}) {
  return (
    <Card className="relative overflow-hidden border-border bg-card p-4 shadow-[var(--shadow-elegant)] transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            {onView && <EyeButton onClick={onView} />}
          </div>
          <div className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          {trend && (
            <div className={`mt-2 inline-flex items-center text-xs font-semibold ${trend.positive ? "text-success" : "text-destructive"}`}>
              {trend.positive ? "▲" : "▼"} {trend.value}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
