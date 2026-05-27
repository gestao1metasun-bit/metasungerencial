/**
 * D6.12.1 — HistoricoDrawer
 *
 * Drawer lateral (Sheet right) que mostra a HistoricoTimeline de qualquer
 * entidade auditada. Padrão TOTVS RM: histórico nunca em modal próprio,
 * sempre como painel contextual sobre o registro selecionado.
 *
 * Uso típico em EnterpriseToolbar:
 *   const [hist, setHist] = useState<{id:string}|null>(null)
 *   <EnterpriseToolbar onHistorico={() => setHist({id: row.id})} ... />
 *   <HistoricoDrawer
 *     open={!!hist}
 *     onOpenChange={(o) => !o && setHist(null)}
 *     entidade="pedidos_venda"
 *     entidadeId={hist?.id}
 *     titulo={`PV ${row.numero}`}
 *   />
 */
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HistoricoTimeline } from "@/components/app/HistoricoTimeline";
import type { AuditEntidade } from "@/lib/audit-store";

export type HistoricoDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidade: AuditEntidade;
  entidadeId?: string | null;
  /** Título contextual (ex.: "PV 0001/2025"). */
  titulo?: string;
  /** Descrição secundária (ex.: cliente, valor). */
  descricao?: string;
};

export function HistoricoDrawer({
  open, onOpenChange, entidade, entidadeId, titulo, descricao,
}: HistoricoDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-muted/40 px-4 py-3">
          <SheetTitle className="text-[13px] font-semibold flex items-center gap-2">
            Histórico
            {titulo && (
              <span className="text-[11px] font-mono font-normal text-muted-foreground">
                · {titulo}
              </span>
            )}
          </SheetTitle>
          {descricao && (
            <SheetDescription className="text-[11px]">{descricao}</SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4 py-3">
          {entidadeId ? (
            <HistoricoTimeline entidade={entidade} entidadeId={entidadeId} />
          ) : (
            <div className="text-sm text-muted-foreground">Selecione um registro.</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
