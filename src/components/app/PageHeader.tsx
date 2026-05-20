import { ReactNode, useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function PageHeader({
  title, subtitle, actions, eyebrow,
}: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string }) {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-6 relative">
      <div className="absolute left-0 bottom-[-1px] h-[2px] w-16 bg-gradient-gold rounded-full" />
      <div>
        {eyebrow && (
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">{eyebrow}</div>
        )}
        <h1 className="font-display text-[2rem] leading-[1.1] font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-mono">
          <Clock className="h-3 w-3" />
          Última atualização · {now || "—"}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
