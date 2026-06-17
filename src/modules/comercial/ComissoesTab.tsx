/**
 * D17.UI Fase 2c — Comissões Enterprise (RM/TOTVS)
 *
 * Tela DEDICADA de comissões. 100% UI: consome RPCs/repo existentes
 * (comercial-comissao-repo) sem alterar regra, banco, RLS, workflow ou
 * permissões. Toda transição passa pelas RPCs oficiais.
 *
 * Componentes Enterprise aplicados:
 *   EnterpriseRecordToolbar · FilterPanel · ColumnManager · RowActions
 *   · EntityTimeline (auditoria por comissão)
 */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  EnterpriseRecordToolbar,
  FilterPanel,
  ColumnManager,
  RowActions,
  useColumnPrefs,
  EntityTimeline,
  BulkActionBar,
  useRowSelection,
  type ColumnDef,
} from "@/components/app/enterprise";
import { Checkbox } from "@/components/ui/checkbox";
import { ribbonRmAprovacao, layoutBarRm } from "@/components/app/enterprise/rm-ribbon-presets";
import {
  useLiberarComissao,
  useMarcarComissaoPaga,
  useCancelarComissao,
  useEstornarComissao,
  useAlterarPercentualComissao,
  type Comissao,
  type ComissaoStatus,
} from "@/lib/repositories/comercial-comissao-repo";
import { fmtBRL } from "@/lib/mock-data";
import { notifyUnavailable, notifyDone } from "@/lib/comercial-ux";

