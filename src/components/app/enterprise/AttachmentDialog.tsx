/**
 * D6.13.4 — AttachmentDialog
 *
 * Dialog wrapper reutilizável que abre o AttachmentPanel para qualquer
 * entidade. Telas só precisam controlar `open` + passar entidade/id.
 */
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { AttachmentPanel } from "./AttachmentPanel";
import type {
  CategoriaAnexo, EntidadeAnexavel,
} from "@/lib/anexos-engine.functions";

export type AttachmentDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entidade: EntidadeAnexavel;
  entidadeId?: string | null;
  /** Título exibido (ex.: "Anexos · Título 12345"). */
  titulo?: string;
  /** Descrição curta opcional. */
  descricao?: string;
  categoriaPadrao?: CategoriaAnexo;
};

export function AttachmentDialog({
  open, onOpenChange, entidade, entidadeId,
  titulo = "Anexos", descricao, categoriaPadrao,
}: AttachmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{titulo}</DialogTitle>
          {descricao && (
            <DialogDescription className="text-[12px]">{descricao}</DialogDescription>
          )}
        </DialogHeader>
        <AttachmentPanel
          entidade={entidade}
          entidadeId={entidadeId}
          categoriaPadrao={categoriaPadrao}
          hideHeader
        />
      </DialogContent>
    </Dialog>
  );
}
