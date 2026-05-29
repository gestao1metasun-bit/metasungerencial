/**
 * D15.3.e — Despesas Recorrentes 100% Supabase.
 * Substitui store metasun.fin.recorrentes.v1.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useRecorrentesSupabase, useCriarRecorrente, useToggleRecorrente, useExcluirRecorrente,
  type NovoRecorrenteInput,
} from "@/lib/repositories/recorrentes-repo";
import { useNaturezasFin, useCentrosResultado } from "@/lib/repositories/cadastros-repo";
import { logError } from "@/lib/repositories/error-log-repo";
import { fmtBRL } from "@/lib/mock-data";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

export function RecorrentesTabSupabase() {
  const { data: recs = [], isLoading } = useRecorrentesSupabase();
  const naturezas = useNaturezasFin();
  const centros = useCentrosResultado();
  const criar = useCriarRecorrente();
  const toggle = useToggleRecorrente();
  const excluir = useExcluirRecorrente();
  const [open, setOpen] = useState(false);

  const qc = useQueryClient();
  return (
    <div className="space-y-3">
      <RmTabHeader
        onNovo={() => setOpen(true)}
        onAtualizar={() => qc.invalidateQueries({ queryKey: ["recorrentes-supabase"] })}
        searchPlaceholder="Buscar despesa fixa…"
      />
      <Card className="p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{recs.length} recorrência(s)</div>
        <NovoRecorrenteDialog
          open={open}
          onOpenChange={setOpen}
          naturezas={naturezas.data ?? []}
          centros={centros.data ?? []}
          onCriar={async (input) => {
            try {
              await criar.mutateAsync(input);
              toast.success("Recorrência criada.");
              setOpen(false);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              toast.error(`Falha: ${msg}`);
              logError({ modulo: "financeiro", acao: "recorrente.criar", mensagem: msg, payload: input, severidade: "error" });
            }
          }}
          busy={criar.isPending}
        />
      </Card>

      <Card className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Dia venc.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-6"><Loader2 className="inline animate-spin h-4 w-4 mr-2" />Carregando…</TableCell></TableRow>
            )}
            {!isLoading && recs.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Nenhuma recorrência cadastrada.</TableCell></TableRow>
            )}
            {recs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.descricao}</TableCell>
                <TableCell>{r.tipo}</TableCell>
                <TableCell>{r.periodicidade}</TableCell>
                <TableCell>{r.dia_vencimento}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(r.valor)}</TableCell>
                <TableCell>
                  <Switch
                    checked={r.ativo}
                    onCheckedChange={async (v) => {
                      try { await toggle.mutateAsync({ id: r.id, ativo: v }); }
                      catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon"
                    onClick={async () => {
                      if (!confirm("Excluir esta recorrência?")) return;
                      try { await excluir.mutateAsync(r.id); toast.success("Excluída."); }
                      catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NovoRecorrenteDialog({
  open, onOpenChange, naturezas, centros, onCriar, busy,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  naturezas: Array<{ id: string; nome: string }>;
  centros: Array<{ id: string; nome: string }>;
  onCriar: (input: NovoRecorrenteInput) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<Partial<NovoRecorrenteInput>>({
    tipo: "Saída", periodicidade: "Mensal", dia_vencimento: 1, ativo: true, valor: 0,
  });

  async function submit() {
    if (!form.descricao || !form.valor || !form.dia_vencimento) {
      toast.error("Preencha descrição, valor e dia de vencimento.");
      return;
    }
    await onCriar({
      descricao: form.descricao,
      tipo: form.tipo as "Entrada" | "Saída",
      valor: form.valor,
      periodicidade: form.periodicidade as NovoRecorrenteInput["periodicidade"],
      dia_vencimento: form.dia_vencimento,
      proximo_vencimento: form.proximo_vencimento ?? null,
      natureza_id: form.natureza_id ?? null,
      centro_resultado_id: form.centro_resultado_id ?? null,
      fornecedor_id: null,
      cliente_id: null,
      ativo: form.ativo ?? true,
      observacao: form.observacao ?? null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova recorrência</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova despesa/receita recorrente</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Descrição *</Label>
            <Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "Entrada" | "Saída" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Entrada">Entrada</SelectItem>
                <SelectItem value="Saída">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valor *</Label>
            <Input type="number" step="0.01" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Periodicidade</Label>
            <Select value={form.periodicidade} onValueChange={(v) => setForm({ ...form, periodicidade: v as NovoRecorrenteInput["periodicidade"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Mensal","Bimestral","Trimestral","Semestral","Anual"] as const).map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dia venc. *</Label>
            <Input type="number" min={1} max={31} value={form.dia_vencimento ?? 1} onChange={(e) => setForm({ ...form, dia_vencimento: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Natureza</Label>
            <Select value={form.natureza_id ?? ""} onValueChange={(v) => setForm({ ...form, natureza_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {naturezas.map((n) => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Centro</Label>
            <Select value={form.centro_resultado_id ?? ""} onValueChange={(v) => setForm({ ...form, centro_resultado_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
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
