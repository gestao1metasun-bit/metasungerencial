/**
 * E.OS.3 — Painel interno da Ordem de Serviço.
 *
 * Abas (D17.UI Enterprise):
 *  • Ordem de Serviço · dados gerais (read-only nesta fase)
 *  • Tarefas         · CRUD via RPCs rpc_os_tarefa_*
 *  • Histórico       · os_eventos (append-only)
 *
 * Ações de status (Mudar status / Finalizar / Cancelar / Excluir) chamam
 * exclusivamente as RPCs oficiais — UPDATE direto em status é bloqueado
 * pelo trigger `tg_os_ord_bloqueia_status` (E.OS.1/E.OS.2).
 *
 * Anexos universais, Serviços a Faturar, Requisições, Formulários e
 * Dashboard ficam para a próxima subonda (E.OS.3.b) — o canal nesta fase
 * privilegia a operação central de status/tarefas/histórico.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Loader2, Plus, CheckCircle2, X, Trash2, RefreshCw, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EnterpriseRecordToolbar, RowActions } from "@/components/app/enterprise";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useOs, useOsTarefas, useOsEventos, useOsStatusCatalogo,
  useMudarStatusOs, useFinalizarOs, useCancelarOs, useExcluirOs,
  useCriarTarefa, useMudarStatusTarefa, useConcluirTarefa,
  useOsDashboard, useOsOrcadoVsRealizado, useOsCustosRealizados,
  useLancarOrcamento, useLancarCustoRealizado,
  OS_CATEGORIAS, type OsCategoriaCusto,
  type OsTarefaStatus,
} from "@/lib/repositories/os-repo";

export const Route = createFileRoute("/engenharia/gestao-servicos/$osId")({
  component: PainelOsPage,
});

const TAREFA_STATUSES: OsTarefaStatus[] = [
  "PLANEJAMENTO", "AGENDADA", "EM_DESLOCAMENTO", "EM_EXECUCAO",
  "PAUSA", "IMPEDIDA", "FINALIZADA", "CANCELADA",
];

function fmtMoney(n: number | null | undefined) {
  return (Number(n ?? 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return s; }
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("pt-BR"); } catch { return s; }
}

function PainelOsPage() {
  const { osId } = Route.useParams();
  const navigate = useNavigate();

  const { data: os, isLoading, refetch } = useOs(osId);
  const { data: statuses = [] } = useOsStatusCatalogo();

  const statusInfo = useMemo(() => {
    const s = statuses.find((x) => x.codigo === os?.status_codigo);
    return s ? { nome: s.nome, cor: s.cor } : null;
  }, [statuses, os?.status_codigo]);

  // dialogs
  const [statusDlg, setStatusDlg] = useState(false);
  const [cancelDlg, setCancelDlg] = useState(false);
  const [excluirDlg, setExcluirDlg] = useState(false);
  const [finalizarDlg, setFinalizarDlg] = useState(false);

  const mudarStatus = useMudarStatusOs();
  const finalizar = useFinalizarOs();
  const cancelar = useCancelarOs();
  const excluir = useExcluirOs();

  if (isLoading) {
    return (
      <div className="p-6 text-slate-500">
        <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Carregando O.S.…
      </div>
    );
  }
  if (!os) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-slate-700">O.S. não encontrada.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/engenharia/gestao-servicos" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2 text-[12px]">
        <Link to="/engenharia/gestao-servicos" className="text-sky-700 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Gestão de Serviços
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-mono font-semibold">O.S. {String(os.numero).padStart(6, "0")}</span>
        {statusInfo && (
          <Badge variant="outline" style={statusInfo.cor ? { borderColor: statusInfo.cor, color: statusInfo.cor } : undefined}>
            {statusInfo.nome}
          </Badge>
        )}
      </div>

      <PageHeader
        title={`O.S. ${String(os.numero).padStart(6, "0")}`}
        subtitle={os.observacoes ?? "Painel da Ordem de Serviço"}
      />

      <EnterpriseRecordToolbar
        entityType="engenharia"
        selectedIds={[os.id]}
        availableActions={["atualizar", "exportar"]}
        availableProcesses={[
          { key: "mudarStatus", label: "Mudar status" },
          { key: "finalizar", label: "Finalizar O.S." },
          { key: "cancelar", label: "Cancelar O.S.", destructive: true, requerMotivo: true },
          { key: "excluir", label: "Excluir O.S.", destructive: true, requerMotivo: true },
        ]}
        onAction={(a) => { if (a === "atualizar") refetch(); }}
        onProcess={(key) => {
          if (key === "mudarStatus") setStatusDlg(true);
          if (key === "finalizar") setFinalizarDlg(true);
          if (key === "cancelar") setCancelDlg(true);
          if (key === "excluir") setExcluirDlg(true);
        }}
      />

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="h-8">
          <TabsTrigger value="dashboard" className="text-[12px]">Dashboard</TabsTrigger>
          <TabsTrigger value="os" className="text-[12px]">Ordem de Serviço</TabsTrigger>
          <TabsTrigger value="orcado" className="text-[12px]">Orçado x Realizado</TabsTrigger>
          <TabsTrigger value="custos" className="text-[12px]">Custos</TabsTrigger>
          <TabsTrigger value="tarefas" className="text-[12px]">Tarefas</TabsTrigger>
          <TabsTrigger value="historico" className="text-[12px]">Histórico</TabsTrigger>
        </TabsList>

        {/* ─── Dashboard ─── */}
        <TabsContent value="dashboard" className="mt-2">
          <DashboardTab osId={os.id} />
        </TabsContent>

        {/* ─── OS ─── */}
        <TabsContent value="os" className="mt-2">
          <Card className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12.5px]">
            <Field label="Número" value={String(os.numero).padStart(6, "0")} mono />
            <Field label="Status" value={statusInfo?.nome ?? os.status_codigo} />
            <Field label="Cliente" value={os.cliente_id ?? "—"} mono />
            <Field label="Pipeline" value={os.pipeline_id ?? "—"} mono />
            <Field label="Proposta" value={os.proposta_id ?? "—"} mono />
            <Field label="Contrato" value={os.contrato_id ?? "—"} mono />
            <Field label="PV" value={os.pedido_venda_id ?? "—"} mono />
            <Field label="Projeto" value={os.projeto_id ?? "—"} mono />
            <Field label="Obra" value={os.obra_id ?? "—"} mono />
            <Field label="Técnico responsável" value={os.tecnico_responsavel_id ?? "—"} mono />
            <Field label="Valor orçado" value={fmtMoney(os.valor_orcado)} />
            <Field label="Custo orçado" value={fmtMoney(os.custo_orcado)} />
            <Field label="Custo total" value={fmtMoney(os.custo_total)} />
            <Field label="Valor em PV" value={fmtMoney(os.valor_em_pv)} />
            <Field label="Prev. início" value={fmtDate(os.data_prev_inicio)} />
            <Field label="Prev. término" value={fmtDate(os.data_prev_termino)} />
            <Field label="Cadastrada" value={fmtDate(os.data_cadastro)} />
            <Field label="Atualizada" value={fmtDateTime(os.updated_at)} />
          </Card>
        </TabsContent>

        {/* ─── Orçado x Realizado ─── */}
        <TabsContent value="orcado" className="mt-2">
          <OrcadoRealizadoTab osId={os.id} />
        </TabsContent>

        {/* ─── Custos ─── */}
        <TabsContent value="custos" className="mt-2">
          <CustosTab osId={os.id} />
        </TabsContent>

        {/* ─── Tarefas ─── */}
        <TabsContent value="tarefas" className="mt-2">
          <TarefasTab osId={os.id} />
        </TabsContent>

        {/* ─── Histórico ─── */}
        <TabsContent value="historico" className="mt-2" id="historico">
          <HistoricoTab osId={os.id} />
        </TabsContent>
      </Tabs>


      {/* ─── Dialogs ─── */}
      <MudarStatusDialog
        open={statusDlg} onOpenChange={setStatusDlg}
        osId={os.id} rowVersion={os.row_version}
        statuses={statuses.map((s) => ({ codigo: s.codigo, nome: s.nome }))}
        currentStatus={os.status_codigo}
        onDone={() => refetch()}
        mutation={mudarStatus}
      />
      <FinalizarDialog
        open={finalizarDlg} onOpenChange={setFinalizarDlg}
        osId={os.id} rowVersion={os.row_version}
        mutation={finalizar} onDone={() => refetch()}
      />
      <MotivoDialog
        open={cancelDlg} onOpenChange={setCancelDlg}
        title="Cancelar O.S." description="Motivo obrigatório (mín. 5 caracteres)."
        confirmLabel="Cancelar O.S." tone="danger"
        onConfirm={async (motivo) => {
          await cancelar.mutateAsync({ os_id: os.id, row_version: os.row_version, motivo });
          toast.success("O.S. cancelada.");
          refetch();
        }}
      />
      <MotivoDialog
        open={excluirDlg} onOpenChange={setExcluirDlg}
        title="Excluir O.S." description="Exclusão reversível (soft-delete). Motivo obrigatório."
        confirmLabel="Excluir" tone="danger"
        onConfirm={async (motivo) => {
          await excluir.mutateAsync({ os_id: os.id, motivo });
          toast.success("O.S. excluída.");
          navigate({ to: "/engenharia/gestao-servicos" });
        }}
      />
    </div>
  );
}

