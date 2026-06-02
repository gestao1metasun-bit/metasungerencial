// ============================================================================
// D5.2 — Central de Aprovações operacional.
// Fila real consumindo workflow_aprovacoes + RPCs aprovar/negar/cancelar.
// Backend não é tocado: apenas leitura via RLS e RPCs existentes.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  EnterpriseDataGrid, exportToCSV,
} from "@/components/app/grid/EnterpriseDataGrid";
import { EnterpriseRecordToolbar, ribbonRmAprovacao, layoutBarRm } from "@/components/app/enterprise";
import {
  useWorkflowAprovacoes, useWorkflowHistorico,
  useAprovarSolicitacao, useNegarSolicitacao, useCancelarSolicitacao,
  WF_STATUS_LABEL, WF_STATUS_TONE, WF_TIPO_LABEL,
  slaEmRisco, slaExpirada,
  type WorkflowAprovacao, type Filtro,
} from "@/hooks/useWorkflowAprovacoes";
import { useAuth } from "@/lib/auth-store";
import {
  Inbox, ClipboardCheck, Clock, ShieldCheck, Check, X, Eye, AlertTriangle, Ban,
} from "lucide-react";
import UnificadaTab from "@/modules/aprovacoes/UnificadaTab";




export const Route = createFileRoute("/aprovacoes")({
  head: () => ({
    meta: [
      { title: "Central de Aprovações — Meta Sun" },
      { name: "description", content: "Fila operacional de aprovações por alçada — workflow_aprovacoes." },
    ],
  }),
  component: AprovacoesPage,
});

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

const fmtData = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

