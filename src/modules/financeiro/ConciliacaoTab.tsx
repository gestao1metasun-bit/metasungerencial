// Conciliação Bancária: extrato importado x títulos AP/AR.
import { useMemo, useState } from "react";
import { Plus, Upload, Link2, X, Undo2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  useFinanceiroRepo, useRepoExtrato, useRepoContas, useRepoTitulos,
} from "@/hooks/useRepoFinanceiro";
import type {
  ExtratoLancamento, ExtratoStatus, ContaFinanceira, CandidatoConciliacao,
} from "@/lib/repositories/financeiro-repository";
import { fmtBRLPrecise } from "@/lib/financeiro-store";

const STATUS_TONE: Record<ExtratoStatus, string> = {
  pendente:   "bg-amber-500/15 text-amber-600 border-amber-500/30",
  conciliado: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  ignorado:   "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
};

function fmtBR(d: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

export function ConciliacaoTab() {
  const repo = useFinanceiroRepo();
  const extrato = useRepoExtrato();
  const contas = useRepoContas();
  const titulos = useRepoTitulos();

  const [contaSel, setContaSel] = useState<string>("todas");
  const [statusF, setStatusF] = useState<"todos" | ExtratoStatus>("pendente");
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    return extrato.filter((e) => {
      if (contaSel !== "todas" && e.contaFinanceira !== contaSel) return false;
      if (statusF !== "todos" && e.status !== statusF) return false;
      if (busca && !`${e.descricao} ${e.documento ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [extrato, contaSel, statusF, busca]);

  const kpis = useMemo(() => {
    const escopo = contaSel === "todas" ? extrato : extrato.filter((e) => e.contaFinanceira === contaSel);
    const pendentes = escopo.filter((e) => e.status === "pendente");
    const conciliados = escopo.filter((e) => e.status === "conciliado");
    const sumEntradas = pendentes.filter((e) => e.valor > 0).reduce((s, e) => s + e.valor, 0);
    const sumSaidas = pendentes.filter((e) => e.valor < 0).reduce((s, e) => s + e.valor, 0);
    return {
      total: escopo.length, pendentes: pendentes.length, conciliados: conciliados.length,
      sumEntradas, sumSaidas,
    };
  }, [extrato, contaSel]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total importado</div><div className="mt-1 text-2xl font-semibold">{kpis.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pendentes</div><div className="mt-1 text-2xl font-semibold text-amber-600">{kpis.pendentes}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Conciliados</div><div className="mt-1 text-2xl font-semibold text-emerald-600">{kpis.conciliados}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Entradas pendentes</div><div className="mt-1 text-xl font-semibold text-emerald-600">{fmtBRLPrecise(kpis.sumEntradas)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Saídas pendentes</div><div className="mt-1 text-xl font-semibold text-rose-600">{fmtBRLPrecise(kpis.sumSaidas)}</div></Card>
      </div>

      {/* Filtros + Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={contaSel} onValueChange={setContaSel}>
          <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as contas</SelectItem>
            {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusF} onValueChange={(v) => setStatusF(v as any)}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="conciliado">Conciliado</SelectItem>
            <SelectItem value="ignorado">Ignorado</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Buscar descrição/documento…" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="ml-auto flex gap-2">
          <ImportarExtratoDialog contas={contas} />
          <NovoLancamentoExtratoDialog contas={contas} />
        </div>
      </div>

      {/* Tabela */}
      <Card className="bg-[image:var(--gradient-card)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[230px]">Ações</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Título vinculado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sem lançamentos. Importe um extrato CSV ou adicione manualmente.</TableCell></TableRow>
            )}
            {filtrados.map((e) => {
              const conta = contas.find((c) => c.id === e.contaFinanceira);
              const titulo = e.tituloId ? titulos.find((t) => t.id === e.tituloId) : undefined;
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {e.status === "pendente" && (
                        <>
                          <ConciliarDialog extrato={e} />
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => {
                            const m = prompt("Motivo para ignorar:");
                            if (m) { try { await repo.ignorarExtrato(e.id, m); } catch (err: any) { toast.error(err?.message ?? "Erro."); } }
                          }}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {e.status === "conciliado" && (
                        <Button size="sm" variant="ghost" className="h-7 px-2"
                          onClick={async () => { try { await repo.desfazerConciliacao(e.id, "Desfazer manual"); toast.info("Conciliação desfeita. Estorne a baixa no título se necessário."); } catch (err: any) { toast.error(err?.message ?? "Erro."); } }}>
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                        onClick={async () => { if (confirm("Remover este lançamento do extrato?")) { try { await repo.removerExtrato(e.id); } catch (err: any) { toast.error(err?.message ?? "Erro."); } } }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{fmtBR(e.data)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{e.descricao}</div>
                    {e.documento && <div className="text-xs text-muted-foreground">Doc: {e.documento}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{conta?.nome ?? e.contaFinanceira}</TableCell>
                  <TableCell className={`text-right font-mono ${e.valor >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmtBRLPrecise(e.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_TONE[e.status]}>{e.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {titulo ? (
                      <div>
                        <div className="font-medium">{titulo.id}</div>
                        <div className="text-muted-foreground">{titulo.descricao}</div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ================ Importar CSV ================ */
function ImportarExtratoDialog({ contas }: { contas: ContaFinanceira[] }) {
  const repo = useFinanceiroRepo();
  const [open, setOpen] = useState(false);
  const [conta, setConta] = useState<string>(contas[0]?.id ?? "");
  const [csv, setCsv] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Importar CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar extrato bancário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Conta financeira</Label>
            <Select value={conta} onValueChange={setConta}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>CSV — colunas: <code>data;descricao;valor[;documento]</code></Label>
            <Textarea rows={10} className="mt-1 font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)}
              placeholder={"2026-05-10;Recebimento PIX João Silva;1500,00\n2026-05-11;Pagamento fornecedor X;-2300,50;NF-1234"} />
            <p className="mt-1 text-xs text-muted-foreground">Valor negativo (ou entre parênteses) = saída. Aceita DD/MM/AAAA.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (!conta) { toast.error("Selecione a conta."); return; }
            try {
              const n = await repo.importarExtratoCSV(conta, csv);
              if (n > 0) { toast.success(`${n} lançamento(s) importado(s).`); setCsv(""); setOpen(false); }
              else toast.error("Nenhuma linha válida encontrada.");
            } catch (err: any) { toast.error(err?.message ?? "Erro."); }
          }}>Importar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================ Novo lançamento manual ================ */
function NovoLancamentoExtratoDialog({ contas }: { contas: ReturnType<typeof useContasFinanceiras> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    conta: contas[0]?.id ?? "",
    data: new Date().toISOString().slice(0, 10),
    descricao: "", valor: "", documento: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo lançamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento do extrato</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Conta financeira</Label>
            <Select value={form.conta} onValueChange={(v) => setForm({ ...form, conta: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div><Label>Valor (− saída)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
          <div className="col-span-2"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div className="col-span-2"><Label>Documento</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            const valor = Number(form.valor);
            if (!form.conta || !form.descricao || !Number.isFinite(valor) || valor === 0) { toast.error("Preencha conta, descrição e valor."); return; }
            adicionarLancamentoExtrato({ contaFinanceira: form.conta, data: form.data, descricao: form.descricao, valor, documento: form.documento || undefined });
            toast.success("Lançamento adicionado.");
            setOpen(false);
            setForm({ ...form, descricao: "", valor: "", documento: "" });
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================ Conciliar (sugestões) ================ */
function ConciliarDialog({ extrato }: { extrato: ExtratoLancamento }) {
  const [open, setOpen] = useState(false);
  const titulos = useTitulos();
  const [tituloIdManual, setTituloIdManual] = useState("");
  const candidatos = useMemo(() => sugerirCandidatos(extrato, titulos), [extrato, titulos]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="h-7 px-2"><Link2 className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Conciliar lançamento bancário</DialogTitle></DialogHeader>
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">{extrato.descricao}</div>
              <div className="text-xs text-muted-foreground">{fmtBR(extrato.data)} · {extrato.documento ?? "—"}</div>
            </div>
            <div className={`font-mono text-lg ${extrato.valor >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtBRLPrecise(extrato.valor)}</div>
          </div>
        </div>

        <div className="mt-3">
          <Label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide">
            <CheckCircle2 className="h-3 w-3" /> Candidatos sugeridos
          </Label>
          {candidatos.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              <AlertCircle className="mx-auto mb-1 h-4 w-4" />
              Nenhum título compatível. Vincule manualmente abaixo.
            </div>
          ) : (
            <div className="max-h-[260px] space-y-2 overflow-auto">
              {candidatos.map(({ t, dif, exato }) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{t.id} · {t.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      Venc {fmtBR(t.vencimento)} · saldo {fmtBRLPrecise(t.saldo)} {exato && <Badge className="ml-1" variant="outline">match exato</Badge>}
                      {!exato && <> · dif {fmtBRLPrecise(dif)}</>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => {
                    try { conciliar(extrato.id, t.id); toast.success("Conciliado e baixa registrada."); setOpen(false); }
                    catch (err: any) { toast.error(err?.message ?? "Erro ao conciliar."); }
                  }}>Conciliar</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border-t pt-3">
          <Label>Vincular por ID de título manualmente</Label>
          <div className="mt-1 flex gap-2">
            <Input placeholder="AR-… ou AP-…" value={tituloIdManual} onChange={(e) => setTituloIdManual(e.target.value.trim())} />
            <Button variant="secondary" onClick={() => {
              try { conciliar(extrato.id, tituloIdManual); toast.success("Conciliado."); setOpen(false); }
              catch (err: any) { toast.error(err?.message ?? "Erro."); }
            }}>Vincular</Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
