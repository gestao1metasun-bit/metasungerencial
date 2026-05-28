// D15.3.c — Editar Taxa de título (Supabase).
// Aplica e estorna taxas via rpc_taxa_aplicar / rpc_taxa_estornar.
// Toda alteração exige motivo obrigatório e gera audit + histórico.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useTaxasTitulo, useAplicarTaxa, useEstornarTaxa,
  type TaxaTipo, type TaxaCategoria,
} from "@/lib/repositories/taxas-repo";
import { errorLogRepo } from "@/lib/repositories/error-log-repo";

const TIPOS: TaxaTipo[] = ["juros", "multa", "desconto", "tarifa", "iof", "encargo", "imposto", "outro"];
const CATEGORIAS: TaxaCategoria[] = ["ENCARGO", "DESCONTO", "TARIFA", "IMPOSTO", "CUSTO_FINANCEIRO", "OUTRO"];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function EditarTaxaDialog({
  open, onOpenChange, tituloId, tituloCodigo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tituloId: string | null;
  tituloCodigo?: string | null;
}) {
  const { data: taxas = [], isLoading } = useTaxasTitulo(tituloId, true);
  const aplicar = useAplicarTaxa();
  const estornar = useEstornarTaxa();

  const [tipo, setTipo] = useState<TaxaTipo>("juros");
  const [categoria, setCategoria] = useState<TaxaCategoria>("ENCARGO");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [motivoEstorno, setMotivoEstorno] = useState("");
  const [estornoAlvo, setEstornoAlvo] = useState<string | null>(null);

  const valorNum = Number(valor) || 0;
  const valido = !!tituloId && valorNum > 0 && motivo.trim().length >= 5;

  async function adicionar() {
    if (!valido || !tituloId) return;
    try {
      await aplicar.mutateAsync({
        titulo_id: tituloId,
        tipo,
        categoria,
        valor: valorNum,
        motivo: motivo.trim(),
        observacao: obs.trim() || null,
      });
      toast.success("Taxa aplicada.");
      setValor(""); setMotivo(""); setObs("");
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao aplicar taxa";
      toast.error(msg);
      void errorLogRepo.log({
        modulo: "financeiro", tela: "EditarTaxaDialog", acao: "rpc_taxa_aplicar",
        mensagem: msg, payload: { tituloId, tipo, valorNum }, severidade: "error",
      }).catch(() => {});
    }
  }

  async function confirmarEstorno() {
    if (!estornoAlvo || motivoEstorno.trim().length < 5) return;
    try {
      await estornar.mutateAsync({ taxa_id: estornoAlvo, motivo: motivoEstorno.trim() });
      toast.success("Taxa estornada.");
      setEstornoAlvo(null); setMotivoEstorno("");
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao estornar";
      toast.error(msg);
      void errorLogRepo.log({
        modulo: "financeiro", tela: "EditarTaxaDialog", acao: "rpc_taxa_estornar",
        mensagem: msg, payload: { estornoAlvo }, severidade: "error",
      }).catch(() => {});
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar taxas — {tituloCodigo ?? tituloId?.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            Toda alteração de taxa é registrada com motivo obrigatório e fica permanente no histórico.
            Para corrigir, estorne a entrada anterior e crie uma nova.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Formulário aplicar */}
          <div className="rounded border p-3 bg-muted/20 space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Aplicar nova taxa</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TaxaTipo)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as TaxaCategoria)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="h-8" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Motivo (obrigatório, mín. 5 caracteres)</Label>
              <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Observação</Label>
              <Textarea rows={1} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={adicionar} disabled={!valido || aplicar.isPending}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Aplicar taxa
              </Button>
            </div>
          </div>

          {/* Histórico */}
          <div className="rounded border">
            <div className="border-b bg-muted/40 px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
              Histórico ({taxas.length})
            </div>
            <div className="max-h-72 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-xs py-4">Carregando…</TableCell></TableRow>}
                  {!isLoading && taxas.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-xs py-4 text-muted-foreground">Sem taxas aplicadas.</TableCell></TableRow>
                  )}
                  {taxas.map((t) => (
                    <TableRow key={t.id} className={t.deleted_at ? "opacity-60" : ""}>
                      <TableCell className="text-xs">{new Date(t.data_aplicacao).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{t.tipo}</Badge></TableCell>
                      <TableCell className="text-xs">{t.categoria ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{fmtBRL(Number(t.valor))}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs" title={t.motivo ?? ""}>{t.motivo ?? "—"}</TableCell>
                      <TableCell>
                        {t.deleted_at
                          ? <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700">ESTORNADA</Badge>
                          : <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">ATIVA</Badge>}
                      </TableCell>
                      <TableCell>
                        {!t.deleted_at && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEstornoAlvo(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {estornoAlvo && (
            <div className="rounded border border-rose-300 bg-rose-50/50 p-2 space-y-2">
              <Label className="text-xs">Motivo do estorno (obrigatório, mín. 5)</Label>
              <Textarea rows={2} value={motivoEstorno} onChange={(e) => setMotivoEstorno(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEstornoAlvo(null); setMotivoEstorno(""); }}>Cancelar</Button>
                <Button size="sm" variant="destructive" onClick={confirmarEstorno} disabled={motivoEstorno.trim().length < 5 || estornar.isPending}>
                  Confirmar estorno
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
