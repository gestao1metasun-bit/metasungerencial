/**
 * D18.12 — Painel do contrato gerado aguardando assinatura.
 *
 * Visível somente quando `etapa === "gerado"`. Permite registrar a
 * assinatura (rpc_contrato_marcar_assinado) — única ação que move o
 * contrato para ATIVO e a proposta de origem para CONTRATADA.
 *
 * NÃO permite editar minuta/cláusulas (use voltar para minuta com permissão
 * específica em onda futura). NÃO gera financeiro/engenharia.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, PenTool, Loader2 } from "lucide-react";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useMarcarContratoAssinado } from "@/lib/repositories/comercial-processos-repo";

export function ContratoGeradoPanel({
  contratoId,
  codigo,
}: {
  contratoId: string;
  codigo: string | null;
}) {
  const permAssinar = useHasPermission("comercial.contrato.aprovar_minuta");
  const assinar = useMarcarContratoAssinado();
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState("");

  async function confirmar() {
    try {
      await assinar.mutateAsync({ contratoId, observacao: obs.trim() || undefined });
      setOpen(false);
      setObs("");
    } catch {
      // toast tratado no hook
    }
  }

  return (
    <Card className="p-3 space-y-2 border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Contrato Gerado — Aguardando Assinatura</h3>
          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
            Travado
          </Badge>
        </div>
        <Button
          size="sm"
          disabled={permAssinar.data !== true}
          onClick={() => setOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <PenTool className="h-3.5 w-3.5 mr-1" /> Marcar como assinado
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Contrato redigido e pronto para coleta de assinatura do cliente. Cláusulas e dados comerciais
        não podem mais ser editados aqui — para alterar é necessário voltar para minuta (permissão específica)
        ou cancelar e refazer. Financeiro e Engenharia só serão liberados após o registro da assinatura.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar assinatura — {codigo ?? contratoId.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirme apenas após receber o contrato assinado pelo cliente. Esta ação move o contrato
            para <strong>ATIVO</strong> e marca a proposta de origem como <strong>CONTRATADA</strong>,
            liberando Financeiro e Engenharia.
          </p>
          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea className="mt-1" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={assinar.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmar()} disabled={assinar.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {assinar.isPending
                ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                : <PenTool className="h-3.5 w-3.5 mr-1" />}
              Confirmar assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
