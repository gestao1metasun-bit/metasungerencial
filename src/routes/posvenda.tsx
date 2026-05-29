import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EnterpriseRecordToolbar, ModuloHistoricoDrawer } from "@/components/app/enterprise";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Headset, Plus, AlertTriangle, CheckCircle2, Clock, Wrench } from "lucide-react";
import { useTabFromHash } from "@/lib/route-tabs";
import {
  usePosVendaState, abrirChamado, alterarStatusChamado, atualizarChamado,
  adicionarInteracao, upsertTipoPv, removeTipoPv, novoTipoId,
  PV_STATUS, PV_STATUS_ABERTOS, PV_PRIORIDADES, contagemPorStatus,
  type PvChamado, type PvStatus, type PvTipo, type PvPrioridade,
} from "@/lib/posvenda-store";
import { useContratos } from "@/lib/contratos-store";
import { useUsuarioAtual } from "@/lib/perfis-store";
import { toast } from "sonner";

export const Route = createFileRoute("/posvenda")({
  head: () => ({ meta: [{ title: "Pós-venda — Meta Sun" }] }),
  component: PosVendaPage,
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function statusTone(s: PvStatus): string {
  switch (s) {
    case "Aberto": return "bg-amber-500/15 text-amber-700 border-amber-500/40";
    case "Em atendimento": return "bg-blue-500/15 text-blue-700 border-blue-500/40";
    case "Aguardando cliente": return "bg-purple-500/15 text-purple-700 border-purple-500/40";
    case "Aguardando peça": return "bg-orange-500/15 text-orange-700 border-orange-500/40";
    case "Resolvido": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/40";
    case "Cancelado": return "bg-muted text-muted-foreground border-border";
  }
}

function PosVendaPage() {
  const [tab, setTab] = useTabFromHash("/posvenda");
  const state = usePosVendaState();
  const { user } = useUsuarioAtual();
  const usuario = user?.nome ?? "Sistema";
  const [histOpen, setHistOpen] = useState(false);

  const contagem = useMemo(() => contagemPorStatus(), [state.chamados]);
  const abertos = PV_STATUS_ABERTOS.reduce((s, k) => s + contagem[k], 0);
  const atrasados = useMemo(() => {
    const now = Date.now();
    return state.chamados.filter(
      (c) => PV_STATUS_ABERTOS.includes(c.status) && c.prazoISO && new Date(c.prazoISO).getTime() < now,
    ).length;
  }, [state.chamados]);

  return (
    <>
      <PageHeader
        title="Pós-venda"
        subtitle="Atendimentos, garantias e acompanhamento pós-instalação."
      />
      <div className="mb-3">
        <EnterpriseRecordToolbar
          entityType="posvenda"
          availableActions={["novo", "atualizar", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
          selectedIds={[]}
          searchPlaceholder="Buscar chamado, cliente, tipo, status…"
          onAction={(a) => {
            if (a === "novo") setTab("chamados");
            else if (a === "atualizar") toast.success("Pós-venda recarregada.");
            else if (a === "historico") setTab("chamados");
            else if (a === "imprimir") window.print();
            else if (a === "colunas") toast.info("Gestor de colunas chega em D17.UI.4b.");
            else if (a === "filtroAvancado") toast.info("Filtros avançados chegam em D17.UI.4b.");
            else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.4b.");
          }}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="chamados">Chamados</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de atendimento</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-5">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Chamados abertos" value={String(abertos)} icon={Headset} />
            <StatCard label="Em atendimento" value={String(contagem["Em atendimento"])} icon={Wrench} />
            <StatCard label="Atrasados (SLA)" value={String(atrasados)} icon={AlertTriangle} tone={atrasados ? "destructive" : "muted"} />
            <StatCard label="Resolvidos" value={String(contagem["Resolvido"])} icon={CheckCircle2} tone="success" />

          </div>

          <Card className="mt-6 p-5">
            <h3 className="text-base font-semibold">Distribuição por status</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {PV_STATUS.map((s) => (
                <div key={s} className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">{s}</div>
                  <div className="mt-1 text-2xl font-semibold">{contagem[s]}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="chamados" className="mt-5">
          <ChamadosTab usuario={usuario} />
        </TabsContent>

        <TabsContent value="tipos" className="mt-5">
          <TiposTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ============================================================================
// Aba CHAMADOS
// ============================================================================
function ChamadosTab({ usuario }: { usuario: string }) {
  const state = usePosVendaState();
  const [filtroStatus, setFiltroStatus] = useState<string>("__abertos__");
  const [busca, setBusca] = useState("");
  const [openNovo, setOpenNovo] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return state.chamados
      .filter((c) => {
        if (filtroStatus === "__todos__") return true;
        if (filtroStatus === "__abertos__") return PV_STATUS_ABERTOS.includes(c.status);
        return c.status === filtroStatus;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.cliente.toLowerCase().includes(q) ||
          c.titulo.toLowerCase().includes(q) ||
          String(c.numero).includes(q)
        );
      })
      .sort((a, b) => (a.abertoEm < b.abertoEm ? 1 : -1));
  }, [state.chamados, filtroStatus, busca]);

  const detalhe = detalheId ? state.chamados.find((c) => c.id === detalheId) ?? null : null;

  return (
    <>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por cliente, número ou título…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__abertos__">Somente abertos</SelectItem>
              <SelectItem value="__todos__">Todos</SelectItem>
              {PV_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button onClick={() => setOpenNovo(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo chamado
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Aberto</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">Nenhum chamado.</TableCell></TableRow>
              )}
              {lista.map((c) => {
                const tipo = state.tipos.find((t) => t.id === c.tipoId);
                const atrasado = c.prazoISO && PV_STATUS_ABERTOS.includes(c.status) && new Date(c.prazoISO).getTime() < Date.now();
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setDetalheId(c.id)}
                  >
                    <TableCell className="font-mono text-xs">{String(c.numero).padStart(4, "0")}</TableCell>
                    <TableCell className="font-medium">{c.cliente}</TableCell>
                    <TableCell>{c.titulo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tipo?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded border px-2 py-0.5 text-xs ${statusTone(c.status)}`}>{c.status}</span>
                    </TableCell>
                    <TableCell className="text-xs">{c.prioridade}</TableCell>
                    <TableCell className="text-xs">{fmtDate(c.abertoEm)}</TableCell>
                    <TableCell className={`text-xs ${atrasado ? "font-semibold text-destructive" : ""}`}>
                      {fmtDate(c.prazoISO)} {atrasado && <AlertTriangle className="ml-1 inline h-3 w-3" />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.origem}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {openNovo && (
        <NovoChamadoDialog usuario={usuario} onClose={() => setOpenNovo(false)} />
      )}
      {detalhe && (
        <ChamadoDetalheDialog
          chamado={detalhe}
          usuario={usuario}
          onClose={() => setDetalheId(null)}
        />
      )}
    </>
  );
}

// ============================================================================
// Novo Chamado
// ============================================================================
function NovoChamadoDialog({ usuario, onClose }: { usuario: string; onClose: () => void }) {
  const state = usePosVendaState();
  const contratos = useContratos();

  // Obras disponíveis (contratos assinados/em obra)
  const obrasList = useMemo(() => {
    const out: { obraId: string; cliente: string; contratoId?: string }[] = [];
    for (const c of contratos as any[]) {
      const projetos: any[] = c.projetos ?? [];
      for (const p of projetos) {
        if (p?.id) out.push({ obraId: p.id, cliente: c.cliente ?? c.nome ?? "—", contratoId: c.id });
      }
    }
    return out;
  }, [contratos]);

  const [obraId, setObraId] = useState<string>("");
  const [clienteManual, setClienteManual] = useState("");
  const [tipoId, setTipoId] = useState<string>(state.tipos.find((t) => t.ativo)?.id ?? "");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<PvPrioridade>("Média");
  const [responsavel, setResponsavel] = useState("");

  const obraSel = obrasList.find((o) => o.obraId === obraId);
  const cliente = obraSel?.cliente ?? clienteManual;

  function salvar() {
    if (!tipoId) { toast.error("Selecione um tipo de atendimento."); return; }
    if (!cliente.trim()) { toast.error("Informe o cliente ou selecione uma obra."); return; }
    if (!titulo.trim()) { toast.error("Informe o título."); return; }
    abrirChamado({
      obraId: obraId || `manual-${Date.now()}`,
      contratoId: obraSel?.contratoId,
      cliente,
      tipoId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      prioridade,
      responsavel: responsavel.trim() || undefined,
      abertoPor: usuario,
      origem: "Manual",
    });
    toast.success("Chamado criado.");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo chamado de pós-venda</DialogTitle>
          <DialogDescription>Abra um atendimento para garantia, manutenção ou suporte.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label>Obra (opcional)</Label>
            <Select value={obraId} onValueChange={setObraId}>
              <SelectTrigger><SelectValue placeholder="Selecionar obra…" /></SelectTrigger>
              <SelectContent>
                {obrasList.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Nenhuma obra disponível.</div>}
                {obrasList.map((o) => (
                  <SelectItem key={o.obraId} value={o.obraId}>{o.cliente} — {o.obraId.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!obraId && (
            <div>
              <Label>Cliente</Label>
              <Input value={clienteManual} onChange={(e) => setClienteManual(e.target.value)} placeholder="Nome do cliente" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipoId} onValueChange={setTipoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.tipos.filter((t) => t.ativo).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as PvPrioridade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PV_PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Resumo do atendimento" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Responsável (opcional)</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar}>Abrir chamado</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Detalhe do chamado
// ============================================================================
function ChamadoDetalheDialog({
  chamado, usuario, onClose,
}: { chamado: PvChamado; usuario: string; onClose: () => void }) {
  const state = usePosVendaState();
  const tipo = state.tipos.find((t) => t.id === chamado.tipoId);
  const [status, setStatus] = useState<PvStatus>(chamado.status);
  const [nota, setNota] = useState("");
  const [responsavel, setResponsavel] = useState(chamado.responsavel ?? "");
  const [comentario, setComentario] = useState("");

  function aplicarStatus() {
    if (status !== chamado.status) {
      alterarStatusChamado(chamado.id, status, usuario, nota.trim() || undefined);
      setNota("");
      toast.success("Status atualizado.");
    }
    if ((responsavel || "") !== (chamado.responsavel || "")) {
      atualizarChamado(chamado.id, { responsavel: responsavel.trim() || undefined }, usuario);
    }
  }
  function comentar() {
    if (!comentario.trim()) return;
    adicionarInteracao(chamado.id, usuario, "Comentário", comentario.trim());
    setComentario("");
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            #{String(chamado.numero).padStart(4, "0")} — {chamado.titulo}
          </DialogTitle>
          <DialogDescription>
            {chamado.cliente} · {tipo?.nome ?? "—"} · Aberto em {fmtDate(chamado.abertoEm)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PvStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PV_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Nota da alteração (opcional)</Label>
            <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
              placeholder="Ex.: técnico agendado, peça pedida, resolvido com troca…" />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={aplicarStatus}>Aplicar</Button>
          </div>

          {chamado.descricao && (
            <Card className="bg-muted/40 p-3 text-sm">
              <div className="text-xs font-semibold text-muted-foreground">Descrição</div>
              <div className="mt-1 whitespace-pre-wrap">{chamado.descricao}</div>
            </Card>
          )}

          <div>
            <h4 className="text-sm font-semibold">Histórico</h4>
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
              {chamado.interacoes.slice().reverse().map((i) => (
                <div key={i.id} className="rounded border border-border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{i.tipo} · {i.por}</span>
                    <span className="text-muted-foreground">{fmtDate(i.em)}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{i.texto}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Adicionar comentário</Label>
            <div className="flex gap-2">
              <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} />
              <Button onClick={comentar}>Adicionar</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Aba TIPOS
// ============================================================================
function TiposTab() {
  const state = usePosVendaState();
  const [editing, setEditing] = useState<PvTipo | null>(null);

  function novo() {
    setEditing({
      id: novoTipoId(), nome: "", descricao: "", slaDias: 3,
      gatilhoEncerramento: false, diasAposEncerramento: 30, ativo: true,
    });
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Tipos de atendimento</h3>
          <Button onClick={novo}><Plus className="mr-1 h-4 w-4" />Novo tipo</Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>SLA (dias úteis)</TableHead>
                <TableHead>Gatilho encerramento</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.tipos.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.descricao ?? "—"}</TableCell>
                  <TableCell>{t.slaDias}</TableCell>
                  <TableCell>
                    {t.gatilhoEncerramento
                      ? <Badge variant="secondary">+{t.diasAposEncerramento ?? 0}d após encerramento</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{t.ativo ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ ...t })}>Editar</Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => {
                        try { removeTipoPv(t.id); toast.success("Tipo excluído."); }
                        catch (e: any) { toast.error(e?.message ?? "Erro."); }
                      }}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {editing && (
        <Dialog open onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{state.tipos.some((x) => x.id === editing.id) ? "Editar tipo" : "Novo tipo"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>SLA (dias úteis)</Label>
                  <Input type="number" value={editing.slaDias}
                    onChange={(e) => setEditing({ ...editing, slaDias: Math.max(1, Number(e.target.value) || 1) })} />
                </div>
                <div>
                  <Label>Dias após encerramento</Label>
                  <Input type="number" value={editing.diasAposEncerramento ?? 0}
                    onChange={(e) => setEditing({ ...editing, diasAposEncerramento: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.gatilhoEncerramento}
                  onChange={(e) => setEditing({ ...editing, gatilhoEncerramento: e.target.checked })} />
                Gerar automaticamente ao encerrar obra
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.ativo}
                  onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })} />
                Ativo
              </label>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={() => {
                if (!editing.nome.trim()) { toast.error("Informe o nome."); return; }
                upsertTipoPv(editing);
                toast.success("Tipo salvo.");
                setEditing(null);
              }}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
