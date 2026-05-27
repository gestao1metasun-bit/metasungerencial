/**
 * D6.13.4 — AnexosButton
 *
 * Botão inline reutilizável que abre o AttachmentDialog para qualquer
 * entidade anexável. Usado como atalho rápido em linhas de grid (Contratos,
 * Obras, etc.) enquanto a fiação completa via EnterpriseRecordToolbar
 * não foi adotada na tela.
 */
import { useState, type ReactNode } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentDialog } from "./AttachmentDialog";
import type {
  CategoriaAnexo, EntidadeAnexavel,
} from "@/lib/anexos-engine.functions";
import { cn } from "@/lib/utils";

export type AnexosButtonProps = {
  entidade: EntidadeAnexavel;
  entidadeId?: string | null;
  titulo?: string;
  descricao?: string;
  categoriaPadrao?: CategoriaAnexo;
  /** Mostra texto "Anexos" ao lado do ícone. Default false (só ícone). */
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

export function AnexosButton({
  entidade, entidadeId, titulo, descricao, categoriaPadrao,
  showLabel = false, disabled, className, children,
}: AnexosButtonProps) {
  const [open, setOpen] = useState(false);
  const ok = !!entidadeId && !disabled;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={showLabel ? "sm" : "icon"}
        title="Anexos"
        disabled={!ok}
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-sm text-sky-700 hover:text-sky-800 hover:bg-sky-50",
          showLabel ? "h-7 px-2 gap-1 text-[12px] font-medium" : "h-7 w-7 p-0",
          className,
        )}
      >
        <Paperclip className="h-4 w-4" />
        {showLabel && <span>{children ?? "Anexos"}</span>}
      </Button>
      <AttachmentDialog
        open={open}
        onOpenChange={setOpen}
        entidade={entidade}
        entidadeId={entidadeId ?? null}
        titulo={titulo ?? "Anexos"}
        descricao={descricao}
        categoriaPadrao={categoriaPadrao}
      />
    </>
  );
}
