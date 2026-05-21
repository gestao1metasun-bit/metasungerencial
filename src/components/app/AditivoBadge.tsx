// Badge visual forte para indicar "Contrato com aditivo pendente".
// Reutilizado em contrato, projeto, obra, dashboard.
import { AlertTriangle } from "lucide-react";
import { useAditivoLock } from "@/lib/aditivos-store";

export function AditivoBadge({
  contratoId,
  size = "md",
  className = "",
}: {
  contratoId: string | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { pendente } = useAditivoLock(contratoId);
  if (!pendente) return null;
  const sz =
    size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1"
    : size === "lg" ? "text-sm px-3 py-1.5 gap-2"
    : "text-xs px-2 py-1 gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-md border border-destructive/40 bg-destructive/10 font-semibold uppercase tracking-wide text-destructive animate-pulse ${sz} ${className}`}
      title={`Aditivo ${pendente.id} em andamento — operações sensíveis estão travadas.`}
    >
      <AlertTriangle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Contrato com aditivo pendente
    </span>
  );
}
