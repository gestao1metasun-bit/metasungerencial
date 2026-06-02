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
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Loader2, Plus, CheckCircle2, X, Trash2, RefreshCw, FileText,
  Camera, Paperclip, MapPin, PenLine,
} from "lucide-react";
import { SignaturePad } from "@/components/os/SignaturePad";
import { AnexoSignedImage, AnexoSignedLink } from "@/components/os/AnexoSigned";
import { anexosRepo } from "@/lib/repositories/anexos-repo";
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
  useOsFormulariosTemplates, useResponderFormulario, useRespostasFormulario,
  useOsProdutividade, useOsProdutividadeTecnico,
  OS_CATEGORIAS, type OsCategoriaCusto,
  type OsTarefaStatus, type OsFormularioTemplateRow,
} from "@/lib/repositories/os-repo";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

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
          <TabsTrigger value="materiais" className="text-[12px]">Materiais</TabsTrigger>
          <TabsTrigger value="tarefas" className="text-[12px]">Tarefas</TabsTrigger>
          <TabsTrigger value="produtividade" className="text-[12px]">Produtividade</TabsTrigger>
          <TabsTrigger value="formularios" className="text-[12px]">Formulários</TabsTrigger>
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

        <TabsContent value="orcado" className="mt-2"><OrcadoRealizadoTab osId={os.id} /></TabsContent>
        <TabsContent value="custos" className="mt-2"><CustosTab osId={os.id} /></TabsContent>
        <TabsContent value="tarefas" className="mt-2"><TarefasTab osId={os.id} /></TabsContent>
        <TabsContent value="produtividade" className="mt-2"><ProdutividadeTab osId={os.id} /></TabsContent>
        <TabsContent value="formularios" className="mt-2"><FormulariosTab osId={os.id} /></TabsContent>
        <TabsContent value="historico" className="mt-2" id="historico"><HistoricoTab osId={os.id} /></TabsContent>
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

// ═════════════════════════════════════════════════════════════════════
// E.OS.3.b+ — Dashboard, Orçado x Realizado, Custos
// ═════════════════════════════════════════════════════════════════════

