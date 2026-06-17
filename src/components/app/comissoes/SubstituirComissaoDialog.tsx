/**
 * C-ENT.10 — Diálogo de substituição (versionamento) de comissão.
 * Cria nova comissão e marca a atual como SUBSTITUIDA via RPC oficial.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubstituirComissao, type Comissao } from "@/lib/repositories/comercial-comissao-repo";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  comissao: Comissao | null;
};

export function SubstituirComissaoDialog({ open, onOpenChange, comissao }: Props) {
  const [pct, setPct] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const sub = useSubstituirComissao();

  const base = Number(comissao?.valor_base ?? 0);
  const novoValor = pct ? Math.round(base * (Number(pct) / 100) * 100) / 100 : 0;
  const valid = !!comissao && Number(pct) > 0 && Number(pct) <= 100 && motivo.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Substituir comissão {comissao?.codigo ?? ""}</DialogTitle>
          <DialogDescription>
            A comissão atual será marcada como <strong>SUBSTITUIDA</strong> e uma nova versão
            será criada com o novo percentual. Nenhum dado anterior é alterado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base de cálculo</span>
            <span className="tabular-nums">{base.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Percentual atual</span>
            <span>{comissao?.percentual?.toString() ?? "—"}%</span>
          </div>
          <div className="space-y-1">
            <Label>Novo percentual (%)</Label>
            <Input type="number" min={0} max={100} step={0.01} value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
          {!!pct && (
            <div className="flex justify-between text-emerald-700">
              <span>Novo valor</span>
              <span className="tabular-nums">{novoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          )}
          <div className="space-y-1">
            <Label>Motivo (mínimo 5 caracteres)</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!valid || sub.isPending}
            onClick={async () => {
              if (!comissao) return;
              await sub.mutateAsync({ comissaoId: comissao.id, novoPercentual: Number(pct), motivo: motivo.trim() });
              onOpenChange(false);
              setPct(""); setMotivo("");
            }}
          >
            {sub.isPending ? "Substituindo…" : "Substituir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
