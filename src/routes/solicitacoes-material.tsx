// ============================================================================
// D5.3 — Solicitações de Material (fluxo material ↔ compra).
// Operação: criação, envio para aprovação, acompanhamento de itens,
// ordens de compra geradas, cotações e recebimento.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useSolicitacoesMaterial, useSolicitacaoDetalhe,
  useCriarSolicitacaoMaterial, useEnviarSolicitacaoMaterial,
  useCancelarSolicitacaoMaterial, useRegistrarCotacao, useEscolherCotacao,
  useReceberOrdemCompra, useCotacoesOrdem,
  SM_STATUS_LABEL, SM_STATUS_TONE,
  type SolicitacaoMaterial,
} from "@/hooks/useSolicitacoesMaterial";
import {
  Plus, Send, Ban, ShoppingCart, CheckCircle2, FileText,
} from "lucide-react";
import { EnterpriseRecordToolbar, RowActions, ModuloHistoricoDrawer } from "@/components/app/enterprise";
import { toast } from "sonner";

export const Route = createFileRoute("/solicitacoes-material")({
  head: () => ({
    meta: [
      { title: "Solicitações de Material — Meta Sun" },
      { name: "description", content: "Solicite materiais, acompanhe reservas e compras com desvio inteligente." },
    ],
  }),
  component: SolicitacoesMaterialPage,
});

