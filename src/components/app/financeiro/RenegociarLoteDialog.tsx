// ============================================================================
// RenegociarLoteDialog — D6.11.2
// Modal de renegociação consolidada de títulos financeiros.
// Recebe títulos pré-validados (mesmo cliente, mesmo tipo, status renegociável),
// permite definir juros/multa/desconto + parcelas, e chama a RPC oficial
// `renegociar_titulos_lote`. Sem mock, sem fallback — Supabase + auditoria.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type TituloRow = {
  id: string;
  codigo: string | null;
  status: string;
  saldo: number;
  vencimento: string | null;
  cliente_id: string | null;
  tipo: string;
};

type ParcelaForm = { vencimento: string; valor: string };

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function addMonths(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function todayPlus(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function RenegociarLoteDialog({
  open, onOpenChange, titulos, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulos: TituloRow[];
  onSuccess?: (novoTituloId: string) => void;
}) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [juros, setJuros] = useState("0");
  const [multa, setMulta] = useState("0");
  const [desconto, setDesconto] = useState("0");
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [primeiraVenc, setPrimeiraVenc] = useState(todayPlus(30));
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([
    { vencimento: todayPlus(30), valor: "0" },
  ]);
  const [enviando, setEnviando] = useState(false);

  const saldoTotal = useMemo(
    () => titulos.reduce((s, t) => s + Number(t.saldo || 0), 0),
    [titulos],
  );

  const valorRenegociado = useMemo(() => {
    const j = Number(juros) || 0;
    const m = Number(multa) || 0;
    const d = Number(desconto) || 0;
    return Math.max(0, saldoTotal + j + m - d);
  }, [saldoTotal, juros, multa, desconto]);

  const somaParcelas = useMemo(
    () => parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0),
    [parcelas],
  );

  const diferenca = Number((valorRenegociado - somaParcelas).toFixed(2));
  const valido = Math.abs(diferenca) <= 0.01 && motivo.trim().length >= 3 && valorRenegociado > 0;

  // Gera parcelas automaticamente quando muda qtd / primeira data / valor total
  const gerarParcelas = () => {
    const qtd = Math.max(1, Math.min(60, qtdParcelas));
    const base = Math.floor((valorRenegociado / qtd) * 100) / 100;
    const sobra = Number((valorRenegociado - base * qtd).toFixed(2));
    const novas: ParcelaForm[] = [];
    for (let i = 0; i < qtd; i++) {
      const v = i === 0 ? base + sobra : base;
      novas.push({
        vencimento: addMonths(primeiraVenc, i),
        valor: v.toFixed(2),
      });
    }
    setParcelas(novas);
  };

  useEffect(() => {
    if (open) {
      setMotivo("");
      setObservacao("");
      setJuros("0");
      setMulta("0");
      setDesconto("0");
      setQtdParcelas(1);
      setPrimeiraVenc(todayPlus(30));
      setParcelas([{ vencimento: todayPlus(30), valor: saldoTotal.toFixed(2) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async () => {
    if (!valido) return;
    setEnviando(true);
    try {
      const { data, error } = await supabase.rpc("renegociar_titulos_lote", {
        _titulo_ids: titulos.map((t) => t.id),
        _motivo: motivo.trim(),
        _condicoes: {
          juros: Number(juros) || 0,
          multa: Number(multa) || 0,
          desconto: Number(desconto) || 0,
          observacao: observacao.trim() || null,
          parcelas: parcelas.map((p) => ({
            vencimento: p.vencimento,
            valor: Number(p.valor),
          })),
        },
      });
      if (error) throw error;
      const payload = data as { titulo_novo_id?: string };
      toast.success(
        `Acordo gerado · ${titulos.length} título(s) consolidado(s) em ${fmtBRL(valorRenegociado)}.`,
      );
      qc.invalidateQueries({ queryKey: ["titulos_financeiros"] });
      onOpenChange(false);
      if (payload?.titulo_novo_id) onSuccess?.(payload.titulo_novo_id);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao renegociar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Renegociar títulos — Acordo consolidado</DialogTitle>
          <DialogDescription>
            Os títulos selecionados serão marcados como{" "}
            <strong>RENEGOCIADO</strong> e substituídos por um novo título
            consolidado com as parcelas abaixo. Operação auditada e rastreável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Resumo dos títulos */}
          <div className="rounded border">
            <div className="border-b bg-muted/40 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {titulos.length} título(s) selecionado(s) · Saldo total{" "}
              <span className="font-mono text-foreground">{fmtBRL(saldoTotal)}</span>
            </div>
            <div className="max-h-32 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titulos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.codigo ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.vencimento ? new Date(t.vencimento).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(t.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Motivo + ajustes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-4">
              <Label className="text-xs">Motivo da renegociação *</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: Cliente solicitou consolidação por dificuldade de fluxo de caixa."
                rows={2}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Juros (R$)</Label>
              <Input value={juros} onChange={(e) => setJuros(e.target.value)} type="number" min="0" step="0.01" className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Multa (R$)</Label>
              <Input value={multa} onChange={(e) => setMulta(e.target.value)} type="number" min="0" step="0.01" className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Desconto (R$)</Label>
              <Input value={desconto} onChange={(e) => setDesconto(e.target.value)} type="number" min="0" step="0.01" className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Valor renegociado</Label>
              <Input value={fmtBRL(valorRenegociado)} readOnly className="h-8 font-mono bg-muted/40" />
            </div>
          </div>

          {/* Gerador de parcelas */}
          <div className="rounded border p-2 bg-muted/20">
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">Nº de parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={qtdParcelas}
                  onChange={(e) => setQtdParcelas(Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 w-20"
                />
              </div>
              <div>
                <Label className="text-xs">1º vencimento</Label>
                <Input
                  type="date"
                  value={primeiraVenc}
                  onChange={(e) => setPrimeiraVenc(e.target.value)}
                  className="h-8"
                />
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={gerarParcelas}>
                Gerar parcelas
              </Button>
            </div>
          </div>

          {/* Tabela de parcelas editáveis */}
          <div className="rounded border">
            <div className="border-b bg-muted/40 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
              <span>Parcelas do novo título</span>
              <span className={diferenca === 0 ? "text-success" : "text-destructive"}>
                Soma: <span className="font-mono">{fmtBRL(somaParcelas)}</span>
                {diferenca !== 0 && (
                  <span className="ml-2">· Dif: {fmtBRL(Math.abs(diferenca))}</span>
                )}
              </span>
            </div>
            <div className="max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={p.vencimento}
                          onChange={(e) => {
                            const v = e.target.value;
                            setParcelas((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, vencimento: v } : x)),
                            );
                          }}
                          className="h-7"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={p.valor}
                          onChange={(e) => {
                            const v = e.target.value;
                            setParcelas((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, valor: v } : x)),
                            );
                          }}
                          className="h-7 text-right font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={parcelas.length === 1}
                          onClick={() => setParcelas((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t p-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setParcelas((prev) => [
                    ...prev,
                    {
                      vencimento: addMonths(prev[prev.length - 1]?.vencimento ?? primeiraVenc, 1),
                      valor: "0",
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar parcela
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {!valido && (
            <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {motivo.trim().length < 3
                ? "Informe um motivo com pelo menos 3 caracteres."
                : valorRenegociado <= 0
                ? "Desconto excede o saldo. Reduza o desconto."
                : `Soma das parcelas deve igualar ${fmtBRL(valorRenegociado)} (diferença: ${fmtBRL(Math.abs(diferenca))}).`}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={!valido || enviando}>
            {enviando ? "Renegociando…" : `Confirmar acordo (${fmtBRL(valorRenegociado)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
