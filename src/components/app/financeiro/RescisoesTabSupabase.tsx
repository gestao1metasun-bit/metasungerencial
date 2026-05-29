// D15.3.c — RescisoesTab 100% Supabase.
// Lê v_rescisoes_enriquecido + lista contratos elegíveis pelo Supabase
// e executa rescisão via rpc_rescisao_executar.
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
  useRescisoes, useContratosElegiveisRescisao, useExecutarRescisao,
  type ContratoElegivelRescisao,
} from "@/lib/repositories/rescisoes-repo";
import { errorLogRepo } from "@/lib/repositories/error-log-repo";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function fmtBR(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
}

const UI_KEY = "ui.fin.rescisoes.v1";

export function RescisoesTabSupabase() {
  const { data: rescs = [], isLoading } = useRescisoes();
  const { data: contratos = [] } = useContratosElegiveisRescisao();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");

  // UI-only LS (filtros)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UI_KEY);
      if (raw) setFiltro(JSON.parse(raw).filtro ?? "");
    } catch {/* ignore */}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(UI_KEY, JSON.stringify({ filtro })); } catch {/* ignore */}
  }, [filtro]);

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return rescs;
    return rescs.filter((r) =>
      (r.codigo ?? "").toLowerCase().includes(q) ||
      (r.contrato_codigo ?? "").toLowerCase().includes(q) ||
      (r.cliente_nome ?? "").toLowerCase().includes(q) ||
      (r.motivo ?? "").toLowerCase().includes(q),
    );
  }, [rescs, filtro]);

  const totalDevolvido = rescs.reduce((s, r) => s + Number(r.devolucao_liquida || 0), 0);
  const totalMulta = rescs.reduce((s, r) => s + Number(r.multa_calculada || 0), 0);

  const qc = useQueryClient();
  return (
    <div className="space-y-4">
      <RmTabHeader
        variant="aprovacao"
        search={filtro}
        onSearchChange={setFiltro}
        searchPlaceholder="Buscar rescisão…"
        onNovo={() => contratos.length > 0 && setOpen(true)}
        onAtualizar={() => qc.invalidateQueries({ queryKey: ["rescisoes"] })}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rescisões" value={String(rescs.length)} />
        <StatCard label="Multa total cobrada" value={fmtBRL(totalMulta)} tone="warning" />
        <StatCard label="Devolução total" value={fmtBRL(totalDevolvido)} tone="destructive" />
        <StatCard label="Contratos elegíveis" value={String(contratos.length)} hint="Com títulos AR em aberto" />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Scissors className="h-4 w-4 text-rose-500" /> Rescisão contratual
            </div>
            <div className="text-xs text-muted-foreground">
              Cancela títulos AR em aberto do contrato, aplica multa sobre o valor recebido e
              gera AP de devolução. Auditado e rastreável.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-9 w-56"
            />
            <Button onClick={() => setOpen(true)} variant="destructive" disabled={contratos.length === 0}>
              <Scissors className="mr-1 h-4 w-4" />Rescindir contrato
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Multa</TableHead>
              <TableHead className="text-right">Devolução</TableHead>
              <TableHead>Títulos canc.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="py-6 text-center text-xs text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  <FileSearch className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  Nenhuma rescisão registrada.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{fmtBR(r.data_rescisao)}</TableCell>
                <TableCell className="font-mono text-xs">{r.contrato_codigo ?? r.contrato_id.slice(0, 8)}</TableCell>
                <TableCell className="text-sm">{r.cliente_nome ?? "—"}</TableCell>
                <TableCell className="text-right text-xs">{fmtBRL(Number(r.valor_recebido))}</TableCell>
                <TableCell className="text-right text-xs text-amber-600">
                  {fmtBRL(Number(r.multa_calculada))}
                  <div className="text-[10px] text-muted-foreground">
                    {r.multa_tipo === "percentual" ? `${r.multa_valor}%` : "fixo"}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-rose-600">
                  {fmtBRL(Number(r.devolucao_liquida))}
                </TableCell>
                <TableCell className="text-xs">{r.titulos_cancelados}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs" title={r.motivo}>{r.motivo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {open && (
        <RescindirDialog contratos={contratos} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function RescindirDialog({
  contratos, onClose,
}: {
  contratos: ContratoElegivelRescisao[];
  onClose: () => void;
}) {
  const exec = useExecutarRescisao();
  const [contratoId, setContratoId] = useState(contratos[0]?.id ?? "");
  const [multaTipo, setMultaTipo] = useState<"percentual" | "fixo">("percentual");
  const [multaValor, setMultaValor] = useState("10");
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [vencDev, setVencDev] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const ctr = contratos.find((c) => c.id === contratoId);
  const valorRecebido = ctr?.valor_recebido ?? 0;
  const multaCalc = useMemo(() => {
    const v = Number(multaValor) || 0;
    return multaTipo === "percentual"
      ? Math.round(valorRecebido * v) / 100
      : v;
  }, [multaTipo, multaValor, valorRecebido]);
  const devLiquida = Math.max(0, valorRecebido - multaCalc);

  const valido = !!contratoId && motivo.trim().length >= 5 && (devLiquida === 0 || !!vencDev);

  async function confirmar() {
    if (!valido) return;
    try {
      await exec.mutateAsync({
        contrato_id: contratoId,
        multa_tipo: multaTipo,
        multa_valor: Number(multaValor) || 0,
        motivo: motivo.trim(),
        vencimento_devolucao: devLiquida > 0 ? vencDev : null,
        observacoes: obs.trim() || null,
      });
      toast.success("Rescisão executada.");
      onClose();
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao rescindir";
      toast.error(msg);
      void errorLogRepo.log({
        modulo: "financeiro",
        tela: "RescisoesTabSupabase",
        acao: "rpc_rescisao_executar",
        mensagem: msg,
        payload: { contratoId, multaTipo, multaValor, motivo },
        severidade: "error",
      }).catch(() => {});
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" /> Rescindir contrato
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 text-sm">
          <div>
            <Label className="text-xs">Contrato</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.codigo ?? c.id.slice(0, 8))}{c.cliente_nome ? ` — ${c.cliente_nome}` : ""} · aberto {fmtBRL(c.saldo_aberto)}
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
            <Label className="text-xs">Vencimento da devolução {devLiquida > 0 ? "(obrigatório)" : "(opcional)"}</Label>
            <Input type="date" value={vencDev} onChange={(e) => setVencDev(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Motivo (obrigatório, mín. 5 caracteres)</Label>
            <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Razão da rescisão" />
          </div>

          <div>
            <Label className="text-xs">Observação interna</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Simulação</div>
            <Row label="Valor recebido" value={fmtBRL(valorRecebido)} />
            <Row label="Multa calculada" value={fmtBRL(multaCalc)} tone="text-amber-600" />
            <Row label="Devolução líquida" value={fmtBRL(devLiquida)} tone="text-rose-600 font-bold" big />
            <Row label="Títulos AR a cancelar" value={String(ctr?.titulos_ar_abertos ?? 0)} />
            {devLiquida > 0 && (
              <Badge className="mt-2 bg-rose-100 text-rose-700 border-rose-200 gap-1">
                <Receipt className="h-3 w-3" /> Será criado AP de devolução ao cliente
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={exec.isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={!valido || exec.isPending}>
            {exec.isPending ? "Executando…" : "Confirmar rescisão"}
          </Button>
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
