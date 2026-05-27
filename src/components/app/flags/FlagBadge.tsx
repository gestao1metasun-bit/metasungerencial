/**
 * D6.10.1 — Badge compacto para indicar flag em grid/linha.
 */
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { flagCorMeta, type FlagCor, type RecordFlagCount } from "@/hooks/useRecordFlags";

type Props = {
  cor?: FlagCor | null;
  count?: RecordFlagCount | null;
  size?: "xs" | "sm";
  className?: string;
};

/** Mostra a bandeira do usuário (cor) e, se houver, o contador total agregado. */
export function FlagBadge({ cor, count, size = "xs", className }: Props) {
  const meta = cor ? flagCorMeta(cor) : null;
  const total = count?.total ?? 0;

  if (!meta && total === 0) {
    return (
      <Flag
        className={cn(
          "text-muted-foreground/30",
          size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5",
          className,
        )}
        aria-label="Sem flag"
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1 py-0 font-mono tabular-nums",
        size === "xs" ? "h-4 text-[10px]" : "h-5 text-[11px]",
        className,
      )}
      style={{
        backgroundColor: meta ? `${meta.hex}22` : "transparent",
        color: meta?.hex ?? "var(--muted-foreground)",
        border: meta ? `1px solid ${meta.hex}55` : "1px dashed var(--border)",
      }}
      title={meta ? `${meta.label} — ${meta.semantica}` : "Flags do registro"}
    >
      <Flag className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} fill={meta?.hex ?? "none"} />
      {total > 1 && <span>{total}</span>}
    </span>
  );
}
