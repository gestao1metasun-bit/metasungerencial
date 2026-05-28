/**
 * D15.3.a — TitulosTab 100% Supabase
 *
 * Consome exclusivamente:
 *   - useTitulosFinanceiros / useReceberParcela / useCancelarTitulo  (Supabase + RPCs)
 *   - useCriarLancamento + lancamentos-repo.ts                        (RPC oficial)
 *   - useCadastros (cadastros-repo: contas, centros, naturezas)
 *
 * NÃO importa stores LocalStorage de financeiro. Preferências de UI
 * (filtros, colunas) ficam em chaves `ui.fin.titulos.*` — permitidas
 * pelo ls-guard.
 *
 * Falhas viram toast + errorLogRepo.log({ modulo: 'financeiro', ... }).
 */
import { useEffect, useMemo, useState } from "react";
import {
  Wallet, AlertTriangle, FileText, Filter, RotateCcw,
  CheckCircle2, XCircle, Banknote, Undo2, Printer, Mail, Eye, Send,
} from "lucide-react";
import {
  RowActions, type RowActionKind,
  EnterpriseRecordToolbar, type StatusActionItem,
  BulkActionBar, useRowSelection,
} from "@/components/app/enterprise";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useTitulosFinanceiros, type TituloFinanceiro,
  useCancelarTitulo,
  TF_STATUS_LABEL, TF_STATUS_TONE, type TFStatus,
} from "@/hooks/useTitulosFinanceiros";
import { ReceberParcelaModal } from "@/components/app/financeiro/ReceberParcelaModal";
import { errorLogRepo } from "@/lib/repositories/error-log-repo";

const UI_PREF_KEY = "ui.fin.titulos.v1";

type UiPrefs = {
  statusFiltro: TFStatus | "TODOS";
  busca: string;
  origem: string;
};

function loadPrefs(): UiPrefs {
  if (typeof window === "undefined") return { statusFiltro: "TODOS", busca: "", origem: "TODOS" };
  try {
    const raw = window.localStorage.getItem(UI_PREF_KEY);
    if (!raw) return { statusFiltro: "TODOS", busca: "", origem: "TODOS" };
    return { statusFiltro: "TODOS", busca: "", origem: "TODOS", ...JSON.parse(raw) };
  } catch {
    return { statusFiltro: "TODOS", busca: "", origem: "TODOS" };
  }
}

