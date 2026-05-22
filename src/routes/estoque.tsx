import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Package, ShoppingCart, Truck, AlertTriangle, CheckCircle2, Lock,
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
import {
  useEstoqueState, setEstoqueAtual, upsertEstoqueItem, removeEstoqueItem,
  setSelecionadaCompra, marcarEntrega, isMaterialEntregueTotal,
  calcularNecessidadeCompra, findItem,
  reservarMaterial, liberarReserva, registrarDevolucaoObra, disponivelParaReserva,
  type EstoqueItem, type Categoria, type Unidade,
} from "@/lib/estoque-store";

export const Route = createFileRoute("/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Meta Sun Gerencial" }] }),
  component: EstoquePage,
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { const d = new Date(iso); return d.toLocaleString("pt-BR"); } catch { return "—"; }
}

function EstoquePage() {
  const [tab, setTab] = useTabFromHash("/estoque");
  const isAdmin = useIsAdmin();
  // Por padrão consideramos o usuário "Estoque" se for admin. Pode evoluir para
  // checar um perfil específico (ex.: setor === "estoque").
  const podeEntregar = isAdmin;
  const podeAjustarEstoque = isAdmin;

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle="Necessidades de obra, compras e controle de entregas."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="obras">Obras</TabsTrigger>
          <TabsTrigger value="compra">Compra</TabsTrigger>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5"><DashboardTab /></TabsContent>
        <TabsContent value="obras" className="mt-5"><ObrasTab podeEntregar={podeEntregar} /></TabsContent>
        <TabsContent value="compra" className="mt-5"><CompraTab /></TabsContent>
        <TabsContent value="itens" className="mt-5"><ItensTab podeAjustar={podeAjustarEstoque} /></TabsContent>
        <TabsContent value="entregas" className="mt-5"><EntregasTab /></TabsContent>
      </Tabs>
    </>
  );
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */

function DashboardTab() {
  const st = useEstoqueState();
  const obrasAtivas = st.necessidades.filter((n) => !n.arquivada);
  const selecionadas = obrasAtivas.filter((n) => n.selecionadaCompra);
  const linhas = calcularNecessidadeCompra(st);
  const aComprarTotal = linhas.reduce((s, l) => s + l.aComprar, 0);
  const obrasMatOK = obrasAtivas.filter(isMaterialEntregueTotal).length;
  const sku = st.itens.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Obras no fluxo" value={String(obrasAtivas.length)} hint="Em cronograma/elaboração" />
        <StatCard label="Selecionadas p/ compra" value={String(selecionadas.length)} hint="Entram no cálculo" />
        <StatCard label="Itens a comprar" value={String(aComprarTotal)} hint="Soma de unidades" />
        <StatCard label="Obras com material entregue" value={`${obrasMatOK}/${obrasAtivas.length}`} hint="Entrega total concluída" />
      </div>
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
          <div className="text-sm text-muted-foreground">Selecione uma obra à esquerda.</div>
        )}
      </Card>
    </div>
  );
}