function KpiCard({ label, value, hint, tone }: {
  label: string; value: string; hint?: string;
  tone?: "default" | "warn" | "ok" | "danger";
}) {
  const toneClass =
    tone === "ok" ? "text-emerald-600"
    : tone === "warn" ? "text-amber-600"
    : tone === "danger" ? "text-red-600"
    : "text-foreground";
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function DashboardTab({ osId }: { osId: string }) {
  const { data, isLoading, refetch } = useOsDashboard(osId);
  const { data: orc = [] } = useOsOrcadoVsRealizado(osId);
  const { data: tarefas = [] } = useOsTarefas(osId);
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Carregando…</div>;
  if (!data) return <Card className="p-4 text-sm text-muted-foreground">Sem dados.</Card>;

  const desvio = data.custo_realizado - data.custo_previsto;
  const desvioPct = data.custo_previsto > 0 ? (desvio / data.custo_previsto) * 100 : null;
  const tone: "ok" | "warn" | "danger" =
    desvio <= 0 ? "ok" : desvio > data.custo_previsto * 0.1 ? "danger" : "warn";
  const lucroPrev = data.valor_orcado - data.custo_previsto;
  const lucroReal = data.valor_orcado - data.custo_realizado;
  const margPrev = data.valor_orcado > 0 ? (lucroPrev / data.valor_orcado) * 100 : null;
  const margReal = data.valor_orcado > 0 ? (lucroReal / data.valor_orcado) * 100 : null;

  // Alertas operacionais (derivados de dados oficiais)
  const alertas: { tipo: "danger" | "warn"; msg: string }[] = [];
  if (desvio > 0) alertas.push({ tipo: desvioPct && desvioPct > 10 ? "danger" : "warn", msg: `Custo realizado acima do orçado (${fmtMoney(desvio)})` });
  if (desvioPct !== null && desvioPct > 10) alertas.push({ tipo: "danger", msg: `Desvio acima de 10% (${desvioPct.toFixed(1)}%)` });
  if (lucroReal < 0) alertas.push({ tipo: "danger", msg: `Lucro realizado negativo (${fmtMoney(lucroReal)})` });
  const estouroCats = orc.filter((l) => l.semaforo === "ESTOURO").map((l) => l.categoria);
  if (estouroCats.length > 0) alertas.push({ tipo: "danger", msg: `Estouro em categorias: ${estouroCats.join(", ")}` });
  const impedidas = tarefas.filter((t) => t.status === "IMPEDIDA").length;
  if (impedidas > 0) alertas.push({ tipo: "warn", msg: `${impedidas} tarefa(s) impedida(s)` });
  const pausadas = tarefas.filter((t) => t.status === "PAUSA").length;
  if (pausadas > 0) alertas.push({ tipo: "warn", msg: `${pausadas} tarefa(s) em pausa` });
  const semTecnico = tarefas.filter((t) => !t.tecnico_id && t.status !== "FINALIZADA" && t.status !== "CANCELADA").length;
  if (semTecnico > 0) alertas.push({ tipo: "warn", msg: `${semTecnico} tarefa(s) sem técnico responsável` });
  const semPrevisao = tarefas.filter((t) => !t.data_prevista && t.status !== "FINALIZADA" && t.status !== "CANCELADA").length;
  if (semPrevisao > 0) alertas.push({ tipo: "warn", msg: `${semPrevisao} tarefa(s) sem data prevista` });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">Indicadores executivos</h3>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />Atualizar
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Custo previsto" value={fmtMoney(data.custo_previsto)} />
        <KpiCard label="Custo realizado" value={fmtMoney(data.custo_realizado)} />
        <KpiCard label="Desvio" value={fmtMoney(desvio)} hint={desvioPct !== null ? `${desvioPct.toFixed(1)}%` : "—"} tone={tone} />
        <KpiCard label="Valor orçado" value={fmtMoney(data.valor_orcado)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Lucro previsto" value={fmtMoney(lucroPrev)} tone={lucroPrev >= 0 ? "ok" : "danger"} />
        <KpiCard label="Lucro realizado" value={fmtMoney(lucroReal)} tone={lucroReal >= 0 ? "ok" : "danger"} />
        <KpiCard label="Margem prevista" value={margPrev !== null ? `${margPrev.toFixed(1)}%` : "—"} tone={margPrev !== null && margPrev >= 0 ? "ok" : "danger"} />
        <KpiCard label="Margem realizada" value={margReal !== null ? `${margReal.toFixed(1)}%` : "—"} tone={margReal !== null && margReal >= 0 ? "ok" : "danger"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Tarefas abertas" value={String(data.tarefas_pendentes)} />
        <KpiCard label="Tarefas concluídas" value={String(data.tarefas_concluidas)} hint={`de ${data.tarefas_total}`} />
        <KpiCard label="Aderência horas" value={`${Number(data.aderencia_pct).toFixed(0)}%`} />
        <KpiCard label="Anexos" value={String(data.anexos_total)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Formulários respondidos" value={String(data.formularios_respondidos)} />
        <KpiCard label="Serviços faturáveis" value={String(data.servicos_faturaveis)} />
        <KpiCard label="Valor em PV" value={fmtMoney(data.valor_em_pv)} hint="Valor faturável" />
        <KpiCard label="Saldo a faturar" value={fmtMoney(data.valor_em_pv)} hint="Faturamento real em RPC oficial" />
      </div>

      <Card className="p-3">
        <div className="text-[12px] font-semibold mb-2">Alertas operacionais</div>
        {alertas.length === 0 ? (
          <div className="text-[12px] text-emerald-600">✓ Sem alertas — O.S. dentro do esperado.</div>
        ) : (
          <ul className="space-y-1">
            {alertas.map((a, i) => (
              <li key={i} className={`text-[12px] flex items-start gap-2 ${a.tipo === "danger" ? "text-red-700" : "text-amber-700"}`}>
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.tipo === "danger" ? "rgb(185 28 28)" : "rgb(180 83 9)" }} />
                <span>{a.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ProdutividadeTab({ osId }: { osId: string }) {
  const { data: prod, isLoading, refetch } = useOsProdutividade(osId);
  const { data: tarefas = [] } = useOsTarefas(osId);
  const { data: tecnicos = [] } = useOsProdutividadeTecnico();

  // Contagem por status
  const statusCount = TAREFA_STATUSES.map((s) => ({
    status: s.replace("_", " "),
    qtd: tarefas.filter((t) => t.status === s).length,
  })).filter((x) => x.qtd > 0);

  // Tempo médio por tarefa concluída (min)
  const concluidas = tarefas.filter((t) => t.status === "FINALIZADA" && t.data_inicio && t.data_fim);
  const tempoMedio = concluidas.length > 0
    ? concluidas.reduce((acc, t) => {
        const ini = new Date(t.data_inicio!).getTime();
        const fim = new Date(t.data_fim!).getTime();
        return acc + Math.max(0, (fim - ini) / 60000);
      }, 0) / concluidas.length
    : null;

  // Atraso médio (tarefas previstas com data_prevista passada e ainda abertas)
  const hoje = Date.now();
  const atrasadas = tarefas.filter((t) =>
    t.data_prevista && new Date(t.data_prevista).getTime() < hoje &&
    t.status !== "FINALIZADA" && t.status !== "CANCELADA");
  const atrasoMedioDias = atrasadas.length > 0
    ? atrasadas.reduce((acc, t) => acc + (hoje - new Date(t.data_prevista!).getTime()) / 86400000, 0) / atrasadas.length
    : null;

  const taxaConclusao = prod && prod.tarefas_total > 0
    ? (prod.tarefas_concluidas / prod.tarefas_total) * 100 : null;

  const horasData = prod ? [{
    nome: "Horas",
    previstas: +(prod.minutos_previstos / 60).toFixed(1),
    realizadas: +(prod.minutos_realizados / 60).toFixed(1),
  }] : [];

  // Ranking técnicos desta O.S. (tecnicos vem global; filtramos por tecnicos da OS atual)
  const tecnicosOs = new Set(tarefas.map((t) => t.tecnico_id).filter(Boolean) as string[]);
  const rankTecnicos = tecnicos
    .filter((t) => tecnicosOs.has(t.tecnico_id))
    .map((t) => ({
      tecnico: t.tecnico_id.slice(0, 8),
      previstas: +Number(t.horas_previstas ?? 0).toFixed(1),
      realizadas: +Number(t.horas_realizadas ?? 0).toFixed(1),
      eficiencia: t.eficiencia_pct ?? 0,
    }));

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Carregando…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">Produtividade da O.S.</h3>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Horas previstas" value={prod ? `${(prod.minutos_previstos / 60).toFixed(1)}h` : "—"} />
        <KpiCard label="Horas realizadas" value={prod ? `${(prod.minutos_realizados / 60).toFixed(1)}h` : "—"} />
        <KpiCard label="Aderência horas" value={prod?.aderencia_pct != null ? `${prod.aderencia_pct.toFixed(0)}%` : "—"}
          tone={prod?.aderencia_pct != null && prod.aderencia_pct >= 90 ? "ok" : prod?.aderencia_pct != null && prod.aderencia_pct < 70 ? "danger" : "warn"} />
        <KpiCard label="Taxa conclusão" value={taxaConclusao !== null ? `${taxaConclusao.toFixed(0)}%` : "—"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Tarefas abertas" value={String(prod?.tarefas_pendentes ?? 0)} />
        <KpiCard label="Tarefas concluídas" value={String(prod?.tarefas_concluidas ?? 0)} hint={`de ${prod?.tarefas_total ?? 0}`} />
        <KpiCard label="Tempo médio/tarefa" value={tempoMedio !== null ? `${tempoMedio.toFixed(0)} min` : "—"} />
        <KpiCard label="Atraso médio" value={atrasoMedioDias !== null ? `${atrasoMedioDias.toFixed(1)} d` : "—"}
          tone={atrasoMedioDias !== null && atrasoMedioDias > 3 ? "danger" : atrasoMedioDias !== null ? "warn" : "default"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Tarefas impedidas" value={String(tarefas.filter((t) => t.status === "IMPEDIDA").length)}
          tone={tarefas.some((t) => t.status === "IMPEDIDA") ? "danger" : "default"} />
        <KpiCard label="Tarefas em pausa" value={String(tarefas.filter((t) => t.status === "PAUSA").length)}
          tone={tarefas.some((t) => t.status === "PAUSA") ? "warn" : "default"} />
        <KpiCard label="Tarefas atrasadas" value={String(atrasadas.length)}
          tone={atrasadas.length > 0 ? "danger" : "default"} />
        <KpiCard label="Técnicos envolvidos" value={String(tecnicosOs.size)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="text-[12px] font-semibold mb-2">Tarefas por status</div>
          {statusCount.length === 0 ? (
            <div className="text-[12px] text-muted-foreground">Sem tarefas.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusCount} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qtd" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-3">
          <div className="text-[12px] font-semibold mb-2">Horas previstas × realizadas</div>
          {!prod ? (
            <div className="text-[12px] text-muted-foreground">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={horasData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previstas" fill="#94a3b8" name="Previstas" />
                <Bar dataKey="realizadas" fill="#0ea5e9" name="Realizadas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-3">
        <div className="text-[12px] font-semibold mb-2">Ranking por técnico (envolvidos nesta O.S.)</div>
        {rankTecnicos.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">Sem dados de técnicos para esta O.S.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rankTecnicos} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="tecnico" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="previstas" fill="#94a3b8" name="Hrs previstas" />
              <Bar dataKey="realizadas" fill="#0ea5e9" name="Hrs realizadas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}



function semaforoBadge(s: string) {
  const map: Record<string, string> = {
    OK: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ATENCAO: "bg-amber-100 text-amber-700 border-amber-200",
    ESTOURO: "bg-red-100 text-red-700 border-red-200",
    NEUTRO: "bg-muted text-muted-foreground",
  };
  const labelMap: Record<string, string> = {
    OK: "OK", ATENCAO: "Atenção", ESTOURO: "Estouro", NEUTRO: "—",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[s] ?? ""}`}>{labelMap[s] ?? s}</Badge>;
}

function OrcadoRealizadoTab({ osId }: { osId: string }) {
  const { data, isLoading, refetch } = useOsOrcadoVsRealizado(osId);
  const lancar = useLancarOrcamento();
  const [edit, setEdit] = useState<{ cat: OsCategoriaCusto; valor: string } | null>(null);

  const linhas = data ?? [];
  const totais = linhas.reduce(
    (acc, l) => ({
      orc: acc.orc + Number(l.orcado),
      real: acc.real + Number(l.realizado),
    }),
    { orc: 0, real: 0 },
  );
  const variacao = totais.real - totais.orc;

  return (
    <div className="space-y-3">
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="text-[11px]">Categoria</TableHead>
              <TableHead className="text-[11px] text-right">Orçado</TableHead>
              <TableHead className="text-[11px] text-right">Realizado</TableHead>
              <TableHead className="text-[11px] text-right">Variação R$</TableHead>
              <TableHead className="text-[11px] text-right">Variação %</TableHead>
              <TableHead className="text-[11px] w-24">Status</TableHead>
              <TableHead className="text-[11px] w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-[12px]">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && OS_CATEGORIAS.map((c) => {
              const linha = linhas.find((l) => l.categoria === c.codigo);
              return (
                <TableRow key={c.codigo} className="h-8 text-[12px]">
                  <TableCell>{c.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(linha?.orcado ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(linha?.realizado ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(linha?.variacao_rs ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{linha?.variacao_pct != null ? `${linha.variacao_pct.toFixed(1)}%` : "—"}</TableCell>
                  <TableCell>{semaforoBadge(linha?.semaforo ?? "NEUTRO")}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                      onClick={() => setEdit({ cat: c.codigo, valor: String(linha?.orcado ?? "") })}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="h-8 text-[12px] font-semibold border-t-2">
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">{fmtMoney(totais.orc)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtMoney(totais.real)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtMoney(variacao)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {totais.orc > 0 ? `${((variacao / totais.orc) * 100).toFixed(1)}%` : "—"}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Orçamento — {edit ? OS_CATEGORIAS.find((c) => c.codigo === edit.cat)?.label : ""}</DialogTitle>
            <DialogDescription>Define o valor previsto para esta categoria nesta O.S.</DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div>
                <Label className="text-[11px]">Valor (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={edit.valor}
                  onChange={(e) => setEdit({ ...edit, valor: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    const v = parseFloat(edit.valor || "0");
                    if (Number.isNaN(v) || v < 0) { toast.error("Valor inválido"); return; }
                    try {
                      await lancar.mutateAsync({ os_id: osId, categoria: edit.cat, valor: v });
                      toast.success("Orçamento atualizado");
                      setEdit(null); refetch();
                    } catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
                  }}
                  disabled={lancar.isPending}
                >
                  {lancar.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustosTab({ osId }: { osId: string }) {
  const { data, isLoading, refetch } = useOsCustosRealizados(osId);
  const lancar = useLancarCustoRealizado();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    categoria: OsCategoriaCusto; valor: string; data_custo: string; descricao: string;
  }>({ categoria: "MATERIAL", valor: "", data_custo: new Date().toISOString().slice(0, 10), descricao: "" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">
          {isLoading ? "Carregando…" : `${data?.length ?? 0} lançamento(s)`}
        </div>
        <Button size="sm" className="h-8 text-[12px]" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo custo
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="text-[11px]">Data</TableHead>
              <TableHead className="text-[11px]">Categoria</TableHead>
              <TableHead className="text-[11px]">Descrição</TableHead>
              <TableHead className="text-[11px]">Origem</TableHead>
              <TableHead className="text-[11px] text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-[12px] text-muted-foreground">
                Nenhum custo realizado lançado.
              </TableCell></TableRow>
            )}
            {(data ?? []).map((c) => (
              <TableRow key={c.id} className="h-8 text-[12px]">
                <TableCell className="tabular-nums">{fmtDate(c.data_custo)}</TableCell>
                <TableCell>{OS_CATEGORIAS.find((x) => x.codigo === c.categoria)?.label ?? c.categoria}</TableCell>
                <TableCell className="max-w-[280px] truncate" title={c.descricao ?? ""}>{c.descricao ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{c.origem_tipo ?? "MANUAL"}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(c.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar custo realizado</DialogTitle>
            <DialogDescription>Registra um custo efetivamente incorrido nesta O.S.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label className="text-[11px]">Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as OsCategoriaCusto })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OS_CATEGORIAS.map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Data</Label>
                <Input type="date" value={form.data_custo}
                  onChange={(e) => setForm({ ...form, data_custo: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">Descrição</Label>
              <Textarea rows={2} value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                const v = parseFloat(form.valor || "0");
                if (Number.isNaN(v) || v <= 0) { toast.error("Valor inválido"); return; }
                try {
                  await lancar.mutateAsync({
                    os_id: osId, categoria: form.categoria, valor: v,
                    data_custo: form.data_custo, descricao: form.descricao || undefined,
                  });
                  toast.success("Custo lançado");
                  setOpen(false);
                  setForm({ ...form, valor: "", descricao: "" });
                  refetch();
                } catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
              }}
              disabled={lancar.isPending}
            >
              {lancar.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Lançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// E.OS.4 — Formulários da O.S.
// ═════════════════════════════════════════════════════════════════════
interface CampoModelo {
  id: string; tipo: string; titulo: string; descricao?: string;
  obrigatorio?: boolean; ajuda?: string; opcoes?: string[];
}

// Forma canônica armazenada no jsonb `respostas` p/ campos com arquivo.
export interface AnexoRef {
  anexo_id: string; storage_path: string; nome: string; mime: string; tamanho: number;
}
export interface AssinaturaRef extends AnexoRef {
  signatario?: string; assinado_em: string;
}


function FormulariosTab({ osId }: { osId: string }) {
  const { data: tarefas = [] } = useOsTarefas(osId);
  const { data: modelos = [] } = useOsFormulariosTemplates();
  const [responder, setResponder] = useState<{ tarefaId: string; modelo: OsFormularioTemplateRow } | null>(null);
  const [verRespostas, setVerRespostas] = useState<string | null>(null);

  const disponiveis = modelos.filter((m) => (m.status_modelo === "PUBLICADO" || m.status_modelo === "APROVADO") && m.ativo);

  return (
    <div className="space-y-2">
      <Card className="p-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[13px] font-semibold">Formulários por tarefa</h3>
            <p className="text-[11.5px] text-muted-foreground">
              Selecione um modelo publicado/aprovado para responder dentro de uma tarefa.
            </p>
          </div>
          <Link to="/engenharia/gestao-servicos/modelos">
            <Button size="sm" variant="outline" className="h-7"><FileText className="h-3.5 w-3.5 mr-1" />Gerenciar modelos</Button>
          </Link>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="text-[11.5px]">Tarefa</TableHead>
              <TableHead className="text-[11.5px]">Status</TableHead>
              <TableHead className="text-[11.5px]">Modelo</TableHead>
              <TableHead className="text-[11.5px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tarefas.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-[12px] text-muted-foreground py-4">Nenhuma tarefa cadastrada.</TableCell></TableRow>
            )}
            {tarefas.map((t) => (
              <FormulariosTarefaRow
                key={t.id}
                tarefaId={t.id}
                nome={t.nome}
                status={t.status}
                modelos={disponiveis}
                onResponder={(modelo) => setResponder({ tarefaId: t.id, modelo })}
                onVer={() => setVerRespostas(t.id)}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      {responder && (
        <ResponderFormularioDialog
          tarefaId={responder.tarefaId}
          modelo={responder.modelo}
          onClose={() => setResponder(null)}
        />
      )}

      {verRespostas && (
        <VerRespostasDialog tarefaId={verRespostas} onClose={() => setVerRespostas(null)} />
      )}
    </div>
  );
}

function FormulariosTarefaRow({
  tarefaId, nome, status, modelos, onResponder, onVer,
}: {
  tarefaId: string; nome: string; status: string;
  modelos: OsFormularioTemplateRow[];
  onResponder: (m: OsFormularioTemplateRow) => void;
  onVer: () => void;
}) {
  const { data: respostas = [] } = useRespostasFormulario(tarefaId);
  const [sel, setSel] = useState<string>("");
  const modeloSel = modelos.find((m) => m.id === sel);
  return (
    <TableRow className="h-9">
      <TableCell className="text-[12.5px]">{nome}</TableCell>
      <TableCell><Badge variant="outline" className="text-[10.5px]">{status}</Badge></TableCell>
      <TableCell>
        <Select value={sel} onValueChange={setSel}>
          <SelectTrigger className="h-7 text-[12px] w-[260px]"><SelectValue placeholder="Selecionar modelo…" /></SelectTrigger>
          <SelectContent>
            {modelos.length === 0 && <div className="px-2 py-1 text-[11.5px] text-muted-foreground">Nenhum modelo publicado.</div>}
            {modelos.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.nome} v{m.versao}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1">
          <Badge variant="secondary" className="text-[10.5px]">{respostas.length} resp.</Badge>
          <Button size="sm" variant="ghost" className="h-7" onClick={onVer} disabled={respostas.length === 0}>Ver</Button>
          <Button size="sm" variant="default" className="h-7 bg-emerald-600 hover:bg-emerald-700" disabled={!modeloSel} onClick={() => modeloSel && onResponder(modeloSel)}>
            Responder
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ResponderFormularioDialog({
  tarefaId, modelo, onClose,
}: { tarefaId: string; modelo: OsFormularioTemplateRow; onClose: () => void }) {
  const campos = (Array.isArray(modelo.campos) ? modelo.campos : []) as CampoModelo[];
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const responder = useResponderFormulario();

  function setVal(id: string, v: unknown) { setValores((p) => ({ ...p, [id]: v })); }
  function coletarGeo() {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (e) => toast.error("Falha geo: " + e.message),
    );
  }

  async function handleSalvar() {
    for (const c of campos) {
      if (c.obrigatorio && (valores[c.id] == null || valores[c.id] === "")) {
        toast.error(`Campo obrigatório: ${c.titulo}`); return;
      }
    }
    try {
      const payload: Record<string, unknown> = {
        ...valores,
        __meta: {
          respondido_em_local: new Date().toISOString(),
          geo: geo ?? null,
          modelo_versao: modelo.versao,
          modelo_tipo: modelo.tipo,
        },
      };
      await responder.mutateAsync({
        tarefa_id: tarefaId,
        formulario_id: modelo.id,
        respostas: payload,
        idempotency_key: `${tarefaId}:${modelo.id}:${Date.now()}`,
      });
      toast.success("Formulário registrado e auditado.");
      onClose();
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modelo.nome} <span className="text-xs text-muted-foreground">v{modelo.versao}</span></DialogTitle>
          <DialogDescription>{modelo.descricao ?? "Responder o formulário para esta tarefa."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {campos.map((c) => (
            <div key={c.id} className="space-y-1">
              <Label className="text-[12px]">
                {c.titulo}{c.obrigatorio && <span className="text-red-600">*</span>}
              </Label>
              {c.descricao && <p className="text-[11px] text-muted-foreground">{c.descricao}</p>}
              <CampoInput campo={c} valor={valores[c.id]} onChange={(v) => setVal(c.id, v)} tarefaId={tarefaId} modeloId={modelo.id} />
            </div>
          ))}

          <div className="border-t pt-2 mt-2 flex items-center justify-between">
            <div className="text-[11.5px] text-muted-foreground">
              Geolocalização: {geo ? `${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)}` : "—"}
            </div>
            <Button size="sm" variant="outline" className="h-7" onClick={coletarGeo}>Coletar GPS</Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="h-8">Cancelar</Button>
          <Button onClick={handleSalvar} disabled={responder.isPending} className="h-8 bg-emerald-600 hover:bg-emerald-700">
            {responder.isPending ? "Salvando…" : "Salvar resposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampoInput({
  campo, valor, onChange, tarefaId, modeloId,
}: {
  campo: CampoModelo; valor: unknown; onChange: (v: unknown) => void;
  tarefaId: string; modeloId: string;
}) {
  const v = valor as string | number | string[] | undefined;
  const placeholder = campo.ajuda ?? "";
  switch (campo.tipo) {
    case "textarea":
    case "observacao":
      return <Textarea value={(v as string) ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="text-[12.5px]" />;
    case "numero":
    case "moeda":
      return <Input type="number" step="0.01" value={(v as number) ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-8 text-[12.5px]" />;
    case "data":
      return <Input type="date" value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-[12.5px]" />;
    case "hora":
      return <Input type="time" value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-[12.5px]" />;
    case "selecao":
      return (
        <Select value={(v as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>
            {(campo.opcoes ?? []).map((o, i) => <SelectItem key={i} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "multipla":
    case "checklist": {
      const arr = (Array.isArray(v) ? v : []) as string[];
      return (
        <div className="space-y-1">
          {(campo.opcoes ?? []).map((o, i) => {
            const checked = arr.includes(o);
            return (
              <label key={i} className="flex items-center gap-2 text-[12.5px]">
                <input type="checkbox" checked={checked} onChange={(e) => {
                  const next = e.target.checked ? [...arr, o] : arr.filter((x) => x !== o);
                  onChange(next);
                }} />
                {o}
              </label>
            );
          })}
        </div>
      );
    }
    case "foto":
      return <AnexoUploader accept="image/*" multiple campo={campo} tarefaId={tarefaId} modeloId={modeloId} valor={valor} onChange={onChange} preview />;
    case "anexo":
      return <AnexoUploader campo={campo} tarefaId={tarefaId} modeloId={modeloId} valor={valor} onChange={onChange} />;
    case "assinatura":
      return <AssinaturaCampo campo={campo} tarefaId={tarefaId} modeloId={modeloId} valor={valor} onChange={onChange} />;
    case "geolocalizacao":
      return <Input value={(v as string) ?? ""} placeholder="lat, lon" onChange={(e) => onChange(e.target.value)} className="h-8 text-[12.5px]" />;
    case "texto":
    default:
      return <Input value={(v as string) ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-8 text-[12.5px]" />;
  }
}

// ── Uploader genérico (foto / anexo) ─────────────────────────────────────
function AnexoUploader({
  campo, tarefaId, modeloId, valor, onChange, accept, multiple, preview,
}: {
  campo: CampoModelo; tarefaId: string; modeloId: string;
  valor: unknown; onChange: (v: unknown) => void;
  accept?: string; multiple?: boolean; preview?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const lista = (Array.isArray(valor) ? valor : []) as AnexoRef[];
  const categoria = `formulario:${modeloId}:${campo.id}`;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const novos: AnexoRef[] = [];
      for (const f of Array.from(files)) {
        const a = await anexosRepo.upload("tarefas", tarefaId, f, { categoria, observacao: campo.titulo });
        novos.push({ anexo_id: a.id, storage_path: a.storage_path, nome: a.nome, mime: a.mime, tamanho: a.tamanho });
      }
      onChange([...lista, ...novos]);
      toast.success(`${novos.length} arquivo(s) anexado(s).`);
    } catch (e) {
      toast.error("Falha upload: " + (e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remover(idx: number) {
    const item = lista[idx]; if (!item) return;
    try {
      await anexosRepo.remover(item.anexo_id, "Removido antes de salvar resposta");
      onChange(lista.filter((_, i) => i !== idx));
      toast.success("Anexo removido.");
    } catch (e) {
      toast.error("Falha remover: " + (e as Error).message);
    }
  }

  return (
    <div className="space-y-1">
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={(e) => handleFiles(e.target.files)} />
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="outline" className="h-7"
          onClick={() => inputRef.current?.click()} disabled={busy}>
          {accept?.startsWith("image/")
            ? <><Camera className="h-3.5 w-3.5 mr-1" />Anexar foto</>
            : <><Paperclip className="h-3.5 w-3.5 mr-1" />Anexar arquivo</>}
        </Button>
        {busy && <span className="text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 inline animate-spin mr-1" />Enviando…</span>}
      </div>
      {lista.length > 0 && (
        <div className={preview ? "grid grid-cols-2 sm:grid-cols-3 gap-1.5" : "space-y-1"}>
          {lista.map((a, i) => (
            <div key={a.anexo_id} className="border rounded p-1 bg-muted/30 relative">
              {preview && a.mime.startsWith("image/")
                ? <AnexoSignedImage storagePath={a.storage_path} nome={a.nome} />
                : <AnexoSignedLink storagePath={a.storage_path} nome={a.nome} />}
              <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 absolute top-0 right-0"
                title="Remover anexo" onClick={() => remover(i)}>
                <X className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Campo Assinatura (canvas) ────────────────────────────────────────────
function AssinaturaCampo({
  campo, tarefaId, modeloId, valor, onChange,
}: {
  campo: CampoModelo; tarefaId: string; modeloId: string;
  valor: unknown; onChange: (v: unknown) => void;
}) {
  const atual = (valor && typeof valor === "object" ? valor : null) as AssinaturaRef | null;
  const [signatario, setSignatario] = useState<string>(atual?.signatario ?? "");
  const categoria = `formulario:${modeloId}:${campo.id}:assinatura`;

  async function handleSave(blob: Blob) {
    try {
      const file = new File([blob], `assinatura-${Date.now()}.png`, { type: "image/png" });
      const a = await anexosRepo.upload("tarefas", tarefaId, file, { categoria, observacao: signatario || campo.titulo });
      const ref: AssinaturaRef = {
        anexo_id: a.id, storage_path: a.storage_path, nome: a.nome, mime: a.mime, tamanho: a.tamanho,
        signatario: signatario || undefined, assinado_em: new Date().toISOString(),
      };
      onChange(ref);
      toast.success("Assinatura salva.");
    } catch (e) {
      toast.error("Falha assinatura: " + (e as Error).message);
    }
  }

  async function limpar() {
    if (!atual) return;
    try {
      await anexosRepo.remover(atual.anexo_id, "Assinatura redesenhada");
      onChange(null);
      toast.success("Assinatura removida.");
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    }
  }

  return (
    <div className="space-y-1.5 border rounded p-2 bg-muted/20">
      <div className="flex items-center gap-2">
        <Input value={signatario} placeholder="Nome do signatário (opcional)"
          onChange={(e) => setSignatario(e.target.value)} className="h-7 text-[12px]" />
        {atual && <Badge variant="outline" className="text-[10.5px] bg-emerald-50 text-emerald-700 border-emerald-200">Assinado</Badge>}
      </div>
      {atual ? (
        <div className="space-y-1">
          <AnexoSignedImage storagePath={atual.storage_path} nome={atual.nome} alt="assinatura" />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-muted-foreground">
              {new Date(atual.assinado_em).toLocaleString("pt-BR")}{atual.signatario ? ` · ${atual.signatario}` : ""}
            </span>
            <Button type="button" size="sm" variant="outline" className="h-7" onClick={limpar}>
              <PenLine className="h-3.5 w-3.5 mr-1" />Reassinar
            </Button>
          </div>
        </div>
      ) : (
        <SignaturePad onSave={handleSave} />
      )}
    </div>
  );
}



function VerRespostasDialog({ tarefaId, onClose }: { tarefaId: string; onClose: () => void }) {
  const { data: respostas = [], isLoading } = useRespostasFormulario(tarefaId);
  const { data: modelos = [] } = useOsFormulariosTemplates();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de respostas</DialogTitle>
          <DialogDescription>Append-only — fotos, anexos, assinatura e geolocalização auditados em <code>os_eventos</code>.</DialogDescription>
        </DialogHeader>
        {isLoading ? <p className="text-[12px]">Carregando…</p> : respostas.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Nenhuma resposta.</p>
        ) : (
          <div className="space-y-2">
            {respostas.map((r) => {
              const modelo = modelos.find((m) => m.id === r.formulario_id);
              return <RespostaCard key={r.id} resposta={r} modelo={modelo ?? null} />;
            })}
          </div>
        )}
        <DialogFooter><Button onClick={onClose} className="h-8">Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RespostaCard({
  resposta, modelo,
}: { resposta: { id: string; respondido_em: string; respondido_por: string | null; formulario_id: string; respostas: unknown }; modelo: OsFormularioTemplateRow | null }) {
  const campos = (modelo && Array.isArray(modelo.campos) ? modelo.campos : []) as CampoModelo[];
  const respObj = (resposta.respostas && typeof resposta.respostas === "object" ? resposta.respostas : {}) as Record<string, unknown>;
  const meta = (respObj.__meta && typeof respObj.__meta === "object" ? respObj.__meta : null) as null | { geo?: { lat: number; lon: number } | null; modelo_versao?: number };
  const geo = meta?.geo ?? null;

  return (
    <Card className="p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11.5px] text-muted-foreground">
          {new Date(resposta.respondido_em).toLocaleString("pt-BR")} · por {resposta.respondido_por ?? "—"}
          {modelo && <> · <strong>{modelo.nome}</strong> v{meta?.modelo_versao ?? modelo.versao}</>}
        </span>
        <Badge variant="outline" className="text-[10.5px] font-mono">{resposta.formulario_id.slice(0, 8)}</Badge>
      </div>

      {campos.length === 0 ? (
        <pre className="text-[11.5px] bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(respObj, null, 2)}
        </pre>
      ) : (
        <div className="space-y-1.5 divide-y">
          {campos.map((c) => (
            <div key={c.id} className="pt-1.5 first:pt-0">
              <div className="text-[11px] font-semibold text-muted-foreground">{c.titulo}</div>
              <RespostaValor campo={c} valor={respObj[c.id]} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground border-t pt-1.5">
        {geo
          ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{geo.lat.toFixed(5)}, {geo.lon.toFixed(5)} · <a className="text-blue-700 hover:underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${geo.lat},${geo.lon}`}>abrir no mapa</a></span>
          : <span className="inline-flex items-center gap-1 opacity-70"><MapPin className="h-3 w-3" />sem geo</span>}
      </div>
    </Card>
  );
}

function RespostaValor({ campo, valor }: { campo: CampoModelo; valor: unknown }) {
  if (valor == null || valor === "") return <span className="text-[12px] text-muted-foreground italic">— vazio</span>;
  switch (campo.tipo) {
    case "checklist":
    case "multipla":
      return <div className="text-[12px]">{(Array.isArray(valor) ? valor : []).join(", ") || "—"}</div>;
    case "foto": {
      const arr = (Array.isArray(valor) ? valor : []) as AnexoRef[];
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
          {arr.map((a) => <AnexoSignedImage key={a.anexo_id} storagePath={a.storage_path} nome={a.nome} />)}
        </div>
      );
    }
    case "anexo": {
      const arr = (Array.isArray(valor) ? valor : []) as AnexoRef[];
      return (
        <div className="space-y-1 mt-1">
          {arr.map((a) => <AnexoSignedLink key={a.anexo_id} storagePath={a.storage_path} nome={a.nome} />)}
        </div>
      );
    }
    case "assinatura": {
      const a = valor as AssinaturaRef;
      if (!a?.storage_path) return <span className="text-[12px] text-muted-foreground italic">— sem assinatura</span>;
      return (
        <div className="space-y-1 mt-1">
          <AnexoSignedImage storagePath={a.storage_path} nome={a.nome} alt="assinatura" />
          <div className="text-[11px] text-muted-foreground">
            {a.signatario ? <>Signatário: <strong>{a.signatario}</strong> · </> : null}
            {new Date(a.assinado_em).toLocaleString("pt-BR")}
          </div>
        </div>
      );
    }
    case "moeda":
      return <div className="text-[12px]">{fmtMoney(Number(valor))}</div>;
    case "data":
      return <div className="text-[12px]">{fmtDate(String(valor))}</div>;
    default:
      return <div className="text-[12px] whitespace-pre-wrap break-words">{String(valor)}</div>;
  }
}



