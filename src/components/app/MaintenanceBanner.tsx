import { useMaintenanceMode } from "@/hooks/use-flag";
import { AlertTriangle } from "lucide-react";

export function MaintenanceBanner() {
  const on = useMaintenanceMode();
  if (!on) return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-3.5 w-3.5" />
      <span><b>Modo manutenção ativo.</b> Algumas operações podem estar restritas. Administradores continuam com acesso completo.</span>
    </div>
  );
}