const STATUS_TONE: Record<ComissaoStatus, string> = {
  PREVISTA:    "bg-sky-50 text-sky-700 border-sky-200",
  APROVADA:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  LIBERADA:    "bg-amber-50 text-amber-700 border-amber-200",
  PAGA:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELADA:   "bg-slate-100 text-slate-600 border-slate-200",
  ESTORNADA:   "bg-red-50 text-red-700 border-red-200",
  SUBSTITUIDA: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const COLS: ColumnDef[] = [
  { key: "status",     label: "Status", locked: true },
  { key: "contrato",   label: "Contrato", locked: true },
  { key: "vendedor",   label: "Vendedor" },
  { key: "percentual", label: "%" },
  { key: "base",       label: "Base" },
  { key: "valor",      label: "Valor" },
  { key: "prevista",   label: "Prevista em" },
  { key: "liberada",   label: "Liberada em", defaultVisible: false },
  { key: "paga",       label: "Paga em", defaultVisible: false },
  { key: "obs",        label: "Observação", defaultVisible: false },
  { key: "acoes",      label: "Ações", locked: true },
];

type Dialogo =
  | { kind: null }
  | { kind: "motivo"; acao: "liberar" | "pagar" | "cancelar" | "estornar"; comissao: Comissao }
  | { kind: "percentual"; comissao: Comissao }
  | { kind: "historico"; comissao: Comissao };

export function ComissoesTab({ onChangeTab }: { onChangeTab?: (tab: string) => void }) {
  const navigate = useNavigate();
  const liberar = useLiberarComissao();
  const pagar = useMarcarComissaoPaga();
  const cancelar = useCancelarComissao();
  const estornar = useEstornarComissao();
  const alterarPct = useAlterarPercentualComissao();

  // --- Query global de comissões (read-only) ---
  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["comissoes-global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_comissoes" as never)
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as Comissao[];
    },
  });

  // ---------- Filtros ----------
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState<string>("__todos__");
  const [fVendedor, setFVendedor] = useState<string>("__todos__");
  const [fContrato, setFContrato] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const limparFiltros = () => {
    setFStatus("__todos__"); setFVendedor("__todos__");
    setFContrato(""); setDataInicio(""); setDataFim("");
  };

  const universos = useMemo(() => {
    const vendedores = new Set<string>();
    for (const r of rows) if (r.vendedor_nome) vendedores.add(r.vendedor_nome);
    return { vendedores: Array.from(vendedores).sort() };
  }, [rows]);

  const linhas = useMemo(() => {
    return rows.filter((r) => {
      if (busca) {
        const q = busca.toLowerCase();
        const blob = `${r.contrato_id} ${r.vendedor_nome ?? ""} ${r.observacao ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (fStatus !== "__todos__" && r.status !== fStatus) return false;
      if (fVendedor !== "__todos__" && (r.vendedor_nome ?? "") !== fVendedor) return false;
      if (fContrato && !r.contrato_id.toLowerCase().includes(fContrato.toLowerCase())) return false;
      if (dataInicio && (r.prevista_em ?? "") < dataInicio) return false;
      if (dataFim && (r.prevista_em ?? "") > dataFim) return false;
      return true;
    });
  }, [rows, busca, fStatus, fVendedor, fContrato, dataInicio, dataFim]);

  const totais = useMemo(() => {
    const t: Record<ComissaoStatus, { qtd: number; valor: number }> = {
      PREVISTA:    { qtd: 0, valor: 0 }, APROVADA:    { qtd: 0, valor: 0 },
      LIBERADA:    { qtd: 0, valor: 0 }, PAGA:        { qtd: 0, valor: 0 },
      CANCELADA:   { qtd: 0, valor: 0 }, ESTORNADA:   { qtd: 0, valor: 0 },
      SUBSTITUIDA: { qtd: 0, valor: 0 },
    };
    for (const r of linhas) { t[r.status].qtd++; t[r.status].valor += Number(r.valor_calculado || 0); }
    return t;
  }, [linhas]);

  const prefs = useColumnPrefs("comercial_comissoes", COLS);
  const showCol = (k: string) => prefs.isVisible(k);

  const ativosCount =
    Number(fStatus !== "__todos__") + Number(fVendedor !== "__todos__") +
    Number(!!fContrato) + Number(!!dataInicio) + Number(!!dataFim);

  const [dlg, setDlg] = useState<Dialogo>({ kind: null });
  const [motivo, setMotivo] = useState("");
  const [novoPct, setNovoPct] = useState<number>(0);

  const abrirMotivo = (acao: "liberar" | "pagar" | "cancelar" | "estornar", comissao: Comissao) => {
    setMotivo(""); setDlg({ kind: "motivo", acao, comissao });
  };

  const executar = async () => {
    if (dlg.kind !== "motivo") return;
    const id = dlg.comissao.id;
    const m = motivo.trim() || undefined;
    try {
      if (dlg.acao === "liberar") await liberar.mutateAsync({ comissaoId: id, motivo: m });
      else if (dlg.acao === "pagar") await pagar.mutateAsync({ comissaoId: id, motivo: m });
      else if (dlg.acao === "cancelar") {
        if (!m || m.length < 5) { toast.error("Motivo (≥5 caracteres) obrigatório para cancelar."); return; }
        await cancelar.mutateAsync({ comissaoId: id, motivo: m });
      } else if (dlg.acao === "estornar") {
        if (!m || m.length < 5) { toast.error("Motivo (≥5 caracteres) obrigatório para estornar."); return; }
        await estornar.mutateAsync({ comissaoId: id, motivo: m });
      }
      setDlg({ kind: null });
    } catch { /* repo já mostra toast */ }
  };

  const abrirPercentual = (c: Comissao) => {
    setNovoPct(Number(c.percentual || 0)); setMotivo("");
    setDlg({ kind: "percentual", comissao: c });
  };

  const executarPercentual = async () => {
    if (dlg.kind !== "percentual") return;
    if (!motivo || motivo.trim().length < 5) {
      toast.error("Motivo (≥5 caracteres) obrigatório."); return;
    }
    if (!Number.isFinite(novoPct) || novoPct < 0 || novoPct > 100) {
      toast.error("Percentual inválido (0–100)."); return;
    }
    try {
      await alterarPct.mutateAsync({
        comissaoId: dlg.comissao.id, novoPercentual: Number(novoPct), motivo: motivo.trim(),
      });
      setDlg({ kind: null });
    } catch { /* repo já mostra toast */ }
  };

  const irPara = (tab: string) => {
    if (onChangeTab) { onChangeTab(tab); return; }
    void navigate({ to: "/comercial", hash: `tab=${tab}` });
  };

  const handleRowAction = (kind: string, rowId: string) => {
    const c = linhas.find((r) => r.id === rowId);
    if (!c) return;
    if (kind === "aprovar") abrirMotivo("liberar", c);
    else if (kind === "baixar") abrirMotivo("pagar", c);
    else if (kind === "cancelar") abrirMotivo("cancelar", c);
    else if (kind === "estornar") abrirMotivo("estornar", c);
    else if (kind === "editar") abrirPercentual(c);
    else if (kind === "historico") setDlg({ kind: "historico", comissao: c });
    else if (kind === "visualizar") irPara("contratos");
  };

  const sel = useRowSelection(linhas, (r) => r.id);

  return (
    <div className="space-y-3">
      <EnterpriseRecordToolbar
        entityType="contratos"
        selectedIds={sel.selectedIds}
        availableActions={["editar", "atualizar", "anexos", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
        statusActions={ribbonRmAprovacao()}
        layoutBar={layoutBarRm()}
        searchPlaceholder="Buscar contrato, vendedor, observação…"
        search={busca}
        onSearchChange={setBusca}
        position={{ current: linhas.length === 0 ? 0 : 1, total: linhas.length }}
        availableProcesses={[
          { key: "abrirContrato", label: "Abrir Contratos" },
          { key: "abrirPV",       label: "Abrir Pedidos de Venda" },
        ]}
        onProcess={(p) => {
          if (p === "abrirContrato") irPara("contratos");
          else if (p === "abrirPV") void navigate({ to: "/pedidos-venda" });
        }}
        onAction={(a) => {
          if (a === "atualizar") { void refetch(); notifyDone("Comissões atualizadas."); }
          else if (a === "exportar") notifyUnavailable();
          else if (a === "imprimir") window.print();
        }}
        extraRight={
          <div className="flex items-center gap-1">
            <FilterPanel
              resumo={ativosCount > 0 ? `${ativosCount} ativo(s)` : "Todos"}
              ativos={ativosCount}
              busca={busca}
              onBuscaChange={setBusca}
              buscaPlaceholder="Buscar…"
              dataInicio={dataInicio}
              dataFim={dataFim}
              onPeriodoChange={(i, f) => { setDataInicio(i); setDataFim(f); }}
              statusSlot={
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os status</SelectItem>
                    <SelectItem value="PREVISTA">Prevista</SelectItem>
                    <SelectItem value="LIBERADA">Liberada</SelectItem>
                    <SelectItem value="PAGA">Paga</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    <SelectItem value="ESTORNADA">Estornada</SelectItem>
                  </SelectContent>
                </Select>
              }
              responsavelSlot={
                <Select value={fVendedor} onValueChange={setFVendedor}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os vendedores</SelectItem>
                    {universos.vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
              extraSlot={
                <div>
                  <Label className="text-[11px]">Contrato</Label>
                  <Input className="h-8" placeholder="ID do contrato…" value={fContrato} onChange={(e) => setFContrato(e.target.value)} />
                </div>
              }
              onLimpar={limparFiltros}
            />
            <ColumnManager entity="comercial_comissoes" columns={COLS} prefs={prefs} />
          </div>
        }
      />


      <Card>
        <Table>
          <TableHeader>
            <TableRow className="[&_th]:py-1.5 [&_th]:text-[11.5px]">
              <TableHead className="w-8">
                <Checkbox
                  checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
                  onCheckedChange={sel.toggleAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              {prefs.visibleKeys.map((k) => {
                if (k === "valor" || k === "base" || k === "percentual") return <TableHead key={k} className="text-right">{COLS.find((c) => c.key === k)?.label}</TableHead>;
                if (k === "acoes") return <TableHead key={k} className="text-right w-[150px]">Ações</TableHead>;
                const col = COLS.find((c) => c.key === k);
                return <TableHead key={k}>{col?.label}</TableHead>;
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={prefs.visibleKeys.length + 1} className="text-center py-6 text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : linhas.length === 0 ? (
              <TableRow><TableCell colSpan={prefs.visibleKeys.length + 1} className="text-center py-8 text-sm text-muted-foreground">Nenhuma comissão para os filtros aplicados.</TableCell></TableRow>
            ) : linhas.map((r) => {
              const canLiberar = r.status === "PREVISTA";
              const canPagar = r.status === "LIBERADA";
              const canCancelar = r.status === "PREVISTA" || r.status === "LIBERADA";
              const canEstornar = r.status === "PAGA";
              const canEditarPct = r.status === "PREVISTA";
              return (
                <TableRow key={r.id} className="[&_td]:py-1 [&_td]:text-[12.5px]" data-state={sel.isSelected(r.id) ? "selected" : undefined}>
                  <TableCell className="w-8"><Checkbox checked={sel.isSelected(r.id)} onCheckedChange={() => sel.toggle(r.id)} aria-label={`Selecionar comissão ${r.id}`} /></TableCell>
                  {showCol("status") && (
                    <TableCell>
                      <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_TONE[r.status]}`}>{r.status}</span>
                    </TableCell>
                  )}
                  {showCol("contrato")   && <TableCell className="font-mono text-[11.5px]">{r.contrato_id.slice(0, 8)}…</TableCell>}
                  {showCol("vendedor")   && <TableCell>{r.vendedor_nome ?? "—"}</TableCell>}
                  {showCol("percentual") && <TableCell className="text-right font-mono">{Number(r.percentual).toFixed(2)}%</TableCell>}
                  {showCol("base")       && <TableCell className="text-right font-mono">{fmtBRL(Number(r.valor_base))}</TableCell>}
                  {showCol("valor")      && <TableCell className="text-right font-mono font-semibold">{fmtBRL(Number(r.valor_calculado))}</TableCell>}
                  {showCol("prevista")   && <TableCell className="text-xs">{r.prevista_em?.slice(0, 10) ?? "—"}</TableCell>}
                  {showCol("liberada")   && <TableCell className="text-xs">{r.liberada_em?.slice(0, 10) ?? "—"}</TableCell>}
                  {showCol("paga")       && <TableCell className="text-xs">{r.paga_em?.slice(0, 10) ?? "—"}</TableCell>}
                  {showCol("obs")        && <TableCell className="text-xs truncate max-w-[260px]">{r.observacao ?? "—"}</TableCell>}
                  {showCol("acoes") && (
                    <TableCell className="text-right">
                      <RowActions
                        rowId={r.id}
                        onAction={handleRowAction}
                        actions={[
                          { kind: "aprovar",   label: "Liberar",          disabled: !canLiberar },
                          { kind: "baixar",    label: "Marcar paga",      disabled: !canPagar },
                          { kind: "editar",    label: "Alterar %",        disabled: !canEditarPct, overflow: true },
                          { kind: "cancelar",  label: "Cancelar",         disabled: !canCancelar, overflow: true },
                          { kind: "estornar",  label: "Estornar",         disabled: !canEstornar, overflow: true },
                          { kind: "visualizar",label: "Abrir contrato",   overflow: true },
                          { kind: "historico", label: "Histórico",        overflow: true },
                        ]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <BulkActionBar
        count={sel.count}
        label="comissão(ões) selecionada(s)"
        onClear={sel.clear}
        actions={[
          { key: "liberar", label: "Liberar", tone: "verde", onClick: () => notifyUnavailable() },
          { key: "pagar", label: "Marcar pagas", tone: "verde", onClick: () => notifyUnavailable() },
          { key: "exportar", label: "Exportar", tone: "azul", onClick: () => notifyUnavailable() },
        ]}
      />


      {/* Diálogo motivo (liberar/pagar/cancelar/estornar) */}
      <Dialog open={dlg.kind === "motivo"} onOpenChange={(v) => { if (!v) setDlg({ kind: null }); }}>
        <DialogContent>
          {dlg.kind === "motivo" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dlg.acao === "liberar" && "Liberar comissão"}
                  {dlg.acao === "pagar" && "Marcar comissão como paga"}
                  {dlg.acao === "cancelar" && "Cancelar comissão"}
                  {dlg.acao === "estornar" && "Estornar comissão paga"}
                </DialogTitle>
                <DialogDescription>
                  Operação registrada via RPC oficial (auditoria + permissões aplicadas).
                  {(dlg.acao === "cancelar" || dlg.acao === "estornar") && " Motivo (≥5 caracteres) é obrigatório."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Motivo / Observação</Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo…" />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDlg({ kind: null })}>Cancelar</Button>
                <Button onClick={executar}>Confirmar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo alterar percentual */}
      <Dialog open={dlg.kind === "percentual"} onOpenChange={(v) => { if (!v) setDlg({ kind: null }); }}>
        <DialogContent>
          {dlg.kind === "percentual" && (
            <>
              <DialogHeader>
                <DialogTitle>Alterar percentual da comissão</DialogTitle>
                <DialogDescription>
                  Apenas comissões PREVISTA podem ter percentual alterado. Motivo (≥5 caracteres) obrigatório.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Novo percentual (%)</Label>
                  <Input type="number" min={0} max={100} step={0.01}
                    value={novoPct} onChange={(e) => setNovoPct(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Base</Label>
                  <Input value={fmtBRL(Number(dlg.comissao.valor_base))} readOnly />
                </div>
              </div>
              <div className="mt-2">
                <Label>Motivo</Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Justificativa…" />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDlg({ kind: null })}>Cancelar</Button>
                <Button onClick={executarPercentual}>Salvar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Histórico corporativo (timeline auditoria) */}
      <Dialog open={dlg.kind === "historico"} onOpenChange={(v) => { if (!v) setDlg({ kind: null }); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {dlg.kind === "historico" && (
            <>
              <DialogHeader>
                <DialogTitle>Histórico da comissão</DialogTitle>
                <DialogDescription>
                  Linha do tempo de auditoria — eventos PREVISTA → LIBERADA → PAGA, cancelamento, estorno e alterações de percentual.
                </DialogDescription>
              </DialogHeader>
              <EntityTimeline
                entidade={"comissoes" as never}
                entidadeId={dlg.comissao.id}
                tiposDisponiveis={["audit"]}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}