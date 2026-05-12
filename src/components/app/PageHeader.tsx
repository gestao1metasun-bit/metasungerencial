import { ReactNode, useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          Última atualização: {now || "—"}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