function savePrefs(p: UiPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UI_PREF_KEY, JSON.stringify(p));
  } catch {
    /* silencioso — pref de UI */
  }
}

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(Number(n ?? 0));

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export function TitulosTabSupabase({ tipo }: { tipo: "AR" | "AP" }) {
  const [prefs, setPrefs] = useState<UiPrefs>(() => loadPrefs());
  useEffect(() => { savePrefs(prefs); }, [prefs]);

  const { data: rows = [], isLoading, isError, error, refetch } = useTitulosFinanceiros(
    prefs.statusFiltro === "TODOS"
      ? undefined
      : { status: prefs.statusFiltro },
  );

  // D16.PERF P2.1 — first-list.ready quando primeiro dataset chega
  useEffect(() => {
    if (!isLoading && rows !== undefined) {
      void import("@/lib/perf").then((m) => m.reportFirstListReady(`titulos.${tipo}`));
    }
  }, [isLoading, rows, tipo]);

  // Log erro Supabase (visível, sem fallback silencioso)
  useEffect(() => {
    if (isError) {
      void errorLogRepo.log({
        modulo: "financeiro",
        tela: tipo === "AR" ? "titulos.receber" : "titulos.pagar",
        acao: "list",
        mensagem: (error as Error)?.message ?? "Falha ao listar títulos",
        severidade: "error",
      });
    }
  }, [isError, error, tipo]);

  const filtrados = useMemo(() => {
    const tipoUpper = tipo;
    return rows.filter((r) => {
      if (r.tipo !== tipoUpper) return false;
      if (prefs.origem !== "TODOS" && r.origem_tipo !== prefs.origem) return false;
      if (prefs.busca.trim()) {
        const q = prefs.busca.trim().toLowerCase();
        const hay = [r.codigo, r.numero_documento, r.observacoes, r.origem_tipo]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, tipo, prefs.origem, prefs.busca]);

  const totais = useMemo(() => {
    let bruto = 0, saldo = 0, vencidos = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    for (const r of filtrados) {
      bruto += Number(r.valor_bruto ?? 0);
      saldo += Number(r.saldo ?? 0);
      if (r.vencimento && r.vencimento < hoje && (r.status === "PENDENTE" || r.status === "PARCIAL" || r.status === "ATRASADO")) {
        vencidos += Number(r.saldo ?? 0);
      }
    }
    return { bruto, saldo, vencidos, qtd: filtrados.length };
  }, [filtrados]);

  // Origens disponíveis (para filtro)
  const origens = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.tipo === tipo && r.origem_tipo) s.add(r.origem_tipo);
    return Array.from(s).sort();
  }, [rows, tipo]);

  // "Novo lançamento" removido: títulos vêm de contratos / pedidos de compra
  const [parcelaSel, setParcelaSel] = useState<string | null>(null);
  const [cancelSel, setCancelSel] = useState<TituloFinanceiro | null>(null);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);

  // D17.UI.3 — seleção múltipla
  const selection = useRowSelection(filtrados, (r) => r.id);
  const cancelar = useCancelarTitulo();

  const titulo = tipo === "AR" ? "Contas a Receber" : "Contas a Pagar";

  // Quantos da seleção ainda são canceláveis?
  const selCancelaveis = selection.selectedRows.filter(
    (r) => r.status !== "CANCELADO" && r.status !== "RECEBIDO",
  );

  return (
    <div className="space-y-3">
      {/* Banner fonte oficial */}
      <Card className="px-3 py-2 text-xs flex items-center gap-2 bg-emerald-500/5 border-emerald-500/30">
        <Wallet className="size-3.5 text-emerald-600" />
        <span className="font-medium">{titulo}</span>
        <span className="text-muted-foreground">· fonte oficial: Supabase (D15.3.a)</span>
        <span className="ml-auto text-muted-foreground">{totais.qtd} título(s)</span>
      </Card>

      {/* Toolbar + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Bruto</div>
          <div className="text-lg font-semibold mt-0.5">{fmtBRL(totais.bruto)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Saldo em aberto</div>
          <div className="text-lg font-semibold mt-0.5">{fmtBRL(totais.saldo)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Vencido</div>
          <div className={`text-lg font-semibold mt-0.5 ${totais.vencidos > 0 ? "text-rose-600" : ""}`}>
            {fmtBRL(totais.vencidos)}
          </div>
        </Card>
        <Card className="p-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RotateCcw className="size-3.5 mr-1" /> Atualizar
          </Button>
          <div className="text-[11px] text-muted-foreground text-right max-w-[180px] leading-tight">
            Títulos nascem de <strong>contratos</strong> ou <strong>pedidos de compra</strong>.
          </div>
        </Card>
      </div>


      {/* Filtros */}
      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Filter className="size-3" /> Status
            </Label>
            <Select
              value={prefs.statusFiltro}
              onValueChange={(v) => setPrefs({ ...prefs, statusFiltro: v as TFStatus | "TODOS" })}
            >
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {(Object.keys(TF_STATUS_LABEL) as TFStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{TF_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Origem</Label>
            <Select
              value={prefs.origem}
              onValueChange={(v) => setPrefs({ ...prefs, origem: v })}
            >
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                {origens.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <Input
              className="h-8"
              placeholder="código, documento, observação..."
              value={prefs.busca}
              onChange={(e) => setPrefs({ ...prefs, busca: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Erro visível */}
      {isError && (
        <Card className="p-3 border-rose-500/40 bg-rose-500/5 text-sm">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="size-4" />
            <span className="font-medium">Erro ao consultar títulos no Supabase.</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {(error as Error)?.message ?? "Erro desconhecido"} — registrado em /analytics/erros.
          </div>
        </Card>
      )}

      {/* D17.UI.2 — Toolbar RM TOTVS (3 linhas: registro + status + layout) */}
      <EnterpriseRecordToolbar
        entityType="titulos_financeiros"
        selectedIds={[]}
        availableActions={[
          "novo", "editar", "excluir", "atualizar", "visualizar",
          "anexos", "historico", "auditoria",
          "exportar", "imprimir", "colunas", "filtroAvancado",
        ]}
        position={{ current: Math.min(1, filtrados.length), total: filtrados.length }}
        onNavigate={() => { /* navegação por registro (em breve) */ }}
        onAction={(a) => {
          if (a === "novo") setNovoOpen(true);
          else if (a === "atualizar") void refetch();
          else toast.message(`Ação "${a}" — em breve no padrão Enterprise`);
        }}
        onFilter={() => toast.info("Filtros avançados — em breve")}
        statusActions={[
          { key: "aprovar",  label: "Aprovar",  icon: CheckCircle2, tone: "success", onClick: () => toast.message("Aprovar — em breve") },
          { key: "reprovar", label: "Reprovar", icon: XCircle,      tone: "danger",  onClick: () => toast.message("Reprovar — em breve") },
          { key: "baixar",   label: "Baixar",   icon: Banknote,     tone: "success", onClick: () => toast.message("Selecione um título") },
          { key: "estornar", label: "Estornar", icon: Undo2,        tone: "warning", onClick: () => toast.message("Estornar — em breve") },
          { key: "visualizar", label: "Visualizar", icon: Eye,      tone: "info",    onClick: () => toast.message("Visualizar — em breve") },
          { key: "imprimir",   label: "Imprimir",   icon: Printer,  tone: "muted",   onClick: () => toast.message("Imprimir — em breve") },
          { key: "email",      label: "Enviar e-mail", icon: Mail,  tone: "info",    onClick: () => toast.message("E-mail — em breve") },
          { key: "remessa",    label: "Remessa",      icon: Send,   tone: "primary", onClick: () => toast.message("Remessa — em breve") },
        ] satisfies StatusActionItem[]}
        layoutBar={{
          presets: [
            { key: "padrao",   label: "Padrão" },
            { key: "vencidos", label: "Vencidos" },
            { key: "abertos",  label: "Em aberto" },
          ],
          currentPreset: "padrao",
          density: "compact",
          onDensityChange: () => { /* opcional */ },
        }}
      />

      {/* Tabela */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[36px] px-2">
                <Checkbox
                  aria-label="Selecionar todos"
                  checked={
                    selection.allChecked
                      ? true
                      : selection.someChecked
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={selection.toggleAll}
                />
              </TableHead>
              <TableHead className="w-[110px]">Código</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="w-[110px]">Vencimento</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="text-right w-[120px]">Bruto</TableHead>
              <TableHead className="text-right w-[120px]">Saldo</TableHead>
              <TableHead className="w-[160px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                  <FileText className="size-4 inline mr-1" />
                  Nenhum título encontrado no Supabase.
                </TableCell>
              </TableRow>
            )}
            {filtrados.map((r) => {
              const status = (r.status as TFStatus) ?? "PENDENTE";
              const checked = selection.isSelected(r.id);
              return (
                <TableRow key={r.id} data-state={checked ? "selected" : undefined}>
                  <TableCell className="px-2">
                    <Checkbox
                      aria-label={`Selecionar título ${r.codigo ?? r.id.slice(0, 8)}`}
                      checked={checked}
                      onCheckedChange={() => selection.toggle(r.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo ?? r.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{r.origem_tipo ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.numero_documento ?? "—"}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TF_STATUS_TONE[status]}>
                      {TF_STATUS_LABEL[status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{fmtBRL(r.valor_bruto)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-medium">{fmtBRL(r.saldo)}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      rowId={r.id}
                      actions={[
                        { kind: "visualizar" },
                        {
                          kind: "baixar",
                          label: "Receber",
                          disabled: status === "CANCELADO" || status === "RECEBIDO",
                        },
                        { kind: "anexos" },
                        { kind: "historico" },
                        {
                          kind: "cancelar",
                          disabled: status === "CANCELADO" || status === "RECEBIDO",
                        },
                      ]}
                      onAction={(kind) => {
                        const k = kind as RowActionKind;
                        if (k === "cancelar") setCancelSel(r);
                        else if (k === "baixar") {
                          // Receber: delega ao primeiro parcela aberta (mantém comportamento atual)
                          void import("@/integrations/supabase/client").then(async ({ supabase }) => {
                            const { data } = await supabase
                              .from("parcelas_financeiras")
                              .select("id,saldo,numero")
                              .eq("titulo_id", r.id)
                              .gt("saldo", 0.001)
                              .order("numero", { ascending: true })
                              .limit(1)
                              .maybeSingle();
                            if (data?.id) setParcelaSel(data.id);
                            else toast.info("Nenhuma parcela em aberto");
                          });
                        } else if (k === "visualizar") {
                          toast.info(`Título ${r.codigo ?? r.id.slice(0, 8)}`);
                        } else if (k === "anexos" || k === "historico") {
                          toast.message("Em breve no padrão Enterprise D17.UI");
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {filtrados.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-right text-xs">Totais</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{fmtBRL(totais.bruto)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums font-semibold">{fmtBRL(totais.saldo)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <ReceberParcelaModalConnector
        parcelaId={parcelaSel}
        onClose={() => setParcelaSel(null)}
      />

      <CancelarDialog
        titulo={cancelSel}
        onClose={() => setCancelSel(null)}
      />

      {/* D17.UI.3 — Barra flutuante de ações em lote */}
      <BulkActionBar
        count={selection.count}
        label={selection.count === 1 ? "título selecionado" : "títulos selecionados"}
        onClear={selection.clear}
        actions={[
          {
            key: "export",
            label: "Exportar CSV",
            tone: "azul",
            icon: <FileText className="size-3.5" />,
            onClick: () => {
              const linhas = selection.selectedRows.map((r) => ({
                codigo: r.codigo ?? r.id.slice(0, 8),
                origem: r.origem_tipo ?? "",
                documento: r.numero_documento ?? "",
                vencimento: r.vencimento ?? "",
                status: r.status ?? "",
                bruto: Number(r.valor_bruto ?? 0).toFixed(2),
                saldo: Number(r.saldo ?? 0).toFixed(2),
              }));
              const header = Object.keys(linhas[0] ?? {}).join(";");
              const body = linhas.map((l) => Object.values(l).join(";")).join("\n");
              const blob = new Blob(["\ufeff" + header + "\n" + body], {
                type: "text/csv;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `titulos-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`${linhas.length} título(s) exportado(s).`);
            },
          },
          {
            key: "cancelar-lote",
            label: `Cancelar (${selCancelaveis.length})`,
            tone: "vermelho",
            icon: <XCircle className="size-3.5" />,
            disabled: selCancelaveis.length === 0 || cancelar.isPending,
            onClick: () => setBulkCancelOpen(true),
          },
        ]}
      />

      <BulkCancelDialog
        open={bulkCancelOpen}
        onClose={() => setBulkCancelOpen(false)}
        titulos={selCancelaveis}
        onConfirm={async (motivo) => {
          let ok = 0, fail = 0;
          for (const t of selCancelaveis) {
            try {
              await cancelar.mutateAsync({ tituloId: t.id, motivo });
              ok++;
            } catch (e) {
              fail++;
              await errorLogRepo.log({
                modulo: "financeiro",
                tela: tipo === "AR" ? "titulos.receber" : "titulos.pagar",
                acao: "cancelar_lote",
                mensagem: (e as Error)?.message ?? "Falha ao cancelar título em lote",
                severidade: "error",
                payload: { titulo_id: t.id },
              });
            }
          }
          setBulkCancelOpen(false);
          selection.clear();
          if (fail === 0) toast.success(`${ok} título(s) cancelado(s).`);
          else toast.warning(`${ok} cancelado(s), ${fail} falha(s).`);
        }}
      />
    </div>
  );
}

/* ============================================================================
   Helpers internos (mantidos no mesmo arquivo p/ coesão)
   ========================================================================== */

// ReceberAcao removido em D17.UI.1 — substituído por RowActions (kind="baixar").


function ReceberParcelaModalConnector({ parcelaId, onClose }: {
  parcelaId: string | null; onClose: () => void;
}) {
  // Modal já é 100% Supabase (useReceberParcela)
  const [parcela, setParcela] = useState<Parameters<typeof ReceberParcelaModal>[0]["parcela"]>(null);
  // Quando parcelaId muda, busca a parcela via list e injeta.
  // Simplificação: aqui recarrega list de parcelas pelo tituloId não disponível —
  // estratégia: usar hook leve direto.
  useParcelaLookup(parcelaId, setParcela);
  return (
    <ReceberParcelaModal
      parcela={parcela}
      open={!!parcela}
      onOpenChange={(v) => { if (!v) { setParcela(null); onClose(); } }}
    />
  );
}

function useParcelaLookup(
  parcelaId: string | null,
  setParcela: (p: Parameters<typeof ReceberParcelaModal>[0]["parcela"]) => void,
) {
  useEffect(() => {
    if (!parcelaId) { setParcela(null); return; }
    let alive = true;
    void import("@/integrations/supabase/client").then(async ({ supabase }) => {
      const { data, error } = await supabase
        .from("parcelas_financeiras").select("*").eq("id", parcelaId).maybeSingle();
      if (!alive) return;
      if (error) {
        toast.error(error.message);
        void errorLogRepo.log({
          modulo: "financeiro", tela: "titulos.parcela", acao: "lookup",
          mensagem: error.message, severidade: "error",
        });
        setParcela(null); return;
      }
      setParcela(data as Parameters<typeof ReceberParcelaModal>[0]["parcela"]);
    });
    return () => { alive = false; };
  }, [parcelaId, setParcela]);
}

function CancelarDialog({ titulo, onClose }: {
  titulo: TituloFinanceiro | null; onClose: () => void;
}) {
  const cancelar = useCancelarTitulo();
  const [motivo, setMotivo] = useState("");
  useEffect(() => { setMotivo(""); }, [titulo?.id]);
  if (!titulo) return null;
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cancelar título {titulo.codigo ?? titulo.id.slice(0, 8)}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">Operação registrada em auditoria. Motivo obrigatório (≥ 5 caracteres).</div>
          <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: duplicidade · valor incorreto · acordo cancelado" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button
            variant="destructive"
            disabled={motivo.trim().length < 5 || cancelar.isPending}
            onClick={() => cancelar.mutate({ tituloId: titulo.id, motivo: motivo.trim() }, {
              onSuccess: () => onClose(),
              onError: (e: unknown) => {
                void errorLogRepo.log({
                  modulo: "financeiro", tela: "titulos.cancelar", acao: "rpc",
                  mensagem: (e as Error)?.message ?? "falha cancelar",
                  payload: { tituloId: titulo.id }, severidade: "error",
                });
              },
            })}
          >Cancelar título</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Novo lançamento removido: títulos AR/AP devem nascer de contratos (Comercial)
   ou pedidos de compra (Suprimentos). Lançamentos avulsos vão pela aba
   Lançamentos, não por Receber/Pagar. */



/* ============================================================================
   D17.UI.3 — Cancelamento em lote
   ========================================================================== */
function BulkCancelDialog({
  open, onClose, titulos, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  titulos: TituloFinanceiro[];
  onConfirm: (motivo: string) => void | Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) { setMotivo(""); setBusy(false); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar {titulos.length} título(s) em lote</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">
            Cada cancelamento é registrado em auditoria individualmente.
            Motivo obrigatório (≥ 5 caracteres) e será aplicado a todos.
          </div>
          <Textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: lote de duplicidade · cliente desistiu · acordo geral"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Voltar</Button>
          <Button
            variant="destructive"
            disabled={motivo.trim().length < 5 || busy || titulos.length === 0}
            onClick={async () => {
              setBusy(true);
              await onConfirm(motivo.trim());
              setBusy(false);
            }}
          >
            {busy ? "Cancelando…" : `Cancelar ${titulos.length} título(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

