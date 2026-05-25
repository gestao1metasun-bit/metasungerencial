// Aba de Rescisões contratuais — simulador + histórico.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileSearch, Receipt, Scissors } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/app/StatCard";
import { toast } from "sonner";
import {
  useRepoRescisoes, useRepoTitulos, useFinanceiroRepo,
} from "@/hooks/useRepoFinanceiro";
import type { SimulacaoRescisao } from "@/lib/repositories/financeiro-repository";
import { fmtBRLPrecise } from "@/lib/financeiro-store";

function fmtBR(d: string) { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; }

export function RescisoesTab() {
  const rescs = useRepoRescisoes();
  const titulos = useRepoTitulos();
  const [open, setOpen] = useState(false);

  // Contratos disponíveis = qualquer contratoId presente nos títulos
  const contratosDisponiveis = useMemo(() => {
    const m = new Map<string, { id: string; cliente?: string; aberto: number; total: number }>();
    titulos.forEach((t) => {
      if (!t.contratoId) return;
      const cur = m.get(t.contratoId) ?? { id: t.contratoId, cliente: t.cliente, aberto: 0, total: 0 };
      cur.cliente = cur.cliente ?? t.cliente;
      cur.total += t.valorOriginal;
      if (t.tipo === "AR" && t.status !== "cancelado") cur.aberto += t.saldo;
      m.set(t.contratoId, cur);
    });
    // remove contratos já rescindidos
    rescs.forEach((r) => m.delete(r.contratoId));
    return Array.from(m.values()).sort((a, b) => b.aberto - a.aberto);
  }, [titulos, rescs]);

  const totalDevolvido = rescs.reduce((s, r) => s + r.devolucaoLiquida, 0);
  const totalMulta = rescs.reduce((s, r) => s + r.multaCalculada, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rescisões" value={String(rescs.length)} />
        <StatCard label="Multa total cobrada" value={fmtBRLPrecise(totalMulta)} tone="warning" />
        <StatCard label="Devolução total" value={fmtBRLPrecise(totalDevolvido)} tone="destructive" />
        <StatCard label="Contratos elegíveis" value={String(contratosDisponiveis.length)} hint="Com títulos em aberto" />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Scissors className="h-4 w-4 text-rose-500" /> Rescisão contratual
            </div>
            <div className="text-xs text-muted-foreground">
              Cancela todos os títulos AR em aberto do contrato, aplica multa rescisória sobre o valor
              recebido e gera título de devolução AP ao cliente.
            </div>
          </div>
          <Button onClick={() => setOpen(true)} variant="destructive" disabled={contratosDisponiveis.length === 0}>
            <Scissors className="mr-1 h-4 w-4" />Rescindir contrato
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Rescisão</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Multa</TableHead>
              <TableHead className="text-right">Devolução</TableHead>
              <TableHead>Títulos canc.</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rescs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  <FileSearch className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  Nenhuma rescisão registrada ainda.
                </TableCell>
              </TableRow>
            )}
            {rescs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{fmtBR(r.data)}</TableCell>
                <TableCell className="font-mono text-xs text-primary">{r.id}</TableCell>
                <TableCell className="font-mono text-xs">{r.contratoId}</TableCell>
                <TableCell className="text-sm">{r.clienteNome}</TableCell>
                <TableCell className="text-right text-xs">{fmtBRLPrecise(r.valorRecebido)}</TableCell>
                <TableCell className="text-right text-xs text-amber-600">
                  {fmtBRLPrecise(r.multaCalculada)}
                  <div className="text-[10px] text-muted-foreground">
                    {r.multaTipo === "percentual" ? `${r.multaValor}%` : "fixo"}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-rose-600">{fmtBRLPrecise(r.devolucaoLiquida)}</TableCell>
                <TableCell className="text-xs">{r.titulosCancelados.length}</TableCell>
                <TableCell className="max-w-xs truncate text-xs" title={r.motivo}>{r.motivo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {open && (
        <RescindirDialog
          contratos={contratosDisponiveis}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function RescindirDialog({
  contratos, onClose,
}: {
  contratos: { id: string; cliente?: string; aberto: number; total: number }[];
  onClose: () => void;
}) {
  const repo = useFinanceiroRepo();
  const [contratoId, setContratoId] = useState<string>(contratos[0]?.id ?? "");
  const [multaTipo, setMultaTipo] = useState<"percentual" | "fixo">("percentual");
  const [multaValor, setMultaValor] = useState<string>("10");
  const [motivo, setMotivo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [obs, setObs] = useState("");
  const [vencDev, setVencDev] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [sim, setSim] = useState<SimulacaoRescisao | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!contratoId) { setSim(null); return; }
    repo.simularRescisao({ contratoId, multaTipo, multaValor: Number(multaValor) || 0 })
      .then((r) => { if (!cancelled) setSim(r); })
      .catch(() => { if (!cancelled) setSim(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId, multaTipo, multaValor]);

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    try {
      await repo.confirmarRescisao({
        contratoId,
        multaTipo,
        multaValor: Number(multaValor) || 0,
        motivo,
        responsavel: responsavel || undefined,
        vencimentoDevolucao: vencDev,
        observacao: obs || undefined,
      });
      toast.success("Rescisão concluída.");
      onClose();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao rescindir"); }
    finally { setEnviando(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Rescindir contrato
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2 text-sm">
          <section className="space-y-3">
            <div>
              <Label className="text-xs">Contrato</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger>
                <SelectContent>
                  {contratos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.id}{c.cliente ? ` — ${c.cliente}` : ""} · aberto {fmtBRLPrecise(c.aberto)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo de multa</Label>
                <Select value={multaTipo} onValueChange={(v) => setMultaTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">% sobre recebido</SelectItem>
                    <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{multaTipo === "percentual" ? "Multa (%)" : "Multa (R$)"}</Label>
                <Input type="number" step="0.01" min={0} value={multaValor} onChange={(e) => setMultaValor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Vencimento da devolução</Label>
              <Input type="date" value={vencDev} onChange={(e) => setVencDev(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Motivo (obrigatório, mín. 5)</Label>
              <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva a razão da rescisão" />
            </div>
            <div>
              <Label className="text-xs">Responsável</Label>
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Observação</Label>
              <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
          </section>

          <section className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Simulação</div>
            {!sim ? (
              <div className="text-xs text-muted-foreground">Selecione um contrato para simular.</div>
            ) : (
              <>
                <Row label="Cliente" value={sim.clienteNome} />
                <Row label="Total recebido" value={fmtBRLPrecise(sim.valorRecebido)} />
                <Row label="Multa calculada" value={fmtBRLPrecise(sim.multaCalculada)} tone="text-amber-600" />
                <Row label="Devolução líquida" value={fmtBRLPrecise(sim.devolucaoLiquida)} tone="text-rose-600 font-bold" big />
                <div className="pt-2">
                  <div className="text-[11px] uppercase text-muted-foreground mb-1">Títulos AR a cancelar ({sim.titulosEmAberto.length})</div>
                  <div className="max-h-32 overflow-y-auto rounded border bg-background/50 p-2 text-xs">
                    {sim.titulosEmAberto.length === 0 && <div className="text-muted-foreground">Nenhum</div>}
                    {sim.titulosEmAberto.map((t) => (
                      <div key={t.id} className="flex justify-between gap-2 py-0.5">
                        <span className="truncate">{t.id} · {t.descricao}</span>
                        <span className="font-mono">{fmtBRLPrecise(t.saldo)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {sim.adiantamentosAtivos.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] uppercase text-muted-foreground mb-1">
                      Adiantamentos a estornar ({sim.adiantamentosAtivos.length})
                    </div>
                    <div className="rounded border bg-background/50 p-2 text-xs">
                      {sim.adiantamentosAtivos.map((a) => (
                        <div key={a.id} className="flex justify-between gap-2 py-0.5">
                          <span>{a.id}</span><span className="font-mono">{fmtBRLPrecise(a.saldo)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sim.devolucaoLiquida > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 border-rose-200 gap-1 mt-2">
                    <Receipt className="h-3 w-3" /> Será criado AP de devolução ao cliente
                  </Badge>
                )}
              </>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={enviando || !sim || motivo.trim().length < 5}
          >Confirmar rescisão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, tone, big }: { label: string; value: string; tone?: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`${big ? "text-base" : "text-sm"} font-mono ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
