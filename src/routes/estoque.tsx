import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package, ShoppingCart, Truck, AlertTriangle, CheckCircle2, Lock, Plus, Trash2, ListChecks,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTabFromHash } from "@/lib/route-tabs";
import { useIsAdmin } from "@/lib/auth-store";
import { EnterpriseRecordToolbar, RowActions, ModuloHistoricoDrawer } from "@/components/app/enterprise";
import { ribbonRm, layoutBarRm } from "@/components/app/enterprise/rm-ribbon-presets";
import { exportToCSV } from "@/components/app/grid/EnterpriseDataGrid";
import {
  useEstoqueState, setEstoqueAtual, upsertEstoqueItem, removeEstoqueItem,
  setSelecionadaCompra, marcarEntrega, isMaterialEntregueTotal,
  calcularNecessidadeCompra, findItem,
  reservarMaterial, liberarReserva, registrarDevolucaoObra, disponivelParaReserva,
  type EstoqueItem, type Categoria, type Unidade,
} from "@/lib/estoque-store";
import {
  useComprasTransito, addCompraTransito, removeCompraTransito, totalTransitoPorItem,
} from "@/lib/compras-transito-store";
import { resetarESimular } from "@/lib/dev-seed";

export const Route = createFileRoute("/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Meta Sun Gerencial" }] }),
  component: EstoquePage,
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { const d = new Date(iso); return d.toLocaleString("pt-BR"); } catch { return "—"; }
}