// ─────────────────────────── Aba Tarefas ───────────────────────────
function TarefasTab({ osId }: { osId: string }) {
  const { data: tarefas = [], isLoading, refetch } = useOsTarefas(osId);
  const [novaOpen, setNovaOpen] = useState(false);
  const criar = useCriarTarefa();
  const mudarStatus = useMudarStatusTarefa();
  const concluir = useConcluirTarefa();

  // nova tarefa
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataPrev, setDataPrev] = useState("");

  async function handleNova() {
    if (!nome.trim()) { toast.error("Nome obrigatório."); return; }
    try {
      await criar.mutateAsync({
        os_id: osId, nome: nome.trim(),
        descricao: descricao.trim() || null,
        ordem: tarefas.length * 10 + 10,
        data_prevista: dataPrev || null,
      });
      toast.success("Tarefa criada.");
      setNome(""); setDescricao(""); setDataPrev("");
      setNovaOpen(false);
      refetch();
    } catch (e) {
      toast.error(`Falha: ${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-800">Tarefas da O.S.</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
          </Button>
          <Button size="sm" className="h-7" onClick={() => setNovaOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova tarefa
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] uppercase">
              <TableHead className="w-[60px]">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[120px]">Prev.</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="py-6 text-center text-slate-500">
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Carregando…
              </TableCell></TableRow>
            ) : tarefas.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">
                Nenhuma tarefa. Crie a primeira em <strong>Nova tarefa</strong>.
              </TableCell></TableRow>
            ) : tarefas.map((t) => (
              <TableRow key={t.id} className="text-[12.5px]">
                <TableCell className="tabular-nums">{t.ordem}</TableCell>
                <TableCell>
                  <div className="font-medium">{t.nome}</div>
                  {t.descricao && <div className="text-[11.5px] text-slate-500">{t.descricao}</div>}
                </TableCell>
                <TableCell>
                  <Select
                    value={t.status}
                    onValueChange={async (v) => {
                      try {
                        if (v === "FINALIZADA") {
                          await concluir.mutateAsync({ tarefa_id: t.id, os_id: osId, row_version: t.row_version });
                        } else {
                          await mudarStatus.mutateAsync({
                            tarefa_id: t.id, os_id: osId, row_version: t.row_version,
                            novo_status: v as OsTarefaStatus,
                          });
                        }
                        toast.success("Status atualizado.");
                        refetch();
                      } catch (e) {
                        toast.error(`Falha: ${(e as Error).message}`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TAREFA_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{fmtDate(t.data_prevista)}</TableCell>
                <TableCell className="text-right">
                  <RowActions
                    rowId={t.id}
                    actions={[
                      { kind: "aprovar", label: "Concluir", disabled: t.status === "FINALIZADA" },
                    ]}
                    onAction={async (kind) => {
                      if (kind === "aprovar") {
                        try {
                          await concluir.mutateAsync({ tarefa_id: t.id, os_id: osId, row_version: t.row_version });
                          toast.success("Tarefa finalizada.");
                          refetch();
                        } catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>Crie uma tarefa atômica desta O.S.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-[13px]">
            <div className="space-y-1">
              <Label className="text-[12px]">Nome *</Label>
              <Input className="h-8" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Descrição</Label>
              <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Data prevista</Label>
              <Input type="date" className="h-8" value={dataPrev} onChange={(e) => setDataPrev(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)} disabled={criar.isPending}>Cancelar</Button>
            <Button onClick={handleNova} disabled={criar.isPending}>
              {criar.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────── Aba Histórico ───────────────────────────
function HistoricoTab({ osId }: { osId: string }) {
  const { data: eventos = [], isLoading, refetch } = useOsEventos(osId);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-[13px] font-semibold text-slate-800">Histórico (append-only)</h3>
        <Button variant="outline" size="sm" className="h-7" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
        </Button>
      </div>
      <div className="rounded-md border border-slate-200 bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] uppercase">
              <TableHead className="w-[160px]">Quando</TableHead>
              <TableHead className="w-[200px]">Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[200px]">Tarefa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="py-6 text-center text-slate-500">
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Carregando…
              </TableCell></TableRow>
            ) : eventos.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-slate-500">
                Nenhum evento registrado.
              </TableCell></TableRow>
            ) : eventos.map((e) => (
              <TableRow key={e.id} className="text-[12.5px]">
                <TableCell className="tabular-nums">{fmtDateTime(e.created_at)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10.5px]">{e.tipo}</Badge></TableCell>
                <TableCell className="text-slate-700">{e.descricao ?? "—"}</TableCell>
                <TableCell className="text-slate-500 font-mono text-[11px]">{e.tarefa_id ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─────────────────────────── Dialogs auxiliares ───────────────────────────
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10.5px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={mono ? "font-mono text-[11.5px] text-slate-800 truncate" : "text-slate-800"}>{value}</div>
    </div>
  );
}

function MudarStatusDialog({
  open, onOpenChange, osId, rowVersion, statuses, currentStatus, onDone, mutation,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  osId: string; rowVersion: number;
  statuses: { codigo: string; nome: string }[];
  currentStatus: string;
  onDone: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutation: any;
}) {
  const [novo, setNovo] = useState(currentStatus);
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mudar status</DialogTitle>
          <DialogDescription>A transição é registrada em <code>os_eventos</code> via RPC oficial.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-[13px]">
          <div className="space-y-1">
            <Label className="text-[12px]">Novo status</Label>
            <Select value={novo} onValueChange={setNovo}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => <SelectItem key={s.codigo} value={s.codigo}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Motivo (opcional)</Label>
            <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button
            onClick={async () => {
              try {
                await mutation.mutateAsync({ os_id: osId, row_version: rowVersion, novo_status: novo, motivo: motivo || undefined });
                toast.success("Status alterado.");
                onOpenChange(false);
                onDone();
              } catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinalizarDialog({
  open, onOpenChange, osId, rowVersion, mutation, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  osId: string; rowVersion: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutation: any; onDone: () => void;
}) {
  const [obs, setObs] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar O.S.</DialogTitle>
          <DialogDescription>A O.S. passa para status final FINALIZADA.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-[13px]">
          <Label className="text-[12px]">Observação (opcional)</Label>
          <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button
            onClick={async () => {
              try {
                await mutation.mutateAsync({ os_id: osId, row_version: rowVersion, observacao: obs || undefined });
                toast.success("O.S. finalizada.");
                onOpenChange(false);
                onDone();
              } catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MotivoDialog({
  open, onOpenChange, title, description, confirmLabel, tone, onConfirm,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: string; description: string; confirmLabel: string;
  tone: "danger" | "default";
  onConfirm: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) setMotivo(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-[13px]">
          <Label className="text-[12px]">Motivo *</Label>
          <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={async () => {
              if (motivo.trim().length < 5) { toast.error("Motivo precisa de 5+ caracteres."); return; }
              setBusy(true);
              try { await onConfirm(motivo.trim()); onOpenChange(false); setMotivo(""); }
              catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
              finally { setBusy(false); }
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : tone === "danger" ? <Trash2 className="h-4 w-4 mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