const SETORES = ["Engenharia", "Obras", "Administrativo", "Comercial", "Pós-venda", "TI", "Outros"];

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function SolicitacoesMaterialPage() {
  const { data: lista = [], isLoading } = useSolicitacoesMaterial();
  const [criar, setCriar] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [histOpen, setHistOpen] = useState(false);

  const stats = useMemo(() => {
    return {
      total: lista.length,
      pend: lista.filter((s) => s.status === "PENDENTE_APROVACAO_SETOR").length,
      atendidas: lista.filter((s) => s.status === "ATENDIDA_ESTOQUE").length,
      compra: lista.filter((s) => s.status === "AGUARDANDO_COMPRA").length,
    };
  }, [lista]);

  const listaFiltrada = useMemo(() => {
    const f = busca.trim().toLowerCase();
    if (!f) return lista;
    return lista.filter((s) =>
      (s.codigo ?? "").toLowerCase().includes(f) ||
      (s.setor ?? "").toLowerCase().includes(f) ||
      (s.motivo ?? "").toLowerCase().includes(f) ||
      (s.solicitante_email ?? "").toLowerCase().includes(f),
    );
  }, [lista, busca]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Solicitações de Material"
        subtitle="Solicite, aprove e acompanhe materiais — o sistema desvia para compra apenas o que falta no estoque."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={String(stats.total)} icon={FileText} />
        <StatCard label="Aguardando setor" value={String(stats.pend)} icon={Send} tone="warning" />
        <StatCard label="Atendidas pelo estoque" value={String(stats.atendidas)} icon={CheckCircle2} tone="success" />
        <StatCard label="Em compra" value={String(stats.compra)} icon={ShoppingCart} tone="info" />
      </div>

      {/* D17.UI Fase 3 — Compras: barra Enterprise RM/TOTVS oficial */}
      <EnterpriseRecordToolbar
        entityType="compras"
        selectedIds={detalheId ? [detalheId] : []}
        availableActions={["novo", "atualizar", "filtroAvancado", "colunas", "exportar", "imprimir"]}
        searchPlaceholder="Buscar código, setor, motivo, solicitante…"
        search={busca}
        onSearchChange={setBusca}
        onAction={(a) => {
          if (a === "novo") setCriar(true);
          else if (a === "atualizar") toast.info("Lista atualizada.");
          else if (a === "imprimir") window.print();
          else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.4.");
          else if (a === "colunas") toast.info("Gestor de colunas chega no próximo turno.");
          else if (a === "filtroAvancado") toast.info("Use a busca canônica acima — filtros avançados em D17.UI.4.");
        }}
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Valor estim.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && listaFiltrada.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                {lista.length === 0 ? "Nenhuma solicitação ainda." : "Nenhum resultado para a busca."}
              </TableCell></TableRow>
            )}
            {listaFiltrada.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/40">
                <TableCell className="font-mono text-xs">{s.codigo}</TableCell>
                <TableCell>{s.setor ?? "—"}</TableCell>
                <TableCell className="text-xs">{s.solicitante_email ?? s.solicitante_id.slice(0, 8)}</TableCell>
                <TableCell className="max-w-[280px] truncate">{s.motivo ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(Number(s.valor_estimado))}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={SM_STATUS_TONE[s.status]}>{SM_STATUS_LABEL[s.status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <RowActions
                    rowId={s.id}
                    actions={[{ kind: "visualizar" }, { kind: "historico" }]}
                    onAction={(_, id) => setDetalheId(id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>


      <CriarDialog open={criar} onOpenChange={setCriar} />
      <DetalheSheet id={detalheId} onClose={() => setDetalheId(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CRIAR
// ---------------------------------------------------------------------------
function useProdutosAtivos() {
  return useQuery({
    queryKey: ["produtos_ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, nome, unidade, custo_unitario")
        .eq("ativo", true)
        .order("nome")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
}

function CriarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: produtos = [] } = useProdutosAtivos();
  const criar = useCriarSolicitacaoMaterial();
  const [setor, setSetor] = useState("Obras");
  const [motivo, setMotivo] = useState("");
  const [itens, setItens] = useState<{ produto_id: string; quantidade: number; observacao?: string }[]>([
    { produto_id: "", quantidade: 1 },
  ]);

  function addItem() { setItens((x) => [...x, { produto_id: "", quantidade: 1 }]); }
  function upd(i: number, patch: Partial<typeof itens[number]>) {
    setItens((x) => x.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }
  function rm(i: number) { setItens((x) => x.filter((_, idx) => idx !== i)); }

  async function submit() {
    const validos = itens.filter((i) => i.produto_id && i.quantidade > 0);
    if (validos.length === 0) return;
    await criar.mutateAsync({ setor, motivo, itens: validos });
    onOpenChange(false);
    setMotivo(""); setItens([{ produto_id: "", quantidade: 1 }]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova solicitação de material</DialogTitle>
          <DialogDescription>Será criada como rascunho. Ao enviar, vai para aprovação do setor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Setor</Label>
              <select className="w-full border rounded-md h-10 px-3 bg-background"
                value={setor} onChange={(e) => setSetor(e.target.value)}>
                {SETORES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Obra Cliente X" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Itens</Label>
            {itens.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select className="col-span-7 border rounded-md h-9 px-2 text-sm bg-background"
                  value={it.produto_id} onChange={(e) => upd(i, { produto_id: e.target.value })}>
                  <option value="">— Selecione —</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{p.codigo} — {p.nome} ({p.unidade})</option>
                  ))}
                </select>
                <Input type="number" min={1} className="col-span-3" value={it.quantidade}
                  onChange={(e) => upd(i, { quantidade: Number(e.target.value) })} />
                <Button size="sm" variant="ghost" className="col-span-2"
                  onClick={() => rm(i)} disabled={itens.length === 1}>Remover</Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar item
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={criar.isPending}>Criar rascunho</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// DETALHE
// ---------------------------------------------------------------------------
function DetalheSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useSolicitacaoDetalhe(id);
  const enviar = useEnviarSolicitacaoMaterial();
  const cancelar = useCancelarSolicitacaoMaterial();
  const [motivoCancel, setMotivoCancel] = useState("");

  const s = data?.solicitacao;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{s?.codigo ?? "Solicitação"}</SheetTitle>
          <SheetDescription>
            {s ? `${s.setor ?? "—"} • ${SM_STATUS_LABEL[s.status]}` : "Carregando…"}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground py-8">Carregando…</p>
        ) : (
          <div className="space-y-6 py-4">
            <div className="text-sm">
              <p><strong>Motivo:</strong> {s!.motivo ?? "—"}</p>
              <p><strong>Solicitante:</strong> {s!.solicitante_email}</p>
              {s!.motivo_negacao && (
                <p className="text-rose-700"><strong>Negada:</strong> {s!.motivo_negacao}</p>
              )}
              {s!.motivo_cancelamento && (
                <p className="text-zinc-700"><strong>Cancelada:</strong> {s!.motivo_cancelamento}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Itens</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Pedido</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">A comprar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.itens.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs">
                        {it.produtos?.codigo} — {it.produtos?.nome}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{Number(it.quantidade_solicitada)}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">{Number(it.quantidade_reservada)}</TableCell>
                      <TableCell className="text-right tabular-nums text-blue-700">{Number(it.quantidade_a_comprar)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {data.ordens.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">Ordens de Compra geradas</h4>
                <div className="space-y-3">
                  {data.ordens.map((o) => <OrdemCard key={o.id} ordem={o} />)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {s!.status === "RASCUNHO" && (
                <Button size="sm" onClick={() => enviar.mutate(s!.id)} disabled={enviar.isPending}>
                  <Send className="h-3 w-3 mr-1" /> Enviar para aprovação
                </Button>
              )}
              {!["CONCLUIDA","ATENDIDA_ESTOQUE","CANCELADA","NEGADA_SETOR"].includes(s!.status) && (
                <div className="flex gap-2 items-center">
                  <Input
                    className="w-56 h-8 text-sm"
                    placeholder="Motivo do cancelamento"
                    value={motivoCancel}
                    onChange={(e) => setMotivoCancel(e.target.value)}
                  />
                  <Button size="sm" variant="destructive"
                    onClick={() => cancelar.mutate({ id: s!.id, motivo: motivoCancel })}
                    disabled={cancelar.isPending || !motivoCancel}>
                    <Ban className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// ORDEM DE COMPRA — cotações + escolher + receber
// ---------------------------------------------------------------------------
function OrdemCard({ ordem }: { ordem: { id: string; codigo: string | null; status: string; fornecedor_nome: string | null; valor_total: number } }) {
  const { data: cotacoes = [] } = useCotacoesOrdem(ordem.id);
  const registrar = useRegistrarCotacao();
  const escolher = useEscolherCotacao();
  const receber = useReceberOrdemCompra();

  const [form, setForm] = useState({ fornecedor: "", valor: 0, prazo: 0 });

  const statusTone: Record<string, string> = {
    COTACAO: "bg-amber-100 text-amber-900 border-amber-300",
    AGUARDANDO_APROVACAO_FIN: "bg-blue-100 text-blue-900 border-blue-300",
    APROVADA: "bg-emerald-100 text-emerald-900 border-emerald-300",
    RECEBIDA: "bg-emerald-200 text-emerald-950 border-emerald-400",
    NEGADA: "bg-rose-100 text-rose-900 border-rose-300",
    CANCELADA: "bg-zinc-100 text-zinc-700 border-zinc-300",
  };

  return (
    <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs">{ordem.codigo}</p>
          {ordem.fornecedor_nome && <p className="text-xs">Fornecedor: {ordem.fornecedor_nome}</p>}
          {Number(ordem.valor_total) > 0 && <p className="text-xs">Total: {fmtBRL(Number(ordem.valor_total))}</p>}
        </div>
        <Badge variant="outline" className={statusTone[ordem.status]}>{ordem.status}</Badge>
      </div>

      {ordem.status === "COTACAO" && (
        <>
          <div>
            <p className="text-xs font-semibold mb-1">Cotações</p>
            {cotacoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma cotação ainda.</p>}
            {cotacoes.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded px-2 py-1 mb-1 bg-background">
                <div>
                  <p className="text-xs font-medium">{c.fornecedor_nome}</p>
                  <p className="text-xs text-muted-foreground">{fmtBRL(Number(c.valor_total))} • {c.prazo_entrega_dias ?? "—"}d</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => escolher.mutate(c.id)} disabled={escolher.isPending}>
                  Escolher
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-1 items-center">
            <Input className="col-span-5 h-8 text-xs" placeholder="Fornecedor"
              value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
            <Input className="col-span-3 h-8 text-xs" type="number" placeholder="Valor"
              value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
            <Input className="col-span-2 h-8 text-xs" type="number" placeholder="Prazo"
              value={form.prazo || ""} onChange={(e) => setForm({ ...form, prazo: Number(e.target.value) })} />
            <Button size="sm" className="col-span-2 h-8"
              disabled={!form.fornecedor || !form.valor || registrar.isPending}
              onClick={async () => {
                await registrar.mutateAsync({
                  ordem_id: ordem.id, fornecedor: form.fornecedor,
                  valor: form.valor, prazo_dias: form.prazo,
                });
                setForm({ fornecedor: "", valor: 0, prazo: 0 });
              }}>+ Cotação</Button>
          </div>
        </>
      )}

      {ordem.status === "APROVADA" && (
        <Button size="sm" onClick={() => receber.mutate(ordem.id)} disabled={receber.isPending}>
          <CheckCircle2 className="h-3 w-3 mr-1" /> Receber e dar entrada
        </Button>
      )}

      {ordem.status === "AGUARDANDO_APROVACAO_FIN" && (
        <p className="text-xs text-blue-700">Aguardando aprovação financeira — acompanhar na Central de Aprovações.</p>
      )}
    </div>
  );
}