/* ───────── Strip operacional denso (Almoxarifado) ───────── */
function Chip({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "warn" | "danger" | "success" }) {
  const toneClass: Record<string, string> = {
    default: "text-foreground",
    warn:    "text-amber-700 dark:text-amber-400",
    danger:  "text-destructive",
    success: "text-emerald-700 dark:text-emerald-400",
  };
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/70 bg-background">
      <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-[12px] font-semibold tabular-nums ${toneClass[tone]}`}>{value}</span>
    </div>
  );
}

function EstoqueStrip() {
  const st = useEstoqueState();
  const transito = useComprasTransito();
  const obrasAtivas = st.necessidades.filter((n) => !n.arquivada);
  const selecionadas = obrasAtivas.filter((n) => n.selecionadaCompra);
  const linhas = calcularNecessidadeCompra(st);
  const aComprar = linhas.reduce((s, l) => s + l.aComprar, 0);
  const obrasOK = obrasAtivas.filter(isMaterialEntregueTotal).length;
  const totalReservado = st.itens.reduce((s, i) => s + (i.qtdReservada || 0), 0);
  const totalDisponivel = st.itens.reduce((s, i) => s + Math.max(0, (i.qtdAtual || 0) - (i.qtdReservada || 0)), 0);
  const transitoQtd = transito.reduce((s, c) => s + (c.qtd || 0), 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-border/70 bg-muted/30 px-2 py-1 text-[11.5px]">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground mr-1">Almoxarifado</span>
      <Chip label="SKU" value={st.itens.length} />
      <Chip label="Disp." value={totalDisponivel} tone="success" />
      <Chip label="Reserv." value={totalReservado} />
      <Chip label="Trânsito" value={transitoQtd} />
      <span className="mx-1 h-4 w-px bg-border/70" />
      <Chip label="Obras ativas" value={obrasAtivas.length} />
      <Chip label="Sel. compra" value={selecionadas.length} />
      <Chip label="Mat. entregue" value={`${obrasOK}/${obrasAtivas.length}`} tone="success" />
      <Chip label="A comprar" value={aComprar} tone={aComprar > 0 ? "warn" : "default"} />
    </div>
  );
}

function EstoquePage() {
  const [tab, setTab] = useTabFromHash("/estoque");
  const isAdmin = useIsAdmin();
  const podeEntregar = isAdmin;
  const podeAjustarEstoque = isAdmin;
  const st = useEstoqueState();
  const [histOpen, setHistOpen] = useState(false);

  // D16.PERF P2.1 — first-list.ready (estoque)
  useEffect(() => {
    void import("@/lib/perf").then((m) => m.reportFirstListReady("estoque.itens"));
  }, []);

  const onExportar = () => {
    try {
      exportToCSV("estoque-itens", st.itens, [
        { key: "id", label: "Código" },
        { key: "nome", label: "Item" },
        { key: "categoria", label: "Categoria" },
        { key: "unidade", label: "Unidade" },
        { key: "qtdAtual", label: "Qtd" },
        { key: "qtdReservada", label: "Reservada" },
        { key: "custoMedio", label: "Custo Médio" },
      ]);
      toast.success("Exportado.");
    } catch { toast.error("Falha ao exportar."); }
  };

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle="Almoxarifado · necessidade · compras · reservas · entregas · rastreabilidade."
      />

      <div className="mb-2"><EstoqueStrip /></div>

      <div className="mb-2">
        <EnterpriseRecordToolbar
          entityType="estoque"
          selectedIds={[]}
          availableActions={["novo", "editar", "cancelar", "atualizar", "anexos", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
          searchPlaceholder="Buscar item, código, categoria…"
          statusActions={ribbonRm({
            visualizar: () => setTab("itens"),
          })}
          layoutBar={layoutBarRm()}
          onAction={(a) => {
            if (a === "novo") setTab("itens");
            else if (a === "editar") setTab("itens");
            else if (a === "cancelar") toast.info("Cancelamento de movimento requer seleção em Movimentos / Entregas.");
            else if (a === "atualizar") window.location.reload();
            else if (a === "exportar") onExportar();
            else if (a === "imprimir") window.print();
            else if (a === "historico") setHistOpen(true);
            else if (a === "anexos") toast.info("Anexos universais chegam em D17.UI.4b.");
            else if (a === "colunas") toast.info("Gestor de colunas chega em D17.UI.4.");
            else if (a === "filtroAvancado") toast.info("Filtros avançados chegam em D17.UI.4.");
          }}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-7 p-0.5 gap-0.5 bg-muted/40 border border-border/70 rounded">
          <TabsTrigger value="dashboard" className="h-6 px-2 text-[11.5px]">Resumo</TabsTrigger>
          <TabsTrigger value="obras" className="h-6 px-2 text-[11.5px]">Obras / Reservas</TabsTrigger>
          <TabsTrigger value="compra" className="h-6 px-2 text-[11.5px]">Compras</TabsTrigger>
          <TabsTrigger value="itens" className="h-6 px-2 text-[11.5px]">Produtos / Saldos</TabsTrigger>
          <TabsTrigger value="entregas" className="h-6 px-2 text-[11.5px]">Movimentos / Entregas</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-2"><DashboardTab /></TabsContent>
        <TabsContent value="obras" className="mt-2"><ObrasTab podeEntregar={podeEntregar} /></TabsContent>
        <TabsContent value="compra" className="mt-2"><CompraTab /></TabsContent>
        <TabsContent value="itens" className="mt-2"><ItensTab podeAjustar={podeAjustarEstoque} /></TabsContent>
        <TabsContent value="entregas" className="mt-2"><EntregasTab /></TabsContent>
      </Tabs>

      <ModuloHistoricoDrawer
        open={histOpen}
        onOpenChange={setHistOpen}
        titulo="Estoque"
        modulos={["estoque"]}
      />
    </>
  );
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */

function DashboardTab() {
  const st = useEstoqueState();
  const linhas = calcularNecessidadeCompra(st);
  const sku = st.itens.length;

  return (
    <div className="space-y-2">

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4 text-amber-600" /> Próximas compras (consolidado)
        </div>
        {linhas.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhuma obra selecionada para compra. Vá em <b>Obras (necessidade)</b> e marque as obras a comprar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Necessidade</TableHead>
                <TableHead className="text-right">Entregue</TableHead>
                <TableHead className="text-right">Em estoque</TableHead>
                <TableHead className="text-right">A comprar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const item = findItem(st.itens, l.itemId);
                return (
                  <TableRow key={l.itemId}>
                    <TableCell>{item?.nome ?? l.itemId}</TableCell>
                    <TableCell className="text-right">{l.necessidadeTotal}</TableCell>
                    <TableCell className="text-right">{l.jaEntregue}</TableCell>
                    <TableCell className="text-right">{l.estoqueAtual}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-700">{l.aComprar}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="mt-3 text-xs text-muted-foreground">SKUs cadastrados: {sku}</div>
      </Card>
    </div>
  );
}

/* ─────────────────────────── OBRAS (NECESSIDADE) ─────────────────────────── */

function ObrasTab({ podeEntregar }: { podeEntregar: boolean }) {
  const st = useEstoqueState();
  const obras = st.necessidades.filter((n) => !n.arquivada);
  const [obraSel, setObraSel] = useState<string | null>(null);

  if (obras.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Nenhuma obra elegível. Obras só aparecem aqui quando entram na fase de
        cronograma na Engenharia.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[420px_1fr]">
      <Card className="p-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">OBRAS ATIVAS</div>
        <div className="space-y-1.5">
          {obras.map((n) => {
            const ok = isMaterialEntregueTotal(n);
            return (
              <button
                key={n.obraId}
                onClick={() => setObraSel(n.obraId)}
                className={`flex w-full items-center justify-between rounded border p-2 text-left text-sm hover:bg-muted/50 ${obraSel === n.obraId ? "ring-1 ring-primary" : ""}`}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{n.cliente}</div>
                  <div className="text-[11px] text-muted-foreground">Contrato {n.contratoId}</div>
                </div>
                <div className="flex items-center gap-2">
                  {ok && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  <Checkbox
                    checked={n.selecionadaCompra}
                    onCheckedChange={(v) => setSelecionadaCompra(n.obraId, !!v)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Selecionar para compra"
                  />
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          O checkbox define se a obra entra no cálculo de <b>Necessidade de Compra</b>.
        </div>
      </Card>

      <Card className="p-4">
        {obraSel ? (
          <ObraDetalhe obraId={obraSel} podeEntregar={podeEntregar} />
        ) : (
          <div className="text-sm text-muted-foreground">
            Selecione uma obra à esquerda para ver itens, reservar, entregar e devolver material.
            <div className="mt-1 text-[11px]">
              Para a visão consolidada de compra (vários clientes), use a aba <b>Necessidade de Compra</b>.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type DlgEntrega = { kind: "entrega"; itemId: string; qtd: number; completa: boolean };
type DlgReserva = { kind: "reserva"; itemId: string; qtd: number; max: number };
type DlgLiberar = { kind: "liberar"; itemId: string; qtd: number; max: number };
type DlgDevolver = { kind: "devolver"; itemId: string; qtd: number; max: number; obs: string };
type Dlg = DlgEntrega | DlgReserva | DlgLiberar | DlgDevolver;

function ObraDetalhe({ obraId, podeEntregar }: { obraId: string; podeEntregar: boolean }) {
  const st = useEstoqueState();
  const n = st.necessidades.find((x) => x.obraId === obraId);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  if (!n) return <div className="text-sm text-muted-foreground">Obra não encontrada.</div>;

  const itemNomeAtual = dlg ? (findItem(st.itens, dlg.itemId)?.nome ?? dlg.itemId) : "";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{n.cliente}</div>
          <div className="text-[11px] text-muted-foreground">Contrato {n.contratoId} · Obra {n.obraId}</div>
        </div>
        <div className="text-xs text-muted-foreground">Atualizado: {fmtDate(n.atualizadaEm)}</div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Nec.</TableHead>
            <TableHead className="text-right">Reserv.</TableHead>
            <TableHead className="text-right">Entreg.</TableHead>
            <TableHead className="text-right">Falta</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-[260px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {n.itens.map((i) => {
            const it = findItem(st.itens, i.itemId);
            const reservada = i.qtdReservada || 0;
            const falta = Math.max(0, i.qtdNecessaria - i.qtdEntregue);
            const ok = i.entregaCompleta || falta === 0;
            const disp = disponivelParaReserva(i.itemId, obraId);
            return (
              <TableRow key={i.itemId}>
                <TableCell>
                  {it?.nome ?? i.itemId}
                  <div className="text-[10px] text-muted-foreground">disp: {disp}{it?.custoMedio ? ` · CM R$ ${it.custoMedio.toFixed(2)}` : ""}</div>
                </TableCell>
                <TableCell className="text-right">{i.qtdNecessaria}</TableCell>
                <TableCell className="text-right">{reservada}</TableCell>
                <TableCell className="text-right">{i.qtdEntregue}</TableCell>
                <TableCell className="text-right">{falta}</TableCell>
                <TableCell>
                  {ok ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Entregue
                    </span>
                  ) : i.qtdEntregue > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Parcial</span>
                  ) : reservada > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">Reservado</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Pendente</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {podeEntregar ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setDlg({ kind: "reserva", itemId: i.itemId, qtd: Math.min(disp, falta), max: disp })}>Reservar</Button>
                      {reservada > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setDlg({ kind: "liberar", itemId: i.itemId, qtd: reservada, max: reservada })}>Liberar</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setDlg({ kind: "entrega", itemId: i.itemId, qtd: i.qtdEntregue, completa: ok })}>
                        <Truck className="mr-1 h-3.5 w-3.5" /> Entregar
                      </Button>
                      {i.qtdEntregue > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setDlg({ kind: "devolver", itemId: i.itemId, qtd: i.qtdEntregue, max: i.qtdEntregue, obs: "" })}>Devolver</Button>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" /> Apenas Estoque</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dlg?.kind === "entrega" && "Registrar entrega"}
              {dlg?.kind === "reserva" && "Reservar material"}
              {dlg?.kind === "liberar" && "Liberar reserva"}
              {dlg?.kind === "devolver" && "Devolver material"}
            </DialogTitle>
          </DialogHeader>
          {dlg && (
            <div className="space-y-3">
              <div className="text-sm">Item: <b>{itemNomeAtual}</b></div>
              {dlg.kind === "entrega" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Qtd. entregue (acumulado)</Label>
                    <Input type="number" min={0} value={dlg.qtd} onChange={(e) => setDlg({ ...dlg, qtd: Number(e.target.value || 0) })} />
                    <div className="text-[11px] text-muted-foreground mt-1">Aumentar dá baixa física + CMV; diminuir gera devolução.</div>
                  </div>
                  <label className="flex items-end gap-2 pb-2">
                    <Checkbox checked={dlg.completa} onCheckedChange={(v) => setDlg({ ...dlg, completa: !!v })} />
                    <span className="text-sm">Marcar como entrega completa</span>
                  </label>
                </div>
              )}
              {(dlg.kind === "reserva" || dlg.kind === "liberar") && (
                <div>
                  <Label>Quantidade (máx {dlg.max})</Label>
                  <Input type="number" min={0} max={dlg.max} value={dlg.qtd} onChange={(e) => setDlg({ ...dlg, qtd: Number(e.target.value || 0) })} />
                </div>
              )}
              {dlg.kind === "devolver" && (
                <>
                  <div>
                    <Label>Quantidade a devolver (máx {dlg.max})</Label>
                    <Input type="number" min={1} max={dlg.max} value={dlg.qtd} onChange={(e) => setDlg({ ...dlg, qtd: Number(e.target.value || 0) })} />
                  </div>
                  <div>
                    <Label>Observação</Label>
                    <Input value={dlg.obs} onChange={(e) => setDlg({ ...dlg, obs: e.target.value })} placeholder="Motivo da devolução" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">A devolução retorna ao estoque no custo das saídas (FIFO), preservando o custo médio.</div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlg(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!dlg) return;
                if (dlg.kind === "entrega") {
                  const r = marcarEntrega(obraId, dlg.itemId, dlg.qtd, dlg.completa);
                  if (!r.ok) { toast.error(r.erro || "Falha ao registrar entrega."); return; }
                  toast.success("Entrega registrada (baixa de estoque + CMV).");
                } else if (dlg.kind === "reserva") {
                  const r = reservarMaterial(obraId, dlg.itemId, dlg.qtd);
                  if (!r.ok) { toast.error(r.erro || "Falha ao reservar."); return; }
                  toast.success(`Reservado ${dlg.qtd} un.`);
                } else if (dlg.kind === "liberar") {
                  const r = liberarReserva(obraId, dlg.itemId, dlg.qtd);
                  if (!r.ok) { toast.error(r.erro || "Falha ao liberar."); return; }
                  toast.success(`Liberado ${dlg.qtd} un.`);
                } else if (dlg.kind === "devolver") {
                  const r = registrarDevolucaoObra(obraId, dlg.itemId, dlg.qtd, "Estoque", dlg.obs);
                  if (!r.ok) { toast.error(r.erro || "Falha ao devolver."); return; }
                  toast.success(`Devolvido ${dlg.qtd} un (R$ ${(r.valor ?? 0).toFixed(2)}).`);
                }
                setDlg(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────── PAINEL DE COMPRA (seleção) ─────────────────────── */

function PainelCompraSelecao() {
  const st = useEstoqueState();
  const transito = useComprasTransito();
  const obrasSel = st.necessidades.filter((n) => n.selecionadaCompra && !n.arquivada && !isMaterialEntregueTotal(n));

  // Itens escolhidos para análise. Padrão: todos os que aparecem nas obras selecionadas.
  const itensPadrao = useMemo(() => {
    const set = new Set<string>();
    obrasSel.forEach((n) => n.itens.forEach((i) => set.add(i.itemId)));
    return Array.from(set);
  }, [obrasSel]);

  const [itensEscolhidos, setItensEscolhidos] = useState<string[] | null>(null);
  const itens = itensEscolhidos ?? itensPadrao;

  const [dlgItens, setDlgItens] = useState(false);
  const [novoMov, setNovoMov] = useState<{ itemId: string; qtd: number; fornecedor: string; obs: string } | null>(null);

  type Linha = {
    itemId: string;
    nome: string;
    necLiquida: number;     // Σ (nec - entregue) das obras selecionadas
    saldoDisp: number;      // estoque - reservado
    transito: number;       // compras feitas s/ entrada
    aComprar: number;
    porCliente: { cliente: string; nec: number; entregue: number; falta: number }[];
  };

  const linhas: Linha[] = useMemo(() => {
    return itens.map((itemId) => {
      const it = findItem(st.itens, itemId);
      const saldoDisp = Math.max(0, (it?.qtdAtual || 0) - (it?.qtdReservada || 0));
      const tr = totalTransitoPorItem(itemId, transito);
      let necLiq = 0;
      const porCliente: Linha["porCliente"] = [];
      for (const n of obrasSel) {
        const r = n.itens.find((x) => x.itemId === itemId);
        if (!r) continue;
        const falta = Math.max(0, r.qtdNecessaria - r.qtdEntregue);
        if (falta <= 0 && r.qtdNecessaria === 0) continue;
        necLiq += falta;
        porCliente.push({ cliente: n.cliente, nec: r.qtdNecessaria, entregue: r.qtdEntregue, falta });
      }
      const aComprar = Math.max(0, necLiq - saldoDisp - tr);
      return {
        itemId,
        nome: it?.nome ?? itemId,
        necLiquida: necLiq,
        saldoDisp,
        transito: tr,
        aComprar,
        porCliente,
      };
    }).sort((a, b) => b.aComprar - a.aComprar);
  }, [itens, st.itens, transito, obrasSel]);

  const totalAComprar = linhas.reduce((s, l) => s + l.aComprar, 0);
  const totalNec = linhas.reduce((s, l) => s + l.necLiquida, 0);

  if (obrasSel.length === 0) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Marque ao menos um cliente à esquerda para montar a seleção de compra.
        </div>
        <div className="text-xs text-muted-foreground">
          Você pode também clicar em uma obra para ver os detalhes individuais (reservar, entregar, devolver).
        </div>
        <div className="mt-4 rounded-md border border-dashed p-4">
          <div className="text-sm font-semibold">Sem dados ainda?</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Rode a simulação demo: <strong>apaga tudo</strong> e cria 5 clientes em estados
            diferentes (assinado/não assinado, PIX, boleto, financiamento, cartão e misto),
            com obras, financeiro, estoque inicial, entregas parciais e compra em trânsito.
          </div>
          <Button
            size="sm"
            className="mt-3"
            variant="outline"
            onClick={() => {
              if (!confirm("Apagar TODOS os dados locais e gerar 5 clientes de simulação?")) return;
              resetarESimular();
            }}
          >
            Rodar simulação (5 clientes)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-amber-600" /> Seleção de compra
          </div>
          <div className="text-[11px] text-muted-foreground">
            {obrasSel.length} cliente(s) selecionado(s) · {linhas.length} item(ns) na análise
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDlgItens(true)}>
          <ListChecks className="mr-1 h-4 w-4" /> Selecionar itens
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Clientes" value={String(obrasSel.length)} />
        <StatCard label="Itens analisados" value={String(linhas.length)} />
        <StatCard label="Necessidade líquida" value={String(totalNec)} hint="− já entregue" />
        <StatCard label="A comprar" value={String(totalAComprar)} hint="− saldo − trânsito" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Saldo disp.</TableHead>
            <TableHead className="text-right">Em trânsito</TableHead>
            <TableHead className="text-right">Nec. líquida</TableHead>
            <TableHead className="text-right">A comprar</TableHead>
            <TableHead className="text-right w-[120px]">+ Trânsito</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Nenhum item selecionado para análise.
              </TableCell>
            </TableRow>
          ) : linhas.map((l) => (
            <TableRow key={l.itemId}>
              <TableCell>
                <div className="font-medium">{l.nome}</div>
                <div className="text-[10px] text-muted-foreground">
                  {l.porCliente.map((c) => `${c.cliente}: ${c.falta}`).join(" · ") || "—"}
                </div>
              </TableCell>
              <TableCell className="text-right">{l.saldoDisp}</TableCell>
              <TableCell className="text-right">{l.transito || "—"}</TableCell>
              <TableCell className="text-right">{l.necLiquida}</TableCell>
              <TableCell className={`text-right font-semibold ${l.aComprar > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                {l.aComprar}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setNovoMov({ itemId: l.itemId, qtd: l.aComprar || 1, fornecedor: "", obs: "" })}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {transito.length > 0 && (
        <Card className="p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Compras em trânsito (sem entrada no estoque)
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Obs.</TableHead>
                <TableHead className="text-right w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transito.map((c) => {
                const it = findItem(st.itens, c.itemId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{fmtDate(c.data)}</TableCell>
                    <TableCell>{it?.nome ?? c.itemId}</TableCell>
                    <TableCell className="text-right">{c.qtd}</TableCell>
                    <TableCell className="text-xs">{c.fornecedor || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.obs || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { removeCompraTransito(c.id); toast.success("Lançamento removido."); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Ao dar entrada da NF na aba <b>Estoque atual</b>, remova o lançamento daqui para evitar duplicidade.
          </div>
        </Card>
      )}

      {/* Dialog: selecionar itens */}
      <Dialog open={dlgItens} onOpenChange={setDlgItens}>
        <DialogContent>
          <DialogHeader><DialogTitle>Itens na análise de compra</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-auto">
            {st.itens.map((it) => {
              const checked = itens.includes(it.id);
              return (
                <label key={it.id} className="flex items-center gap-2 rounded border p-2 text-sm hover:bg-muted/40">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const base = itensEscolhidos ?? itensPadrao;
                      setItensEscolhidos(v ? Array.from(new Set([...base, it.id])) : base.filter((x) => x !== it.id));
                    }}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">{it.id}</span>
                  <span className="flex-1">{it.nome}</span>
                  <span className="text-[11px] text-muted-foreground">{it.categoria}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setItensEscolhidos(null); setDlgItens(false); }}>Restaurar padrão</Button>
            <Button onClick={() => setDlgItens(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: lançar compra em trânsito */}
      <Dialog open={!!novoMov} onOpenChange={(o) => !o && setNovoMov(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lançar compra em trânsito</DialogTitle></DialogHeader>
          {novoMov && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Item</Label>
                <div className="text-sm font-medium">{findItem(st.itens, novoMov.itemId)?.nome ?? novoMov.itemId}</div>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={novoMov.qtd} onChange={(e) => setNovoMov({ ...novoMov, qtd: Number(e.target.value || 0) })} />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Input value={novoMov.fornecedor} onChange={(e) => setNovoMov({ ...novoMov, fornecedor: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Observação</Label>
                <Input value={novoMov.obs} onChange={(e) => setNovoMov({ ...novoMov, obs: e.target.value })} placeholder="NF, previsão de chegada…" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNovoMov(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!novoMov || novoMov.qtd <= 0) { toast.error("Informe a quantidade."); return; }
                addCompraTransito({
                  itemId: novoMov.itemId,
                  qtd: novoMov.qtd,
                  fornecedor: novoMov.fornecedor || undefined,
                  obs: novoMov.obs || undefined,
                  data: new Date().toISOString(),
                });
                setNovoMov(null);
                toast.success("Compra em trânsito registrada.");
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────── NECESSIDADE DE COMPRA ─────────────────────────── */


function CompraTab() {
  return (
    <Card className="p-4">
      <PainelCompraSelecao />
    </Card>
  );
}

/* ─────────────────────────── ESTOQUE ATUAL ─────────────────────────── */

const CATEGORIAS: Categoria[] = ["Módulo", "Inversor", "Cabo", "Disjuntor", "Estrutura", "Conector", "Outro"];
const UNIDADES: Unidade[] = ["un", "m", "kg", "pç", "kit"];

function ItensTab({ podeAjustar }: { podeAjustar: boolean }) {
  const st = useEstoqueState();
  const [novo, setNovo] = useState<EstoqueItem | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <Package className="mr-1 inline h-3.5 w-3.5" />
          {st.itens.length} item(ns). Estoque informado manualmente.
        </div>
        {podeAjustar && (
          <Button size="sm" onClick={() => setNovo({ id: "", nome: "", categoria: "Outro", unidade: "un", qtdAtual: 0 })}>
            + Novo item
          </Button>
        )}
      </div>
      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Unid.</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Reserv.</TableHead>
              <TableHead className="text-right">Disp.</TableHead>
              <TableHead className="text-right">CM (R$)</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {st.itens.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.id}</TableCell>
                <TableCell>{i.nome}</TableCell>
                <TableCell>{i.categoria}</TableCell>
                <TableCell>{i.unidade}</TableCell>
                <TableCell className="text-right">
                  {podeAjustar ? (
                    <Input
                      type="number"
                      min={0}
                      defaultValue={i.qtdAtual}
                      onBlur={(e) => {
                        const v = Number(e.target.value || 0);
                        if (v !== i.qtdAtual) {
                          setEstoqueAtual(i.id, v);
                          toast.success("Estoque atualizado.");
                        }
                      }}
                      className="h-8 w-24 text-right"
                    />
                  ) : (
                    <span>{i.qtdAtual}</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs">{i.qtdReservada || 0}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{Math.max(0, (i.qtdAtual || 0) - (i.qtdReservada || 0))}</TableCell>
                <TableCell className="text-right text-xs">{i.custoMedio ? i.custoMedio.toFixed(2) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(i.atualizadoEm)}</TableCell>
                <TableCell className="text-right">
                  {podeAjustar ? (
                    <RowActions
                      rowId={i.id}
                      actions={[
                        { kind: "editar" },
                        { kind: "excluir" },
                      ]}
                      onAction={(kind, id) => {
                        if (kind === "excluir") {
                          if (confirm(`Remover item "${i.nome}"?`)) {
                            removeEstoqueItem(id);
                            toast.success("Item removido.");
                          }
                        } else if (kind === "editar") {
                          toast.info("Edição inline disponível na coluna Qtd.");
                        }
                      }}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!novo} onOpenChange={(o) => !o && setNovo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo item de estoque</DialogTitle></DialogHeader>
          {novo && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código</Label>
                <Input value={novo.id} onChange={(e) => setNovo({ ...novo, id: e.target.value.toUpperCase() })} placeholder="EX: MOD-600" />
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={novo.categoria} onValueChange={(v) => setNovo({ ...novo, categoria: v as Categoria })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={novo.unidade} onValueChange={(v) => setNovo({ ...novo, unidade: v as Unidade })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Qtd. em estoque</Label>
                <Input
                  type="number"
                  min={0}
                  value={novo.qtdAtual}
                  onChange={(e) => setNovo({ ...novo, qtdAtual: Number(e.target.value || 0) })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNovo(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!novo) return;
                if (!novo.id || !novo.nome) { toast.error("Código e nome são obrigatórios."); return; }
                upsertEstoqueItem({ ...novo, atualizadoEm: new Date().toISOString(), atualizadoPor: "Estoque" });
                setNovo(null);
                toast.success("Item cadastrado.");
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────── ENTREGAS (LOG) ─────────────────────────── */

function EntregasTab() {
  const st = useEstoqueState();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const f = q.trim().toLowerCase();
    return st.log.filter((l) =>
      !f || l.cliente.toLowerCase().includes(f) || l.itemNome.toLowerCase().includes(f),
    );
  }, [st.log, q]);

  return (
    <div className="space-y-3">
      <EnterpriseRecordToolbar
        entityType="estoque"
        selectedIds={[]}
        availableActions={["atualizar", "filtroAvancado", "colunas", "exportar", "imprimir"]}
        searchPlaceholder="Buscar por cliente ou item…"
        search={q}
        onSearchChange={setQ}
        onAction={(a) => {
          if (a === "atualizar") window.location.reload();
          else if (a === "imprimir") window.print();
          else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.4.");
          else if (a === "colunas") toast.info("Gestor de colunas chega em D17.UI.4.");
          else if (a === "filtroAvancado") toast.info("Filtros avançados chegam em D17.UI.4.");
        }}
      />
      <div className="flex items-center justify-end">
        <span className="text-xs text-muted-foreground">{list.length} registro(s)</span>
      </div>
      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead>Completa?</TableHead>
              <TableHead>Por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhuma entrega registrada.</TableCell></TableRow>
            ) : (
              list.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{fmtDate(l.em)}</TableCell>
                  <TableCell>{l.cliente || "—"}</TableCell>
                  <TableCell>{l.itemNome}</TableCell>
                  <TableCell className="text-right">{l.qtd}</TableCell>
                  <TableCell>{l.completa ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-xs">{l.por}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
