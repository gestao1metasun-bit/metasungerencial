// Aba de Adiantamentos (conta-corrente cliente/fornecedor).
import { useMemo, useState } from "react";
import { Plus, Wallet, FileSearch, Receipt, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/app/StatCard";
import { toast } from "sonner";
import {
  useFinanceiroRepo, useRepoAdiantamentos, useRepoTitulos, useRepoContas,
} from "@/hooks/useRepoFinanceiro";
import type { Adiantamento, AdiantamentoTipo } from "@/lib/repositories/financeiro-repository";
import { fmtBRLPrecise } from "@/lib/financeiro-store";

function fmtBR(d: string) { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; }

const TIPO_TONE: Record<AdiantamentoTipo, string> = {
  cliente: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  fornecedor: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

export function AdiantamentosTab() {
  const repo = useFinanceiroRepo();
  const lista = useRepoAdiantamentos();
  const [tipo, setTipo] = useState<AdiantamentoTipo>("cliente");
  const [filtro, setFiltro] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [abaterAlvo, setAbaterAlvo] = useState<Adiantamento | null>(null);

  const filtrados = useMemo(() => {
    const b = filtro.trim().toLowerCase();
    return lista
      .filter((a) => a.tipo === tipo)
      .filter((a) => !b || a.contraparteNome.toLowerCase().includes(b) || a.id.toLowerCase().includes(b));
  }, [lista, tipo, filtro]);

  const totalAtivo = filtrados.filter((a) => a.status === "ativo").reduce((s, a) => s + a.saldoDisponivel, 0);
  const totalOriginal = filtrados.reduce((s, a) => s + a.valorOriginal, 0);
  const totalConsumido = filtrados.filter((a) => a.status === "consumido").length;

  return (
    <div className="space-y-4">
      <Tabs value={tipo} onValueChange={(v) => setTipo(v as AdiantamentoTipo)}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="cliente">Adiantamentos de Cliente</TabsTrigger>
            <TabsTrigger value="fornecedor">Adiantamentos a Fornecedor</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar contraparte…" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-9 w-60" />
            <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo adiantamento</Button>
              </DialogTrigger>
              <NovoAdiantamentoDialog tipo={tipo} onClose={() => setNovoOpen(false)} />
            </Dialog>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total registrado" value={fmtBRLPrecise(totalOriginal)} />
          <StatCard label="Saldo disponível" value={fmtBRLPrecise(totalAtivo)} tone="primary" hint="Pode abater títulos" />
          <StatCard label="Consumidos" value={String(totalConsumido)} hint="Já usados em baixas" />
          <StatCard label="Registros" value={String(filtrados.length)} />
        </div>

        <TabsContent value={tipo} className="mt-4">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Abatimentos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      <FileSearch className="mx-auto mb-2 h-6 w-6 opacity-50" />
                      Nenhum adiantamento de {tipo === "cliente" ? "cliente" : "fornecedor"} ainda.
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtBR(a.data)}</TableCell>
                    <TableCell className="font-mono text-xs text-primary">{a.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{a.contraparteNome}</div>
                      {a.contratoId && <div className="text-[10px] text-muted-foreground">contrato {a.contratoId}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{a.origem ?? "manual"}</TableCell>
                    <TableCell className="text-right text-xs">{fmtBRLPrecise(a.valorOriginal)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={a.saldoDisponivel > 0 ? "text-primary" : "text-muted-foreground"}>
                        {fmtBRLPrecise(a.saldoDisponivel)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${TIPO_TONE[a.tipo]} border text-[10px] font-semibold`}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.abatimentos.length === 0
                        ? <span className="text-muted-foreground">—</span>
                        : <span>{a.abatimentos.length}× ({fmtBRLPrecise(a.abatimentos.reduce((s, b) => s + b.valor, 0))})</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {a.status === "ativo" && a.saldoDisponivel > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setAbaterAlvo(a)}>
                            <Receipt className="mr-1 h-3.5 w-3.5" />Abater
                          </Button>
                        )}
                        {a.status === "ativo" && a.abatimentos.length === 0 && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => {
                              const m = prompt("Motivo do estorno (mín. 5 caracteres):");
                              if (m && m.length >= 5) {
                                try { estornarAdiantamento(a.id, m, "Admin"); toast.success("Adiantamento estornado."); }
                                catch (e: any) { toast.error(e.message); }
                              }
                            }}
                          ><Undo2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {abaterAlvo && (
        <AbaterDialog adiantamento={abaterAlvo} onClose={() => setAbaterAlvo(null)} />
      )}
    </div>
  );
}

// ----------------------------------------------------------- novo adiantamento
function NovoAdiantamentoDialog({ tipo, onClose }: { tipo: AdiantamentoTipo; onClose: () => void }) {
  const contas = useContasFinanceiras().filter((c) => c.ativo);
  const [contraparte, setContraparte] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState<string>(contas[0]?.id ?? "");
  const [contratoId, setContratoId] = useState("");
  const [obs, setObs] = useState("");

  function salvar() {
    try {
      const conta = contas.find((c) => c.id === contaId);
      registrarAdiantamento({
        tipo,
        contraparteNome: contraparte,
        valor: Number(valor),
        data,
        contaFinanceira: conta?.nome,
        contratoId: contratoId || undefined,
        observacao: obs || undefined,
      }, "Admin");
      toast.success("Adiantamento registrado.");
      onClose();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Novo adiantamento {tipo === "cliente" ? "de cliente" : "a fornecedor"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <div>
          <Label className="text-xs">{tipo === "cliente" ? "Cliente" : "Fornecedor"}</Label>
          <Input value={contraparte} onChange={(e) => setContraparte(e.target.value)} placeholder="Nome completo / razão social" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" step="0.01" min={0} value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Conta financeira</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Contrato (opcional)</Label>
            <Input value={contratoId} onChange={(e) => setContratoId(e.target.value)} placeholder="CT-…" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Observação</Label>
          <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={!contraparte.trim() || !valor || Number(valor) <= 0}>Registrar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ----------------------------------------------------------- abater
function AbaterDialog({ adiantamento, onClose }: { adiantamento: Adiantamento; onClose: () => void }) {
  const titulos = useTitulos();
  const candidatos = useMemo(() => {
    const tipoTit = adiantamento.tipo === "cliente" ? "AR" : "AP";
    return titulos.filter(
      (t) =>
        t.tipo === tipoTit &&
        t.status !== "cancelado" &&
        t.saldo > 0.001 &&
        (adiantamento.tipo === "cliente" ? t.cliente === adiantamento.contraparteNome : t.fornecedor === adiantamento.contraparteNome),
    );
  }, [titulos, adiantamento]);

  const [tituloId, setTituloId] = useState<string>(candidatos[0]?.id ?? "");
  const titulo = candidatos.find((t) => t.id === tituloId);
  const maxValor = Math.min(adiantamento.saldoDisponivel, titulo?.saldo ?? 0);
  const [valor, setValor] = useState<string>(maxValor.toFixed(2));
  const [obs, setObs] = useState("");

  function confirmar() {
    try {
      abaterAdiantamento({
        adiantamentoId: adiantamento.id,
        tituloId,
        valor: Number(valor),
        observacao: obs || undefined,
      }, "Admin");
      toast.success("Abatimento realizado.");
      onClose();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Abater adiantamento {adiantamento.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            <div><span className="text-muted-foreground">Contraparte:</span> {adiantamento.contraparteNome}</div>
            <div><span className="text-muted-foreground">Saldo disponível:</span> <span className="font-semibold">{fmtBRLPrecise(adiantamento.saldoDisponivel)}</span></div>
          </div>

          {candidatos.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Nenhum título em aberto compatível foi encontrado para {adiantamento.contraparteNome}.
              Cadastre o título antes de abater.
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs">Título a abater</Label>
                <Select value={tituloId} onValueChange={(v) => {
                  setTituloId(v);
                  const t = candidatos.find((x) => x.id === v);
                  if (t) setValor(Math.min(adiantamento.saldoDisponivel, t.saldo).toFixed(2));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {candidatos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.id} · {t.descricao} · saldo {fmtBRLPrecise(t.saldo)} · venc {fmtBR(t.vencimento)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor a abater (máx. {fmtBRLPrecise(maxValor)})</Label>
                <Input type="number" step="0.01" min={0} max={maxValor} value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Observação</Label>
                <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={confirmar}
            disabled={candidatos.length === 0 || !titulo || Number(valor) <= 0 || Number(valor) > maxValor + 0.01}
          >Confirmar abatimento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
