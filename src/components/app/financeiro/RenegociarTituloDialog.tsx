import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import {
  useFinanceiroRepo,
} from "@/hooks/useRepoFinanceiro";
import type {
  Titulo, SimulacaoRenegociacao,
} from "@/lib/repositories/financeiro-repository";
import { fmtBRLPrecise } from "@/lib/financeiro-store";

function fmtBR(d: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

const NIVEL_LABEL: Record<SimulacaoRenegociacao["nivelAprovacao"], { label: string; tone: string; icon: any }> = {
  auto: { label: "Auto-aprovado", tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: ShieldCheck },
  financeiro: { label: "Requer financeiro", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: AlertTriangle },
  diretoria: { label: "Requer diretoria", tone: "bg-rose-500/15 text-rose-600 border-rose-500/30", icon: AlertTriangle },
};

export function RenegociarTituloDialog({
  titulo, open, onClose, onSuccess,
}: {
  titulo: Titulo | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [dataRef] = useState(() => new Date().toISOString().slice(0, 10));

  const [jurosManual, setJurosManual] = useState<string>("");
  const [multaManual, setMultaManual] = useState<string>("");
  const [desconto, setDesconto] = useState<string>("0");

  const [parcelar, setParcelar] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [primeiroVenc, setPrimeiroVenc] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [intervalo, setIntervalo] = useState(30);

  const [motivo, setMotivo] = useState("");
  const [aprovador, setAprovador] = useState("");
  const [obs, setObs] = useState("");

  const sim: SimulacaoRenegociacao | null = useMemo(() => {
    if (!titulo) return null;
    try {
      return simularRenegociacao({
        tituloId: titulo.id,
        dataRef,
        jurosAplicado: jurosManual === "" ? undefined : Number(jurosManual),
        multaAplicada: multaManual === "" ? undefined : Number(multaManual),
        desconto: Number(desconto) || 0,
        parcelar,
        numeroParcelas: numParcelas,
        primeiroVencimento: primeiroVenc,
        intervaloDias: intervalo,
      });
    } catch {
      return null;
    }
  }, [titulo, dataRef, jurosManual, multaManual, desconto, parcelar, numParcelas, primeiroVenc, intervalo]);

  if (!titulo) return null;

  const NivelChip = sim ? NIVEL_LABEL[sim.nivelAprovacao] : null;

  function confirmar() {
    if (!titulo || !sim) return;
    try {
      confirmarRenegociacao({
        tituloId: titulo.id,
        dataRef,
        jurosAplicado: sim.jurosAplicado,
        multaAplicada: sim.multaAplicada,
        desconto: sim.desconto,
        parcelar,
        numeroParcelas: parcelar ? numParcelas : 1,
        primeiroVencimento: primeiroVenc,
        intervaloDias: intervalo,
        motivo,
        observacao: obs || undefined,
        aprovadoPor: aprovador || undefined,
      });
      toast.success("Renegociação registrada.");
      onSuccess?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao renegociar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Renegociar título — {titulo.id}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Resumo do título */}
          <section className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Título original</div>
            <div className="space-y-1">
              <div className="font-medium">{titulo.descricao}</div>
              <div className="text-muted-foreground">{titulo.tipo === "AP" ? titulo.fornecedor : titulo.cliente}</div>
              <div className="grid grid-cols-2 gap-1 pt-2 text-xs">
                <span className="text-muted-foreground">Vencimento</span>
                <span className="text-right">{fmtBR(titulo.vencimento)}</span>
                <span className="text-muted-foreground">Valor original</span>
                <span className="text-right">{fmtBRLPrecise(titulo.valorOriginal)}</span>
                <span className="text-muted-foreground">Saldo aberto</span>
                <span className="text-right font-semibold">{fmtBRLPrecise(titulo.saldo)}</span>
                <span className="text-muted-foreground">Dias em atraso</span>
                <span className="text-right">{sim?.diasAtraso ?? 0}</span>
              </div>
            </div>
          </section>

          {/* Encargos */}
          <section className="rounded-lg border p-3 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Encargos</div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">
                  Juros (sugerido: <span className="font-mono">{fmtBRLPrecise(sim?.jurosSugerido ?? 0)}</span>)
                </Label>
                <Input
                  type="number" step="0.01" min={0}
                  placeholder={String(sim?.jurosSugerido ?? 0)}
                  value={jurosManual}
                  onChange={(e) => setJurosManual(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">
                  Multa (sugerida: <span className="font-mono">{fmtBRLPrecise(sim?.multaSugerida ?? 0)}</span>)
                </Label>
                <Input
                  type="number" step="0.01" min={0}
                  placeholder={String(sim?.multaSugerida ?? 0)}
                  value={multaManual}
                  onChange={(e) => setMultaManual(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Desconto (R$)</Label>
                <Input
                  type="number" step="0.01" min={0}
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                />
                {sim && sim.descontoPct > 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {sim.descontoPct.toFixed(2)}% sobre valor com encargos
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Parcelamento */}
          <section className="rounded-lg border p-3 text-sm lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parcelamento</div>
              <div className="flex items-center gap-2">
                <Label htmlFor="parcelar-sw" className="text-xs">Parcelar?</Label>
                <Switch id="parcelar-sw" checked={parcelar} onCheckedChange={setParcelar} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{parcelar ? "1º vencimento" : "Novo vencimento"}</Label>
                <Input type="date" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} />
              </div>
              {parcelar && (
                <>
                  <div>
                    <Label className="text-xs">Nº de parcelas</Label>
                    <Input
                      type="number" min={2} max={60}
                      value={numParcelas}
                      onChange={(e) => setNumParcelas(Math.max(2, Number(e.target.value) || 2))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Intervalo (dias)</Label>
                    <Input
                      type="number" min={1}
                      value={intervalo}
                      onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 30))}
                    />
                  </div>
                </>
              )}
            </div>

            {sim && (
              <div className="mt-3 rounded-md border bg-muted/30 p-2">
                <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Preview das parcelas</div>
                <div className="max-h-32 overflow-y-auto">
                  {sim.parcelas.map((p) => (
                    <div key={p.numero} className="flex justify-between text-xs py-0.5">
                      <span>Parcela {p.numero}/{sim.parcelas.length} · venc. {fmtBR(p.vencimento)}</span>
                      <span className="font-mono">{fmtBRLPrecise(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Motivo / aprovação */}
          <section className="rounded-lg border p-3 text-sm lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificativa</div>
              {NivelChip && (
                <Badge variant="outline" className={`${NivelChip.tone} border text-[10px] font-semibold`}>
                  <NivelChip.icon className="mr-1 h-3 w-3 inline" />
                  {NivelChip.label}
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Motivo (obrigatório, mín. 5 caracteres)</Label>
                <Textarea
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Cliente solicitou parcelamento devido a dificuldade financeira temporária."
                />
              </div>
              {sim?.nivelAprovacao === "diretoria" && (
                <div>
                  <Label className="text-xs">Aprovador da diretoria (obrigatório)</Label>
                  <Input
                    value={aprovador}
                    onChange={(e) => setAprovador(e.target.value)}
                    placeholder="Nome / e-mail do aprovador"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Observação interna</Label>
                <Textarea
                  rows={2}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sumário final */}
        {sim && (
          <div className="rounded-lg border bg-primary/5 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Cell label="Saldo atual" value={fmtBRLPrecise(sim.saldoOriginal)} />
              <Cell label="+ Juros" value={fmtBRLPrecise(sim.jurosAplicado)} />
              <Cell label="+ Multa" value={fmtBRLPrecise(sim.multaAplicada)} />
              <Cell label="− Desconto" value={fmtBRLPrecise(sim.desconto)} tone="text-emerald-600" />
              <Cell
                label="VALOR FINAL"
                value={fmtBRLPrecise(sim.valorFinal)}
                tone="text-primary font-bold"
                big
              />
              <Cell label="Parcelas" value={`${sim.parcelas.length}x`} />
              <Cell label="Desconto %" value={`${sim.descontoPct.toFixed(2)}%`} />
              <Cell label="Aprovação" value={NIVEL_LABEL[sim.nivelAprovacao].label} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={confirmar}
            disabled={!sim || motivo.trim().length < 5 || (sim?.nivelAprovacao === "diretoria" && !aprovador.trim())}
          >
            Confirmar renegociação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value, tone, big }: { label: string; value: string; tone?: string; big?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`${big ? "text-base" : "text-sm"} font-mono ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