function ObraDetalhe({ obraId, podeEntregar }: { obraId: string; podeEntregar: boolean }) {
  const st = useEstoqueState();
  const n = st.necessidades.find((x) => x.obraId === obraId);
  const [open, setOpen] = useState<{ itemId: string; qtd: number; completa: boolean } | null>(null);
  if (!n) return <div className="text-sm text-muted-foreground">Obra não encontrada.</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{n.cliente}</div>
          <div className="text-[11px] text-muted-foreground">Contrato {n.contratoId} · Obra {n.obraId}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          Atualizado: {fmtDate(n.atualizadaEm)}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Necessidade</TableHead>
            <TableHead className="text-right">Entregue</TableHead>
            <TableHead className="text-right">Falta</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-28">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {n.itens.map((i) => {
            const it = findItem(st.itens, i.itemId);
            const falta = Math.max(0, i.qtdNecessaria - i.qtdEntregue);
            const ok = i.entregaCompleta || falta === 0;
            return (
              <TableRow key={i.itemId}>
                <TableCell>{it?.nome ?? i.itemId}</TableCell>
                <TableCell className="text-right">{i.qtdNecessaria}</TableCell>
                <TableCell className="text-right">{i.qtdEntregue}</TableCell>
                <TableCell className="text-right">{falta}</TableCell>
                <TableCell>
                  {ok ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Entregue
                    </span>
                  ) : i.qtdEntregue > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Parcial
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Pendente
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {podeEntregar ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpen({ itemId: i.itemId, qtd: i.qtdEntregue, completa: ok })}
                    >
                      <Truck className="mr-1 h-3.5 w-3.5" /> Entregar
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> Apenas Estoque
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar entrega</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-3">
              <div className="text-sm">
                Item: <b>{findItem(st.itens, open.itemId)?.nome ?? open.itemId}</b>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Qtd. entregue (acumulado)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={open.qtd}
                    onChange={(e) => setOpen({ ...open, qtd: Number(e.target.value || 0) })}
                  />
                </div>
                <label className="flex items-end gap-2 pb-2">
                  <Checkbox
                    checked={open.completa}
                    onCheckedChange={(v) => setOpen({ ...open, completa: !!v })}
                  />
                  <span className="text-sm">Marcar como entrega completa</span>
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!open) return;
                marcarEntrega(obraId, open.itemId, open.qtd, open.completa);
                toast.success("Entrega registrada.");
                setOpen(null);
              }}
            >
              Confirmar entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────── NECESSIDADE DE COMPRA ─────────────────────────── */

function CompraTab() {
  const st = useEstoqueState();
  const obrasSel = st.necessidades.filter((n) => n.selecionadaCompra && !n.arquivada);
  const linhas = calcularNecessidadeCompra(st);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4 text-amber-600" /> Cálculo de Compra
        </div>
        <div className="text-xs text-muted-foreground">
          Compra = Σ (Necessidade − Entregue) das obras <b>selecionadas</b> − Estoque atual.
          Estoque atual é informado manualmente em <b>Estoque Atual</b>.
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Obras consideradas ({obrasSel.length})
        </div>
        {obrasSel.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Nenhuma obra marcada. Selecione obras na aba <b>Obras (necessidade)</b>.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
            {obrasSel.map((o) => (
              <li key={o.obraId} className="rounded border bg-muted/30 px-2 py-1">
                <span className="font-semibold">{o.cliente}</span>
                <span className="ml-1 text-[11px] text-muted-foreground">· Contrato {o.contratoId}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Necessidade</TableHead>
              <TableHead className="text-right">Já entregue</TableHead>
              <TableHead className="text-right">Estoque atual</TableHead>
              <TableHead className="text-right">A comprar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Sem necessidade pendente.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((l) => {
                const it = findItem(st.itens, l.itemId);
                return (
                  <TableRow key={l.itemId}>
                    <TableCell>{it?.nome ?? l.itemId}</TableCell>
                    <TableCell className="text-right">{l.necessidadeTotal}</TableCell>
                    <TableCell className="text-right">{l.jaEntregue}</TableCell>
                    <TableCell className="text-right">{l.estoqueAtual}</TableCell>
                    <TableCell className={`text-right font-semibold ${l.aComprar > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {l.aComprar}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
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
              <TableHead className="text-right">Qtd. em estoque</TableHead>
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
                <TableCell className="text-xs text-muted-foreground">{fmtDate(i.atualizadoEm)}</TableCell>
                <TableCell className="text-right">
                  {podeAjustar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remover item "${i.nome}"?`)) {
                          removeEstoqueItem(i.id);
                          toast.success("Item removido.");
                        }
                      }}
                    >
                      Remover
                    </Button>
                  )}
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
      <div className="flex items-center justify-between gap-2">
        <Input placeholder="Buscar por cliente ou item…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
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
