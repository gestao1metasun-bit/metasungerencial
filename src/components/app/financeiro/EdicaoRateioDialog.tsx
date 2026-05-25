// Edição de rateio de um título financeiro.
// Replica a tela do sistema de referência: modo Normal x Importação,
// N rateios com Valor / Centro de custo / Natureza / Tipo de título,
// "Mais campos" expande O.S, Código de projeto e Observação.
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCentrosCustoFin } from "@/lib/fin-centros-custo-store";
import { useNaturezasFin } from "@/lib/fin-naturezas-store";
import { setRateios, apagarRateios, type Rateio, type Titulo } from "@/lib/fin-titulos-store";

type Modo = "Normal" | "Importação";

const TIPOS_TITULO = ["BOLETO BANCÁRIO", "PIX", "TRANSFERÊNCIA", "DINHEIRO", "CARTÃO", "DÉBITO AUTOMÁTICO", "CHEQUE"];

function novoRateio(valor = 0): Rateio {
  return {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    valor,
  };
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EdicaoRateioDialog({
  titulo,
  open,
  onOpenChange,
}: {
  titulo: Titulo | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const centros = useCentrosCustoFin();
  const naturezas = useNaturezasFin();

  const [modo, setModo] = useState<Modo>("Normal");
  const [rows, setRows] = useState<Rateio[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [importTxt, setImportTxt] = useState("");

  // Sincroniza quando abre / muda o título
  useEffect(() => {
    if (!titulo) return;
    if (titulo.rateios && titulo.rateios.length > 0) {
      setRows(titulo.rateios.map((r) => ({ ...r })));
    } else {
      // Inicializa com 1 linha pegando o valor do título
      setRows([{ ...novoRateio(titulo.valorOriginal),
        centroCustoId: titulo.centroCustoId, centroCusto: titulo.centroCusto,
        naturezaId: titulo.naturezaId, natureza: titulo.natureza,
      }]);
    }
    setModo("Normal");
    setExpandidos({});
    setImportTxt("");
  }, [titulo?.id, open]);

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.valor) || 0), 0), [rows]);
  const valorTitulo = titulo?.valorOriginal ?? 0;
  const diff = Math.round((total - valorTitulo) * 100) / 100;

  if (!titulo) return null;

  function updateRow(idx: number, patch: Partial<Rateio>) {
    setRows((cur) => cur.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRow(idx: number) {
    setRows((cur) => cur.filter((_, i) => i !== idx));
  }
  function addRow() {
    const restante = Math.max(0, Math.round((valorTitulo - total) * 100) / 100);
    setRows((cur) => [...cur, novoRateio(restante)]);
  }
  function distribuirIgual() {
    if (rows.length === 0) return;
    const fatia = Math.floor((valorTitulo / rows.length) * 100) / 100;
    const resto = Math.round((valorTitulo - fatia * rows.length) * 100) / 100;
    setRows((cur) => cur.map((r, i) => ({ ...r, valor: i === 0 ? fatia + resto : fatia })));
  }
  function ajustarUltimo() {
    if (rows.length === 0) return;
    const soma = rows.slice(0, -1).reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const ultimo = Math.round((valorTitulo - soma) * 100) / 100;
    setRows((cur) => cur.map((r, i) => (i === cur.length - 1 ? { ...r, valor: ultimo } : r)));
  }

  function parseImportacao() {
    // Formato esperado por linha: valor;centroCusto;natureza;tipoTitulo;os;codProjeto;observacao
    // (campos a partir de "tipoTitulo" são opcionais)
    const lines = importTxt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const next: Rateio[] = [];
    for (const line of lines) {
      const [valor, cc, nat, tipo, os, cod, obs] = line.split(/[;\t]/).map((s) => s?.trim() ?? "");
      const v = Number(String(valor).replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(v)) continue;
      const ccMatch = centros.find((c) => c.nome === cc || c.codigo === cc || c.id === cc);
      const natMatch = naturezas.find((n) => n.nome === nat || n.codigo === nat || n.id === nat);
      next.push({
        ...novoRateio(v),
        centroCustoId: ccMatch?.id, centroCusto: ccMatch?.nome ?? cc,
        naturezaId: natMatch?.id, natureza: natMatch?.nome ?? nat,
        tipoTitulo: tipo || undefined,
        ordemServico: os || undefined,
        codigoProjeto: cod || undefined,
        observacao: obs || undefined,
      });
    }
    if (next.length === 0) {
      toast.error("Nenhuma linha válida encontrada.");
      return;
    }
    setRows(next);
    setModo("Normal");
    toast.success(`${next.length} rateio(s) importado(s).`);
  }

  function handleSalvar() {
    try {
      setRateios(titulo.id, rows);
      toast.success("Rateio salvo.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar rateio.");
    }
  }
  function handleApagar() {
    try {
      apagarRateios(titulo.id);
      toast.success("Rateio removido.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao apagar rateio.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edição de rateio</DialogTitle>
        </DialogHeader>

        {/* Informações do título */}
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações do título</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-3">
            <div><span className="text-muted-foreground">Número:</span> <span className="font-mono">{titulo.id}</span></div>
            <div><span className="text-muted-foreground">Valor:</span> <span className="font-semibold">{brl(titulo.valorOriginal)}</span></div>
            <div><span className="text-muted-foreground">Vencimento:</span> {titulo.vencimento}</div>
            <div><span className="text-muted-foreground">Centro de custo:</span> {titulo.centroCusto || "—"}</div>
            <div><span className="text-muted-foreground">Natureza:</span> {titulo.natureza || "—"}</div>
            <div><span className="text-muted-foreground">{titulo.tipo === "AP" ? "Fornecedor" : "Cliente"}:</span> {titulo.fornecedor ?? titulo.cliente ?? "—"}</div>
          </div>
        </div>

        {/* Modo */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-semibold">Modo de inclusão:</Label>
          <div className="inline-flex rounded-md border bg-background p-0.5">
            {(["Normal", "Importação"] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                  modo === m ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {modo === "Normal" && (
            <>
              <div className="ml-auto flex items-center gap-2 text-sm">
                <Label className="text-sm">Número de rateios:</Label>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded border bg-background px-2 font-mono text-sm">{rows.length}</span>
                <Button variant="ghost" size="sm" onClick={distribuirIgual} type="button">Distribuir igualmente</Button>
                <Button variant="ghost" size="sm" onClick={ajustarUltimo} type="button">Ajustar último</Button>
              </div>
            </>
          )}
        </div>

        {modo === "Importação" ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Cole 1 rateio por linha. Campos separados por ";" ou TAB:
              <span className="ml-1 font-mono">valor;centroCusto;natureza;tipoTitulo;O.S;codProjeto;observacao</span>
            </Label>
            <Textarea
              rows={8}
              value={importTxt}
              onChange={(e) => setImportTxt(e.target.value)}
              className="font-mono text-xs"
              placeholder={"500,00;Engenharia;Material aplicado em obra;BOLETO BANCÁRIO;OS-123;PRJ-9;Linha A\n300,00;Comercial;Comissões;PIX;;;\n"}
            />
            <div className="flex justify-end">
              <Button type="button" onClick={parseImportacao}>Importar para Normal</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, idx) => {
              const open = !!expandidos[r.id];
              return (
                <div key={r.id} className="rounded-lg border bg-background p-3">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-2">
                      <Label className="text-xs">Valor *</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={r.valor}
                        onChange={(e) => updateRow(idx, { valor: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <Label className="text-xs">Centro de custo *</Label>
                      <Select
                        value={r.centroCustoId ?? ""}
                        onValueChange={(v) => {
                          const c = centros.find((x) => x.id === v);
                          updateRow(idx, { centroCustoId: v, centroCusto: c?.nome });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {centros.filter((c) => c.ativo).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-xs">Natureza *</Label>
                      <Select
                        value={r.naturezaId ?? ""}
                        onValueChange={(v) => {
                          const n = naturezas.find((x) => x.id === v);
                          updateRow(idx, { naturezaId: v, natureza: n?.nome });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {naturezas.filter((n) => n.ativo).map((n) => (
                            <SelectItem key={n.id} value={n.id}>{n.codigo} — {n.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-10 md:col-span-2">
                      <Label className="text-xs">Tipo de título *</Label>
                      <Select
                        value={r.tipoTitulo ?? ""}
                        onValueChange={(v) => updateRow(idx, { tipoTitulo: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_TITULO.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-end justify-end">
                      <Button size="icon" variant="destructive" type="button" onClick={() => removeRow(idx)} title="Remover rateio">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandidos((cur) => ({ ...cur, [r.id]: !cur[r.id] }))}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {open ? "Menos campos" : "Mais campos"}
                  </button>

                  {open && (
                    <div className="mt-2 grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-4">
                        <Label className="text-xs">O.S</Label>
                        <Input
                          value={r.ordemServico ?? ""}
                          onChange={(e) => updateRow(idx, { ordemServico: e.target.value })}
                          placeholder="Ex: OS-123 - Cliente / descritivo"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <Label className="text-xs">Código de projeto</Label>
                        <Input
                          value={r.codigoProjeto ?? ""}
                          onChange={(e) => updateRow(idx, { codigoProjeto: e.target.value })}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <Label className="text-xs">Observação</Label>
                        <Input
                          value={r.observacao ?? ""}
                          onChange={(e) => updateRow(idx, { observacao: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <Button type="button" variant="outline" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar rateio
            </Button>
          </div>
        )}

        <DialogFooter className="!flex-col sm:!flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Total dos rateios:</span>{" "}
            <span className={`font-semibold ${Math.abs(diff) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>
              {brl(total)}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              (título: {brl(valorTitulo)}{Math.abs(diff) >= 0.01 && <> · diferença: <span className="text-rose-600">{brl(diff)}</span></>})
            </span>
          </div>
          <div className="flex gap-2">
            {titulo.rateios && titulo.rateios.length > 0 && (
              <Button variant="outline" type="button" onClick={handleApagar}>Apagar rateio</Button>
            )}
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={handleSalvar} disabled={rows.length === 0 || Math.abs(diff) >= 0.01}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