function AprovacoesPage() {
  const auth = useAuth();
  const uid = auth.user?.id ?? null;

  const [tab, setTab] = useState<Filtro>("pendentes_para_mim");
  const [tipoFiltro, setTipoFiltro] = useState<string>("TODOS");
  const [statusHist, setStatusHist] = useState<"TODOS" | "APROVADA" | "NEGADA" | "EXPIRADA" | "CANCELADA">("TODOS");
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState<WorkflowAprovacao | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acao, setAcao] = useState<{
    kind: "aprovar" | "negar" | "cancelar"; row: WorkflowAprovacao;
  } | null>(null);


  // Carregamos as quatro filas para alimentar StatCards (chaves separadas).
  const pendentesParaMim = useWorkflowAprovacoes("pendentes_para_mim");
  const minhas = useWorkflowAprovacoes("minhas");
  const historico = useWorkflowAprovacoes("historico");

  const ativa = useMemo(() => {
    if (tab === "minhas") return minhas;
    if (tab === "historico") return historico;
    return pendentesParaMim;
  }, [tab, pendentesParaMim, minhas, historico]);

  const filtrados = useMemo(() => {
    let rows = ativa.data ?? [];
    if (tipoFiltro !== "TODOS") rows = rows.filter((r) => r.tipo_operacao === tipoFiltro);
    if (tab === "historico" && statusHist !== "TODOS") {
      rows = rows.filter((r) => r.status === statusHist);
    }
    if (busca.trim()) {
      const t = busca.trim().toLowerCase();
      rows = rows.filter((r) =>
        [r.codigo, r.titulo, r.descricao, r.setor, r.solicitante_email].some(
          (v) => v?.toLowerCase().includes(t),
        ),
      );
    }
    return rows;
  }, [ativa.data, tipoFiltro, busca, tab, statusHist]);

  const counts = useMemo(() => {
    const pend = pendentesParaMim.data ?? [];
    const min = minhas.data ?? [];
    const hist = historico.data ?? [];
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const aprovadasHoje = hist.filter(
      (r) => r.status === "APROVADA" && r.decidido_em && new Date(r.decidido_em) >= hoje,
    ).length;
    return {
      pendentes_para_mim: pend.length,
      minhas_pendentes: min.filter((r) => r.status === "PENDENTE").length,
      sla_risco: pend.filter((r) => slaEmRisco(r) || slaExpirada(r)).length,
      aprovadas_hoje: aprovadasHoje,
    };
  }, [pendentesParaMim.data, minhas.data, historico.data]);

  const tiposDisponiveis = useMemo(() => {
    const s = new Set<string>();
    (ativa.data ?? []).forEach((r) => s.add(r.tipo_operacao));
    return Array.from(s).sort();
  }, [ativa.data]);

  const selectedRow = useMemo(
    () => filtrados.find((r) => r.id === selectedId) ?? null,
    [filtrados, selectedId],
  );
  const podeAprovarSelecionada = !!selectedRow && selectedRow.status === "PENDENTE" && selectedRow.solicitante_id !== uid;
  const podeCancelarSelecionada = !!selectedRow && selectedRow.status === "PENDENTE" && selectedRow.solicitante_id === uid;

  const refreshAll = () => {
    void pendentesParaMim.refetch();
    void minhas.refetch();
    void historico.refetch();
  };
  const exportarAtual = () =>
    exportToCSV(`aprovacoes-${tab}`, filtrados, [
      { key: "codigo", label: "Código" },
      { key: "tipo_operacao", label: "Tipo", get: (r) => WF_TIPO_LABEL[r.tipo_operacao] ?? r.tipo_operacao },
      { key: "titulo", label: "Título" },
      { key: "valor", label: "Valor", get: (r) => Number(r.valor ?? 0).toFixed(2) },
      { key: "setor", label: "Setor" },
      { key: "solicitante_email", label: "Solicitante" },
      { key: "status", label: "Status", get: (r) => WF_STATUS_LABEL[r.status] ?? r.status },
      { key: "solicitado_em", label: "Solicitado em", get: (r) => fmtData(r.solicitado_em) },
      { key: "decidido_em", label: "Decidido em", get: (r) => fmtData(r.decidido_em) },
    ]);

  return (
    <div className="space-y-3 p-2 md:p-3">
      <PageHeader
        eyebrow="Workflow Corporativo"
        title="Central de Aprovações"
        subtitle="Fila operacional por alçada — compras, materiais e descontos."
      />

      <EnterpriseRecordToolbar
        entityType="aprovacoes"
        availableActions={["visualizar", "atualizar", "anexos", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
        selectedIds={selectedRow ? [selectedRow.id] : []}
        searchPlaceholder="Buscar código, título, setor, solicitante…"
        search={busca}
        onSearchChange={setBusca}
        statusActions={ribbonRmAprovacao({
          aprovar: podeAprovarSelecionada ? () => setAcao({ kind: "aprovar", row: selectedRow! }) : undefined,
          reprovar: selectedRow?.status === "PENDENTE" && selectedRow.solicitante_id !== uid
            ? () => setAcao({ kind: "negar", row: selectedRow! }) : undefined,
          cancelar: podeCancelarSelecionada ? () => setAcao({ kind: "cancelar", row: selectedRow! }) : undefined,
          visualizar: selectedRow ? () => setDetalhe(selectedRow) : undefined,
        })}
        layoutBar={layoutBarRm()}
        onAction={(a) => {
          if (a === "atualizar") refreshAll();
          else if (a === "exportar") exportarAtual();
          else if (a === "imprimir") window.print();
          else if (a === "visualizar" && selectedRow) setDetalhe(selectedRow);
          else if (a === "historico" && selectedRow) setDetalhe(selectedRow);
        }}
      />


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Pendentes para mim" value={counts.pendentes_para_mim} icon={Inbox} />
        <StatCard label="Minhas pendentes" value={counts.minhas_pendentes} icon={ClipboardCheck} />
        <StatCard label="SLA em risco" value={counts.sla_risco} icon={Clock} />
        <StatCard label="Aprovadas hoje" value={counts.aprovadas_hoje} icon={ShieldCheck} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Filtro)}>
        <TabsList>
          <TabsTrigger value="pendentes_para_mim">
            Pendentes para mim
            {counts.pendentes_para_mim > 0 && (
              <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                {counts.pendentes_para_mim}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="minhas">Minhas solicitações</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {tab === "historico" && (
          <div className="flex flex-wrap items-center gap-1.5 rounded border border-border/70 bg-muted/30 px-2 py-1 text-[11px] mt-2">
            <span className="font-bold uppercase tracking-wider text-muted-foreground/80 mr-2">Status</span>
            {(["TODOS","APROVADA","NEGADA","EXPIRADA","CANCELADA"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatusHist(k)}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition ${
                  statusHist === k ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "hover:bg-background"
                }`}
              >
                <span className="text-muted-foreground">{k === "TODOS" ? "Todos" : WF_STATUS_LABEL[k] ?? k}</span>
                <span className="font-mono font-semibold tabular-nums">
                  {k === "TODOS" ? (historico.data ?? []).length : (historico.data ?? []).filter((r) => r.status === k).length}
                </span>
              </button>
            ))}
          </div>
        )}

        <TabsContent value={tab} className="pt-3">
          <EnterpriseDataGrid
            gridId={`aprovacoes-${tab}`}
            title="Fila de aprovações"
            count={filtrados.length}
            toolbar={{
              onRefresh: refreshAll,
              onExport: exportarAtual,
            }}

            filters={{
              search: busca,
              onSearchChange: setBusca,
              searchPlaceholder: "Buscar código, título, setor, solicitante…",
              onClear: busca || tipoFiltro !== "TODOS" ? () => { setBusca(""); setTipoFiltro("TODOS"); } : undefined,
              children: (
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="h-7 w-44 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os tipos</SelectItem>
                    {tiposDisponiveis.map((t) => (
                      <SelectItem key={t} value={t}>{WF_TIPO_LABEL[t] ?? t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ativa.isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      Carregando fila…
                    </TableCell>
                  </TableRow>
                )}
                {!ativa.isLoading && filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      {tab === "pendentes_para_mim"
                        ? "Nenhuma solicitação pendente para sua alçada."
                        : tab === "minhas"
                        ? "Você ainda não criou solicitações."
                        : "Sem histórico para os filtros atuais."}
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((r) => {
                  const risco = slaEmRisco(r);
                  const expirada = slaExpirada(r);
                  const isMinha = r.solicitante_id === uid;
                  const isSelected = r.id === selectedId;
                  return (
                    <TableRow
                      key={r.id}
                      data-state={isSelected ? "selected" : undefined}
                      className={isSelected ? "bg-primary/5" : "cursor-pointer"}
                      onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    >

                      <TableCell className="font-mono text-[11px]">{r.codigo ?? r.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-normal">
                          {WF_TIPO_LABEL[r.tipo_operacao] ?? r.tipo_operacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate" title={r.titulo}>{r.titulo}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(r.valor)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.setor ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {r.solicitante_email ?? r.solicitante_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {expirada ? (
                          <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Expirada
                          </Badge>
                        ) : risco ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> &lt; 24h
                          </Badge>
                        ) : r.expira_em ? (
                          <span className="text-[11px] text-muted-foreground">{fmtData(r.expira_em)}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={WF_STATUS_TONE[r.status]} variant="outline">
                          {WF_STATUS_LABEL[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setDetalhe(r)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {r.status === "PENDENTE" && !isMinha && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setAcao({ kind: "aprovar", row: r })}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50"
                                onClick={() => setAcao({ kind: "negar", row: r })}
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Negar
                              </Button>
                            </>
                          )}
                          {r.status === "PENDENTE" && isMinha && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-muted-foreground"
                              onClick={() => setAcao({ kind: "cancelar", row: r })}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </EnterpriseDataGrid>
        </TabsContent>
      </Tabs>

      <DetalheDialog row={detalhe} onClose={() => setDetalhe(null)} />
      <AcaoDialog
        acao={acao}
        onClose={() => setAcao(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function DetalheDialog({ row, onClose }: { row: WorkflowAprovacao | null; onClose: () => void }) {
  const { data: hist = [] } = useWorkflowHistorico(row?.id);
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{row?.codigo}</span>
            {row?.titulo}
          </DialogTitle>
          <DialogDescription>
            {WF_TIPO_LABEL[row?.tipo_operacao ?? ""] ?? row?.tipo_operacao} ·{" "}
            <Badge className={row ? WF_STATUS_TONE[row.status] : ""} variant="outline">
              {row ? WF_STATUS_LABEL[row.status] : ""}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        {row && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Valor" value={fmtBRL(row.valor)} />
              <Info label="Setor" value={row.setor ?? "—"} />
              <Info label="Solicitante" value={row.solicitante_email ?? row.solicitante_id} />
              <Info label="Solicitado em" value={fmtData(row.solicitado_em)} />
              <Info label="Expira em" value={fmtData(row.expira_em)} />
              <Info label="Decidido em" value={fmtData(row.decidido_em)} />
              <Info label="Origem" value={row.origem_tipo ? `${row.origem_tipo}/${row.origem_id?.slice(0, 8) ?? "—"}` : "—"} />
              <Info label="Aprovador" value={row.aprovador_email ?? "—"} />
            </div>
            {row.descricao && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Descrição</div>
                <div className="rounded border bg-muted/30 p-2 text-xs">{row.descricao}</div>
              </div>
            )}
            {row.motivo_solicitacao && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Motivo da solicitação</div>
                <div className="rounded border bg-muted/30 p-2 text-xs">{row.motivo_solicitacao}</div>
              </div>
            )}
            {row.motivo_decisao && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Motivo da decisão</div>
                <div className="rounded border bg-muted/30 p-2 text-xs">{row.motivo_decisao}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Histórico</div>
              <div className="max-h-40 overflow-y-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Quando</TableHead>
                      <TableHead className="text-[10px]">De → Para</TableHead>
                      <TableHead className="text-[10px]">Por</TableHead>
                      <TableHead className="text-[10px]">Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hist.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">Sem eventos.</TableCell></TableRow>
                    )}
                    {hist.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-[11px]">{fmtData(h.created_at)}</TableCell>
                        <TableCell className="text-[11px]">
                          {h.status_anterior ?? "—"} → <strong>{h.status_novo}</strong>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{h.user_email ?? "—"}</TableCell>
                        <TableCell className="text-[11px]">{h.motivo ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs">{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function AcaoDialog({
  acao, onClose,
}: { acao: { kind: "aprovar" | "negar" | "cancelar"; row: WorkflowAprovacao } | null; onClose: () => void }) {
  const [motivo, setMotivo] = useState("");
  const aprovar = useAprovarSolicitacao();
  const negar = useNegarSolicitacao();
  const cancelar = useCancelarSolicitacao();

  if (!acao) return null;
  const { kind, row } = acao;
  const motivoObrigatorio = kind !== "aprovar";
  const titulo =
    kind === "aprovar" ? "Aprovar solicitação"
    : kind === "negar" ? "Negar solicitação"
    : "Cancelar solicitação";

  function close() { setMotivo(""); onClose(); }

  async function confirm() {
    if (motivoObrigatorio && !motivo.trim()) return;
    if (kind === "aprovar") {
      await aprovar.mutateAsync({ id: row.id, motivo: motivo.trim() || undefined });
    } else if (kind === "negar") {
      await negar.mutateAsync({ id: row.id, motivo: motivo.trim() });
    } else {
      await cancelar.mutateAsync({ id: row.id, motivo: motivo.trim() });
    }
    close();
  }

  const pending = aprovar.isPending || negar.isPending || cancelar.isPending;

  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{row.codigo}</span> · {row.titulo} · {fmtBRL(row.valor)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Justificativa {motivoObrigatorio ? "(obrigatória)" : "(opcional)"}
          </label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={motivoObrigatorio ? "Explique o motivo…" : "Observação (opcional)"}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>Voltar</Button>
          <Button
            onClick={confirm}
            disabled={pending || (motivoObrigatorio && !motivo.trim())}
            className={
              kind === "aprovar"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : kind === "negar"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : ""
            }
          >
            {kind === "aprovar" ? "Aprovar" : kind === "negar" ? "Negar" : "Cancelar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
