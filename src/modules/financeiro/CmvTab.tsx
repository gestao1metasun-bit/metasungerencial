// ============================================================================
// CMV — Custo de Mercadoria Vendida por Obra
// Lê movimentos de saída do estoque-store e compras vinculadas a títulos AP.
// ============================================================================
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstoqueState, cmvPorObra, valorEstoqueTotal, registrarSaidaObra } from "@/lib/estoque-store";
import {
  useFinanceiroRepo, useRepoCompras, useRepoTitulos, useRepoFornecedores,
} from "@/hooks/useRepoFinanceiro";
import { useObrasSnapshot } from "@/lib/obras-snapshot-store";
import type { ItemCompra } from "@/lib/fin-compras-store";
import { fmtBRLPrecise } from "@/lib/financeiro-store";
import { StatCard } from "@/components/app/StatCard";
import { Boxes, TrendingDown, Package, ShoppingCart, Plus, CheckCircle2, XCircle, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/app/confirm-dialog";

function fmtDT(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

export function CmvTab() {
  const repo = useFinanceiroRepo();
  const { itens, movimentos } = useEstoqueState();
  const compras = useRepoCompras();
  const titulos = useRepoTitulos();

  const linhasCmv = useMemo(() => cmvPorObra(), [movimentos]);
  const valorEstoque = useMemo(() => valorEstoqueTotal(), [itens]);
  const totalCmv = linhasCmv.reduce((s, l) => s + l.cmvTotal, 0);

  const comprasAbertas = compras.filter((c) => c.status === "Aberta");
  const comprasEstocadas = compras.filter((c) => c.status === "Estocada");
  const totalComprado = compras
    .filter((c) => c.status !== "Cancelada")
    .reduce((s, c) => s + c.valorTotal, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Boxes} label="Valor em estoque" value={fmtBRLPrecise(valorEstoque)}
          hint="Qtd × Custo médio ponderado" />
        <StatCard icon={TrendingDown} label="CMV acumulado" value={fmtBRLPrecise(totalCmv)}
          hint="Saídas para obras (custo médio)" />
        <StatCard icon={ShoppingCart} label="Total comprado" value={fmtBRLPrecise(totalComprado)}
          hint={`${compras.length} compras registradas`} />
        <StatCard icon={Package} label="Compras a estocar" value={String(comprasAbertas.length)}
          hint={`${comprasEstocadas.length} já estocadas`} />
      </div>

      <Card className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">CMV por obra</h3>
          <p className="text-xs text-muted-foreground">Custo total das saídas de materiais por obra, valorizado ao custo médio do estoque no momento de cada saída.</p>
        </div>
        {linhasCmv.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Nenhuma saída para obra registrada ainda.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Itens (mov.)</TableHead>
                <TableHead className="text-right">CMV</TableHead>
                <TableHead>Última saída</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasCmv.map((l) => (
                <TableRow key={l.obraId}>
                  <TableCell className="font-mono text-xs">{l.obraId}</TableCell>
                  <TableCell>{l.cliente || "—"}</TableCell>
                  <TableCell className="text-right">{l.itens}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRLPrecise(l.cmvTotal)}</TableCell>
                  <TableCell className="text-xs">{fmtDT(l.ultimaSaida)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Compras &amp; vínculo com Financeiro</h3>
            <p className="text-xs text-muted-foreground">Lotes de compra (NF) — Aberta = aguardando entrada no estoque; Estocada = já compõe custo médio.</p>
          </div>
          <div className="flex gap-2">
            <NovaCompraDialog />
            <SaidaObraDialog />
          </div>
        </div>
        {compras.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Nenhuma compra registrada. Cadastre títulos a pagar com itens para iniciar o rastreio.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compra</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Título AP</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.slice(0, 100).map((c) => {
                const titulo = titulos.find((t) => t.id === c.tituloId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.id}</TableCell>
                    <TableCell>{c.numeroNF || "—"}</TableCell>
                    <TableCell>{c.fornecedorNome || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{titulo ? titulo.id : (c.tituloId || "—")}</TableCell>
                    <TableCell>
                      {c.itens.map((i) => {
                        const it = itens.find((x) => x.id === i.itemId);
                        return (
                          <div key={i.itemId} className="text-xs">
                            {i.qtd}× {it?.nome ?? i.itemId} <span className="text-muted-foreground">@ {fmtBRLPrecise(i.custoUnit)}</span>
                          </div>
                        );
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRLPrecise(c.valorTotal)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "Estocada" ? "default" : c.status === "Cancelada" ? "secondary" : "outline"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {c.status === "Aberta" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 px-2"
                            onClick={async () => {
                              try {
                                const ok = await repo.estocarCompra(c.id);
                                if (ok) toast.success(`Compra ${c.id} estocada`);
                                else toast.error("Falha ao estocar");
                              } catch (e: any) { toast.error(e?.message ?? "Falha ao estocar"); }
                            }}>
                            <ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Estocar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                            onClick={async () => { const ok = await confirmDialog({ title: "Cancelar compra?", description: `Cancelar compra ${c.id}? Esta ação não pode ser desfeita.`, confirmText: "Cancelar compra", cancelText: "Voltar", destructive: true }); if (ok) { try { await repo.cancelarCompra(c.id); } catch (e: any) { toast.error(e?.message ?? "Erro."); } } }}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {c.status === "Estocada" && (
                        <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> ok
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Últimos movimentos de estoque</h3>
        {movimentos.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Nenhum movimento registrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Vínculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentos.slice(0, 50).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{fmtDT(m.em)}</TableCell>
                  <TableCell>
                    <Badge variant={m.tipo === "Entrada" ? "default" : m.tipo === "Saída" ? "destructive" : "secondary"}>
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.itemNome}</TableCell>
                  <TableCell className="text-right">{m.qtd}</TableCell>
                  <TableCell className="text-right">{fmtBRLPrecise(m.custoUnit)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRLPrecise(m.custoTotal)}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {m.compraId ? `Compra ${m.compraId}` : m.obraId ? `Obra ${m.obraId}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

/* ============================================================ */
/* Dialog: Nova compra                                          */
/* ============================================================ */
function NovaCompraDialog() {
  const [open, setOpen] = useState(false);
  const { itens } = useEstoqueState();
  const repo = useFinanceiroRepo();
  const fornecedores = useRepoFornecedores();
  const titulos = useRepoTitulos();
  const titulosAP = titulos.filter((t) => t.tipo === "AP");

  const [numeroNF, setNumeroNF] = useState("");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [tituloId, setTituloId] = useState<string>("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [linhas, setLinhas] = useState<ItemCompra[]>([{ itemId: itens[0]?.id ?? "", qtd: 1, custoUnit: 0 }]);

  const total = linhas.reduce((s, l) => s + l.qtd * l.custoUnit, 0);

  function addLinha() { setLinhas([...linhas, { itemId: itens[0]?.id ?? "", qtd: 1, custoUnit: 0 }]); }
  function rmLinha(i: number) { setLinhas(linhas.filter((_, idx) => idx !== i)); }
  function upd(i: number, patch: Partial<ItemCompra>) {
    setLinhas(linhas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function salvar(estocarAgora: boolean) {
    const valid = linhas.filter((l) => l.itemId && l.qtd > 0);
    if (valid.length === 0) { toast.error("Adicione ao menos um item"); return; }
    const f = fornecedores.find((x) => x.id === fornecedorId);
    const t = titulosAP.find((x) => x.id === tituloId);
    const c = await repo.criarCompra({
      numeroNF: numeroNF || undefined,
      fornecedorId: fornecedorId || undefined,
      fornecedorNome: f?.nome,
      tituloId: tituloId || undefined,
      data,
      itens: valid,
      observacao: t ? `Vinculada ao título ${t.id}` : undefined,
    });
    if (estocarAgora) await repo.estocarCompra(c.id);
    toast.success(`Compra ${c.id} criada${estocarAgora ? " e estocada" : ""}`);
    setOpen(false);
    setLinhas([{ itemId: itens[0]?.id ?? "", qtd: 1, custoUnit: 0 }]);
    setNumeroNF(""); setFornecedorId(""); setTituloId("");
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Nova compra</Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova compra de material</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>NF</Label><Input value={numeroNF} onChange={(e) => setNumeroNF(e.target.value)} placeholder="ex.: 1234" /></div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div>
            <Label>Fornecedor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título AP vinculado (opcional)</Label>
            <Select value={tituloId} onValueChange={setTituloId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {titulosAP.slice(0, 50).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.id} — {t.descricao} ({fmtBRLPrecise(t.valorOriginal)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Itens</Label>
            <Button size="sm" variant="ghost" onClick={addLinha}><Plus className="h-3.5 w-3.5 mr-1" /> Linha</Button>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
            {linhas.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_120px_36px] gap-2 items-end">
                <div>
                  <Select value={l.itemId} onValueChange={(v) => upd(i, { itemId: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {itens.map((it) => <SelectItem key={it.id} value={it.id}>{it.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="number" min={0} value={l.qtd} onChange={(e) => upd(i, { qtd: Number(e.target.value) || 0 })} />
                <Input type="number" min={0} step="0.01" value={l.custoUnit} onChange={(e) => upd(i, { custoUnit: Number(e.target.value) || 0 })} placeholder="R$/unid" />
                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => rmLinha(i)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right text-sm font-semibold">
            Total: {fmtBRLPrecise(total)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="secondary" onClick={() => salvar(false)}>Salvar como Aberta</Button>
          <Button onClick={() => salvar(true)}>Salvar e estocar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/* Dialog: Saída para obra (gera CMV)                           */
/* ============================================================ */
function SaidaObraDialog() {
  const [open, setOpen] = useState(false);
  const { itens } = useEstoqueState();
  const obras = useObrasSnapshot();
  const obrasAtivas = useMemo(
    () => obras.filter((o) => o.status !== "Concluída" && o.status !== "Cancelada"),
    [obras],
  );
  const [obraId, setObraId] = useState("");
  const [cliente, setCliente] = useState("");
  const [linhas, setLinhas] = useState<Array<{ itemId: string; qtd: number }>>([
    { itemId: itens[0]?.id ?? "", qtd: 1 },
  ]);

  function addLinha() { setLinhas([...linhas, { itemId: itens[0]?.id ?? "", qtd: 1 }]); }
  function rmLinha(i: number) { setLinhas(linhas.filter((_, idx) => idx !== i)); }
  function upd(i: number, patch: Partial<{ itemId: string; qtd: number }>) {
    setLinhas(linhas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function onSelectObra(id: string) {
    setObraId(id);
    const o = obras.find((x) => x.id === id);
    if (o?.cliente) setCliente(o.cliente);
  }

  function salvar() {
    if (!obraId.trim()) { toast.error("Selecione a obra"); return; }
    const valid = linhas.filter((l) => l.itemId && l.qtd > 0);
    if (valid.length === 0) { toast.error("Adicione ao menos um item"); return; }
    const r = registrarSaidaObra(obraId.trim(), cliente.trim(), valid);
    if (!r.ok) { toast.error(`Saída falhou. Faltam: ${r.faltantes.join(", ")}`); return; }
    toast.success(`Saída registrada — CMV ${fmtBRLPrecise(r.cmvTotal)}`);
    if (r.faltantes.length) toast.warning(`Itens parciais: ${r.faltantes.join(", ")}`);
    setOpen(false);
    setLinhas([{ itemId: itens[0]?.id ?? "", qtd: 1 }]);
    setObraId(""); setCliente("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><TrendingDown className="h-4 w-4 mr-1" /> Saída p/ obra</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Saída de material para obra (gera CMV)</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Obra</Label>
            <Select value={obraId} onValueChange={onSelectObra}>
              <SelectTrigger className="h-9"><SelectValue placeholder={obrasAtivas.length ? "Selecione a obra…" : "Nenhuma obra ativa"} /></SelectTrigger>
              <SelectContent>
                {obrasAtivas.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.id} · {o.cliente} {o.contrato ? `· ${o.contrato}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Cliente</Label><Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Auto-preenchido pela obra" /></div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Itens</Label>
            <Button size="sm" variant="ghost" onClick={addLinha}><Plus className="h-3.5 w-3.5 mr-1" /> Linha</Button>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
            {linhas.map((l, i) => {
              const it = itens.find((x) => x.id === l.itemId);
              const cm = it?.custoMedio ?? 0;
              const disp = it?.qtdAtual ?? 0;
              return (
                <div key={i} className="grid grid-cols-[1fr_80px_120px_36px] gap-2 items-end">
                  <div>
                    <Select value={l.itemId} onValueChange={(v) => upd(i, { itemId: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {itens.map((it) => <SelectItem key={it.id} value={it.id}>{it.nome} (est. {it.qtdAtual})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input type="number" min={0} max={disp} value={l.qtd} onChange={(e) => upd(i, { qtd: Number(e.target.value) || 0 })} />
                  <div className="text-xs text-muted-foreground h-9 flex items-center">
                    CMV {fmtBRLPrecise(cm * l.qtd)}
                  </div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => rmLinha(i)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar}>Registrar saída</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
