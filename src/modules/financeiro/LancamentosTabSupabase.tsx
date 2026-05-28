/**
 * D15.3.e — Lançamentos como visão derivada (Supabase).
 * Lê v_lancamentos_derivados; criação via rpc_lancamento_criar.
 * ZERO leitura/escrita em metasun.fin.lancamentos.v1.
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLancamentos, lancamentosRepo, type NovoLancamentoInput } from "@/lib/repositories/lancamentos-repo";
import { useNaturezasFin, useCentrosResultado, useContasFinanceirasOficiais } from "@/lib/repositories/cadastros-repo";
import { logError } from "@/lib/repositories/error-log-repo";
import { fmtBRL } from "@/lib/mock-data";

const UI_KEY = "ui.fin.lancamentos.v1";

function loadUi(): { origem?: string; tipo?: string; natureza_temporal?: string } {
  try { return JSON.parse(localStorage.getItem(UI_KEY) || "{}"); } catch { return {}; }
}
function saveUi(v: Record<string, string | undefined>) {
  try { localStorage.setItem(UI_KEY, JSON.stringify(v)); } catch { /* noop */ }
}

export function LancamentosTabSupabase() {
  const [ui, setUi] = useState(loadUi);
  const filtro = useMemo(
    () => ({
      origem: (ui.origem as never) || undefined,
      tipo: (ui.tipo as "receber" | "pagar" | undefined) || undefined,
      natureza_temporal:
        (ui.natureza_temporal as "previsto" | "realizado" | undefined) || undefined,
      limit: 200,
    }),
    [ui],
  );
  const { data: lancs = [], isLoading } = useLancamentos(filtro);
  const naturezas = useNaturezasFin();
  const centros = useCentrosResultado();
  const contas = useContasFinanceirasOficiais();
  const [open, setOpen] = useState(false);

  function updFiltro(p: Partial<typeof ui>) {
    const next = { ...ui, ...p };
    setUi(next);
    saveUi(next);
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Origem</Label>
          <Select value={ui.origem ?? "all"} onValueChange={(v) => updFiltro({ origem: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="TITULO">Título</SelectItem>
              <SelectItem value="MOVIMENTACAO">Movimentação</SelectItem>
              <SelectItem value="ADIANTAMENTO">Adiantamento</SelectItem>
              <SelectItem value="BOLETO">Boleto</SelectItem>
              <SelectItem value="EXTRATO">Extrato</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={ui.tipo ?? "all"} onValueChange={(v) => updFiltro({ tipo: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="receber">Receber</SelectItem>
              <SelectItem value="pagar">Pagar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Natureza temporal</Label>
          <Select value={ui.natureza_temporal ?? "all"} onValueChange={(v) => updFiltro({ natureza_temporal: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tudo</SelectItem>
              <SelectItem value="previsto">Previsto</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <NovoLancamentoDialog
            open={open}
            onOpenChange={setOpen}
            naturezas={naturezas.data ?? []}
            centros={centros.data ?? []}
            contas={contas.data ?? []}
          />
        </div>
      </Card>

      <Card className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Natureza temporal</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-6"><Loader2 className="inline animate-spin h-4 w-4 mr-2" />Carregando…</TableCell></TableRow>
            )}
            {!isLoading && lancs.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>
            )}
            {lancs.map((l) => (
              <TableRow key={l.lancamento_id}>
                <TableCell>{l.data_referencia?.slice(0, 10) ?? "—"}</TableCell>
                <TableCell>{l.origem}</TableCell>
                <TableCell>{l.tipo_lancamento}</TableCell>
                <TableCell className="max-w-[280px] truncate">{l.descricao ?? l.codigo ?? "—"}</TableCell>
                <TableCell>{l.natureza_temporal}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(l.valor || 0)}</TableCell>
                <TableCell>{l.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NovoLancamentoDialog({
  open, onOpenChange, naturezas, centros, contas,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  naturezas: Array<{ id: string; nome: string }>;
  centros: Array<{ id: string; nome: string }>;
  contas: Array<{ id: string; nome: string }>;
}) {
  const [form, setForm] = useState<Partial<NovoLancamentoInput>>({
    tipo: "receber",
    valor: 0,
    vencimento: new Date().toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.natureza_id || !form.centro_id || !form.conta_id || !form.valor || !form.vencimento) {
      toast.error("Preencha natureza, centro, conta, valor e vencimento.");
      return;
    }
    setBusy(true);
    try {
      await lancamentosRepo.criar(form as NovoLancamentoInput);
      toast.success("Lançamento criado.");
      onOpenChange(false);
      setForm({ tipo: "receber", valor: 0, vencimento: new Date().toISOString().slice(0, 10) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Falha: ${msg}`);
      logError({ modulo: "financeiro", acao: "lancamento.criar", mensagem: msg, payload: form, severidade: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo lançamento</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "receber" | "pagar" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receber">Receber</SelectItem>
                <SelectItem value="pagar">Pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input type="number" step="0.01" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Vencimento</Label>
            <Input type="date" value={form.vencimento ?? ""} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Competência</Label>
            <Input type="date" value={form.competencia ?? ""} onChange={(e) => setForm({ ...form, competencia: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Natureza *</Label>
            <Select value={form.natureza_id ?? ""} onValueChange={(v) => setForm({ ...form, natureza_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {naturezas.map((n) => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Centro *</Label>
            <Select value={form.centro_id ?? ""} onValueChange={(v) => setForm({ ...form, centro_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Conta financeira *</Label>
            <Select value={form.conta_id ?? ""} onValueChange={(v) => setForm({ ...form, conta_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Descrição</Label>
            <Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
