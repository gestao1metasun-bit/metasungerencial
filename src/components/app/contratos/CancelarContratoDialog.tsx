/**
 * C-ENT.5 — Diálogo oficial de cancelamento de Contrato Supabase.
 * Não exclui contrato, propostas nem projetos.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type CancelarContratoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string | null;
  codigo: string | null;
  loading?: boolean;
  onConfirm: (motivo: string, observacao?: string | null) => Promise<void>;
};

export function CancelarContratoDialog(props: CancelarContratoDialogProps) {
  const { open, onOpenChange, codigo, loading, onConfirm } = props;
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (open) { setMotivo(""); setObservacao(""); }
  }, [open]);

  const valido = motivo.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar contrato {codigo ?? ""}</DialogTitle>
          <DialogDescription>
            Cancelar contrato não excluirá propostas nem projetos vinculados.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div>
            O status do contrato será marcado como <strong>CANCELADO</strong>. Propostas
            vinculadas <strong>não voltarão</strong> automaticamente para APROVADA. Projetos
            criados permanecem no histórico.
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <Label htmlFor="motivo">Motivo do cancelamento *</Label>
            <Input
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Mínimo 5 caracteres"
              maxLength={300}
            />
          </div>
          <div>
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Textarea
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={!valido || loading}
            onClick={async () => {
              try {
                await onConfirm(motivo.trim(), observacao.trim() || null);
                toast.success("Contrato cancelado");
              } catch (err) {
                toast.error("Falha ao cancelar contrato", { description: (err as Error)?.message });
              }
            }}
          >
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Cancelar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
