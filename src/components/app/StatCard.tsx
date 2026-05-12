import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "muted";

const toneMap: Record<Tone, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  destructive: "bg-destructive/15 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({
  label, value, hint, icon: Icon, tone = "primary", trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  trend?: { value: string; positive?: boolean };
}) {
  return (
    <Card className="relative overflow-hidden border-border bg-[image:var(--gradient-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          {trend && (
            <div className={`mt-2 inline-flex items-center text-xs font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
              {trend.positive ? "▲" : "▼"} {trend.value}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
