/**
 * D18.12/D18.18 — Painel do contrato gerado aguardando assinatura.
 *
 * Visível quando `etapa === "gerado"`. Ações:
 *   - Marcar como assinado  (rpc_contrato_marcar_assinado)
 *   - Reabrir minuta        (D18.18, UPDATE direto gated por permissão
 *                           `comercial.contrato.editar_minuta` + motivo ≥ 5)
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, PenTool, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useMarcarContratoAssinado } from "@/lib/repositories/comercial-processos-repo";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/repositories/error-log-repo";

export function ContratoGeradoPanel({
  contratoId, codigo, dados,
}: {
  contratoId: string;
  codigo: string | null;
  dados?: Record<string, unknown> | null;
}) {
  const qc = useQueryClient();
  const permAssinar = useHasPermission("comercial.contrato.aprovar_minuta");
  const permReabrir = useHasPermission("comercial.contrato.editar_minuta");
  const assinar = useMarcarContratoAssinado();
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState("");
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [motivoReabrir, setMotivoReabrir] = useState("");
  const [reabrindo, setReabrindo] = useState(false);

  async function confirmar() {
    try {
      await assinar.mutateAsync({ contratoId, observacao: obs.trim() || undefined });
      setOpen(false); setObs("");
    } catch { /* hook tratou */ }
  }

  async function reabrir() {
    if (motivoReabrir.trim().length < 5) {
      toast.error("Motivo precisa ter pelo menos 5 caracteres.");
      return;
    }
    setReabrindo(true);
    try {
      const timelineExist = ((dados ?? {}) as { timeline?: unknown[] }).timeline ?? [];
      const novaTimeline = [
        ...(Array.isArray(timelineExist) ? timelineExist : []),
        {
          tipo: "REABERTURA_MINUTA",
          motivo: motivoReabrir.trim(),
          em: new Date().toISOString(),
        },
      ];
      const novoDados = { ...(dados ?? {}), timeline: novaTimeline, reaberto_em: new Date().toISOString(), motivo_reabertura: motivoReabrir.trim() };
      const { error } = await supabase
        .from("contratos")
        .update({ status: "MINUTA", dados: novoDados as never } as never)
        .eq("id", contratoId);
      if (error) throw error;
      toast.success("Minuta reaberta — edição liberada.");
      setReabrirOpen(false); setMotivoReabrir("");
      void qc.invalidateQueries({ queryKey: ["contratos-supabase"] });
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      toast.error(`Erro ao reabrir minuta: ${msg}`);
      logError({ modulo: "comercial", tela: "ContratoGeradoPanel", acao: "reabrir_minuta", mensagem: msg, payload: { contratoId } });
    } finally {
      setReabrindo(false);
    }
  }

  return (
    <Card className="p-3 space-y-2 border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Contrato Gerado — Aguardando Assinatura</h3>
          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">Travado</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={permReabrir.data !== true} onClick={() => setReabrirOpen(true)}>
            <Undo2 className="h-3.5 w-3.5 mr-1" /> Reabrir minuta
          </Button>
          <Button size="sm" disabled={permAssinar.data !== true} onClick={() => setOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <PenTool className="h-3.5 w-3.5 mr-1" /> Marcar como assinado
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Contrato redigido e pronto para coleta de assinatura. Cláusulas e dados comerciais ficam
        travados. Para alterar, use <strong>Reabrir minuta</strong> (registra motivo e timeline).
        Contrato <strong>ASSINADO/CANCELADO</strong> não pode ser reaberto.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar assinatura — {codigo ?? contratoId.slice(0, 8)}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirme apenas após receber o contrato assinado pelo cliente. Esta ação move o contrato
            para <strong>ATIVO</strong>, libera Financeiro e Engenharia.
          </p>
          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea className="mt-1" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={assinar.isPending}>Cancelar</Button>
            <Button onClick={() => void confirmar()} disabled={assinar.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {assinar.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <PenTool className="h-3.5 w-3.5 mr-1" />}
              Confirmar assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reabrirOpen} onOpenChange={setReabrirOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reabrir minuta — {codigo ?? contratoId.slice(0, 8)}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            O contrato voltará para <strong>MINUTA</strong>, liberando edição de cláusulas, forma de
            pagamento e dados contratuais. A reabertura fica registrada na timeline.
          </p>
          <div>
            <Label className="text-xs">Motivo (mín. 5 caracteres) *</Label>
            <Textarea className="mt-1" rows={3} value={motivoReabrir} onChange={(e) => setMotivoReabrir(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReabrirOpen(false)} disabled={reabrindo}>Voltar</Button>
            <Button onClick={() => void reabrir()} disabled={reabrindo}>
              {reabrindo ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1" />}
              Reabrir minuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
