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
import { useCompras, criarCompra, estocarCompra, cancelarCompra, type ItemCompra } from "@/lib/fin-compras-store";
import { useTitulos } from "@/lib/fin-titulos-store";
import { useFornecedores } from "@/lib/fin-fornecedores-store";
import { fmtBRLPrecise } from "@/lib/financeiro-store";
import { StatCard } from "@/components/app/StatCard";
import { Boxes, TrendingDown, Package, ShoppingCart, Plus, CheckCircle2, XCircle, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";

function fmtDT(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

export function CmvTab() {
  const { itens, movimentos } = useEstoqueState();
  const compras = useCompras();
  const titulos = useTitulos();

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
                            onClick={() => {
                              if (estocarCompra(c.id)) toast.success(`Compra ${c.id} estocada`);
                              else toast.error("Falha ao estocar");
                            }}>
                            <ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Estocar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                            onClick={() => { if (confirm(`Cancelar compra ${c.id}?`)) cancelarCompra(c.id); }}>
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
