/**
 * D6.13.2 — AttachmentPanel (STUB)
 *
 * UI polimórfica de anexos. Engine real (tabela `anexos_polimorficos` +
 * Supabase Storage + RLS) entra em D6.13.4. Aqui só publicamos o contrato
 * visual e a forma do componente para que telas já comecem a usar.
 *
 * Hoje renderiza estado vazio + área "drop reservada" desabilitada e um
 * aviso textual de "engine em D6.13.4". NÃO grava nada, NÃO mexe em backend.
 */
import { Paperclip, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttachmentPanelProps = {
  entidade: string;
  entidadeId?: string | null;
  /** Quando true, esconde o aviso "engine em D6.13.4". */
  silencioso?: boolean;
  className?: string;
};

export function AttachmentPanel({
  entidade, entidadeId, silencioso, className,
}: AttachmentPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded border border-dashed border-border bg-muted/20 p-3 text-[12px]",
        className,
      )}
      data-entidade={entidade}
      data-entidade-id={entidadeId ?? undefined}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        <span className="font-medium">Anexos</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em]">
          <Lock className="h-3 w-3" /> Stub
        </span>
      </div>
      <p className="text-muted-foreground">
        {entidadeId
          ? "Nenhum anexo registrado."
          : "Selecione um registro para visualizar anexos."}
      </p>
      {!silencioso && (
        <p className="text-[10.5px] text-muted-foreground/80">
          Engine de anexos polimórficos (`anexos_polimorficos` + Storage + RLS) será
          ligada em D6.13.4. Esta UI já reserva o espaço operacional sem persistência.
        </p>
      )}
    </div>
  );
}
