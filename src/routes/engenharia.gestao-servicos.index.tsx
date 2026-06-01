/**
 * E.OS.3 — Gestão de Serviços (Ordens de Serviço) · Lista
 *
 * Tela operacional padrão D17.UI RM/TOTVS. Consome 100% o repo oficial
 * (`os-repo.ts`) que por sua vez só fala com as RPCs SECURITY DEFINER da
 * E.OS.2. Nenhum status é alterado por UPDATE direto.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import {
  EnterpriseRecordToolbar, RowActions, type RowAction,
} from "@/components/app/enterprise";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useOsList, useOsStatusCatalogo, useCriarOs } from "@/lib/repositories/os-repo";

export const Route = createFileRoute("/engenharia/gestao-servicos/")({
  component: GestaoServicosPage,
});

function fmtMoney(n: number | null | undefined) {
  return (Number(n ?? 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return s; }
}

function GestaoServicosPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("__all__");
  const [novoOpen, setNovoOpen] = useState(false);

  const { data: statuses = [] } = useOsStatusCatalogo();
  const { data: lista = [], isLoading, refetch, isFetching } = useOsList({
    status: statusFiltro === "__all__" ? undefined : statusFiltro,
    busca: busca || undefined,
    limit: 300,
  });

  const statusMap = useMemo(() => {
    const m = new Map<string, { nome: string; cor: string | null }>();
    statuses.forEach((s) => m.set(s.codigo, { nome: s.nome, cor: s.cor }));
    return m;
  }, [statuses]);

  return (
    <div className="space-y-2 p-2">
      <PageHeader
        title="Gestão de Serviços"
        subtitle="Ordens de Serviço · operação, execução e rastreabilidade"
        icon={FileText}
      />

      <EnterpriseRecordToolbar
        entityType="engenharia"
        selectedIds={[]}
        availableActions={["novo", "atualizar", "exportar", "filtroRapido"]}
        search={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar por código ou observação…"
        onAction={(a) => {
          if (a === "novo") setNovoOpen(true);
          if (a === "atualizar") refetch();
        }}
        extraLeft={
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-slate-600">Status</Label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-7 w-[200px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.codigo} value={s.codigo}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] uppercase">
              <TableHead className="w-[80px]">Nº O.S.</TableHead>
              <TableHead className="w-[170px]">Status</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Proposta</TableHead>
              <TableHead>PV</TableHead>
              <TableHead className="text-right">Valor orçado</TableHead>
              <TableHead className="text-right">Custo orçado</TableHead>
              <TableHead>Prev. início</TableHead>
              <TableHead>Prev. término</TableHead>
              <TableHead className="w-[110px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="py-8 text-center text-slate-500">
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Carregando…
              </TableCell></TableRow>
            ) : lista.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="py-12 text-center text-slate-500">
                Nenhuma O.S. cadastrada. Use <strong>Novo</strong> para criar a primeira.
              </TableCell></TableRow>
            ) : (
              lista.map((os) => {
                const st = statusMap.get(os.status_codigo);
                const actions: RowAction[] = [
                  { kind: "visualizar" },
                  { kind: "historico" },
                ];
                return (
                  <TableRow key={os.id} className="text-[12.5px] hover:bg-slate-50">
                    <TableCell className="font-mono font-semibold">
                      <Link to="/engenharia/gestao-servicos/$osId" params={{ osId: os.id }} className="text-sky-700 hover:underline">
                        {String(os.numero).padStart(6, "0")}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10.5px] font-medium"
                        style={st?.cor ? { borderColor: st.cor, color: st.cor } : undefined}
                      >
                        {st?.nome ?? os.status_codigo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700">{os.cliente_id ? os.cliente_id.slice(0, 8) : "—"}</TableCell>
                    <TableCell className="text-slate-600">{os.proposta_id ? os.proposta_id.slice(0, 8) : "—"}</TableCell>
                    <TableCell className="text-slate-600">{os.pedido_venda_id ? os.pedido_venda_id.slice(0, 8) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(os.valor_orcado)}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600">{fmtMoney(os.custo_orcado)}</TableCell>
                    <TableCell>{fmtDate(os.data_prev_inicio)}</TableCell>
                    <TableCell>{fmtDate(os.data_prev_termino)}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        rowId={os.id}
                        actions={actions}
                        onAction={(kind, id) => {
                          if (kind === "visualizar" || kind === "historico") {
                            navigate({
                              to: "/engenharia/gestao-servicos/$osId",
                              params: { osId: id },
                              ...(kind === "historico" ? { hash: "historico" } : {}),
                            });
                          }
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-[11px] text-slate-500 px-1">
        {lista.length} O.S. {isFetching ? "· atualizando…" : ""}
      </div>

      <NovaOsDialog open={novoOpen} onOpenChange={setNovoOpen} statuses={statuses} />
    </div>
  );
}

// ───────────────────── Novo O.S. ─────────────────────
function NovaOsDialog({
  open, onOpenChange, statuses,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statuses: { codigo: string; nome: string }[];
}) {
  const navigate = useNavigate();
  const [clienteId, setClienteId] = useState("");
  const [valorOrcado, setValorOrcado] = useState("0");
  const [obs, setObs] = useState("");
  const [statusCodigo, setStatusCodigo] = useState("VISTORIA_PRE_CONTRATO");
  const criar = useCriarOs();

  async function handleCriar() {
    if (!clienteId.trim() || clienteId.length < 8) {
      toast.error("Informe o ID do cliente (UUID).");
      return;
    }
    try {
      const novoId = await criar.mutateAsync({
        cliente_id: clienteId.trim(),
        valor_orcado: Number(valorOrcado) || 0,
        observacoes: obs.trim() || null,
        status_codigo: statusCodigo,
        idempotency_key: crypto.randomUUID(),
      });
      toast.success("O.S. criada.");
      onOpenChange(false);
      setClienteId(""); setValorOrcado("0"); setObs("");
      navigate({ to: "/engenharia/gestao-servicos/$osId", params: { osId: novoId } });
    } catch (e) {
      toast.error(`Falha ao criar: ${(e as Error).message}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          <DialogDescription>
            Esta tela é o fluxo mínimo de criação. Cliente é obrigatório; demais vínculos
            (proposta, PV, contrato, projeto) entram no painel da O.S.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-[13px]">
          <div className="space-y-1">
            <Label className="text-[12px]">Cliente (UUID) *</Label>
            <Input value={clienteId} onChange={(e) => setClienteId(e.target.value)} placeholder="00000000-0000-..." className="h-8 font-mono text-[12px]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[12px]">Status inicial</Label>
              <Select value={statusCodigo} onValueChange={setStatusCodigo}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => <SelectItem key={s.codigo} value={s.codigo}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Valor orçado (R$)</Label>
              <Input type="number" min={0} step="0.01" value={valorOrcado} onChange={(e) => setValorOrcado(e.target.value)} className="h-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Observações</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} className="h-8" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={criar.isPending}>Cancelar</Button>
          <Button onClick={handleCriar} disabled={criar.isPending}>
            {criar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
