// UI dos novos módulos de Títulos Financeiros (AP / AR).
// Importa o store fin-titulos-store e fornece tabelas + dialogs.
import { useMemo, useRef, useState } from "react";
import { Plus, SquarePen, CheckCircle2, XCircle, Undo2, Eye, Lock, Paperclip, Download, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useTitulos, criarTitulo, atualizarTitulo, cancelarTitulo, registrarBaixa,
  estornarMovimento, importarPrevisoesDoLegado,
  adicionarAnexo, removerAnexo,
  type Titulo, type TituloTipo, type TituloStatus, type Anexo,
} from "@/lib/fin-titulos-store";
import { useFornecedores } from "@/lib/fin-fornecedores-store";
import { useContasFinanceiras } from "@/lib/fin-contas-store";
import { useNaturezasFin } from "@/lib/fin-naturezas-store";
import { useGrupos, useSubgrupos } from "@/lib/fin-grupos-store";
import { useCentrosCustoFin } from "@/lib/fin-centros-custo-store";
import { useTiposAplicacao } from "@/lib/fin-tipos-aplicacao-store";
import { useMeiosPagamento } from "@/lib/fin-meios-pagamento-store";
import { readLancamentos, fmtBRLPrecise } from "@/lib/financeiro-store";

const STATUS_TONE: Record<TituloStatus, string> = {
  previsto:     "bg-amber-500/15 text-amber-600 border-amber-500/30",
  comprometido: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  a_pagar:      "bg-rose-500/15 text-rose-600 border-rose-500/30",
  a_receber:    "bg-sky-500/15 text-sky-600 border-sky-500/30",
  parcial:      "bg-orange-500/15 text-orange-600 border-orange-500/30",
  pago:         "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  recebido:     "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelado:    "bg-zinc-500/15 text-zinc-500 border-zinc-500/30 line-through",
};

const STATUS_LABEL: Record<TituloStatus, string> = {
  previsto: "Previsto", comprometido: "Comprometido",
  a_pagar: "A pagar", a_receber: "A receber",
  parcial: "Parcial", pago: "Pago", recebido: "Recebido", cancelado: "Cancelado",
};

function StatusPill({ s }: { s: TituloStatus }) {
  return <Badge variant="outline" className={`${STATUS_TONE[s]} border text-[10px] font-semibold`}>{STATUS_LABEL[s]}</Badge>;
}

function fmtDateBR(d?: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

/* ============================================================
 * Tabela principal (AP ou AR)
 * ============================================================ */
export function TitulosTab({ tipo }: { tipo: TituloTipo }) {
  const todos = useTitulos();
  const naturezas = useNaturezas()[0];
  const centros = useCentrosCusto()[0];
  const fornecedores = useFornecedores();
  const contas = useContasFinanceiras();
  const [fStatus, setFStatus] = useState<TituloStatus | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [criarOpen, setCriarOpen] = useState(false);
  const [editar, setEditar] = useState<Titulo | null>(null);
  const [baixar, setBaixar] = useState<Titulo | null>(null);
  const [estornar, setEstornar] = useState<{ titulo: Titulo; movId: string } | null>(null);
  const [verHist, setVerHist] = useState<Titulo | null>(null);

  const lista = useMemo(() => {
    let arr = todos.filter((t) => t.tipo === tipo);
    if (fStatus !== "todos") arr = arr.filter((t) => t.status === fStatus);
    if (busca.trim()) {
      const b = busca.toLowerCase();
      arr = arr.filter((t) =>
        t.descricao.toLowerCase().includes(b) ||
        (t.fornecedor ?? "").toLowerCase().includes(b) ||
        (t.cliente ?? "").toLowerCase().includes(b) ||
        (t.contratoId ?? "").toLowerCase().includes(b) ||
        (t.obraId ?? "").toLowerCase().includes(b),
      );
    }
    return arr.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [todos, tipo, fStatus, busca]);

  const totais = useMemo(() => {
    const aberto = lista.filter((t) => t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado");
    return {
      qtd: lista.length,
      aberto: aberto.length,
      saldoAberto: aberto.reduce((s, t) => s + t.saldo, 0),
      pago: lista.filter((t) => t.status === "pago" || t.status === "recebido").reduce((s, t) => s + t.valorOriginal, 0),
    };
  }, [lista]);

  const titulo = tipo === "AP" ? "Contas a Pagar" : "Contas a Receber";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="descrição, fornecedor, cliente, contrato…" className="h-9 w-72" />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={fStatus} onValueChange={(v) => setFStatus(v as any)}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {(["previsto","comprometido","a_pagar","a_receber","parcial","pago","recebido","cancelado"] as TituloStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const n = importarPrevisoesDoLegado(readLancamentos());
              toast.success(n > 0 ? `${n} previsões importadas como títulos.` : "Nada novo para importar.");
            }}
            title="Importa Previsto/A realizar/Confirmado do fluxo de caixa para títulos"
          >
            Importar previsões
          </Button>
          <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1.5 h-4 w-4" /> Novo título</Button>
            </DialogTrigger>
            <TituloDialog
              tipo={tipo}
              fornecedores={fornecedores}
              contas={contas}
              naturezas={naturezas.map((n) => n.nome)}
              centros={centros.map((c) => c.nome)}
              onSave={(input) => { criarTitulo({ ...input, tipo, origem: "manual" }); toast.success("Título criado."); setCriarOpen(false); }}
              onCancel={() => setCriarOpen(false)}
            />
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total títulos</div><div className="text-lg font-semibold">{totais.qtd}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Em aberto</div><div className="text-lg font-semibold">{totais.aberto}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Saldo aberto</div><div className="text-lg font-semibold">{fmtBRLPrecise(totais.saldoAberto)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">{tipo === "AP" ? "Pago" : "Recebido"}</div><div className="text-lg font-semibold">{fmtBRLPrecise(totais.pago)}</div></Card>
      </div>

      <Card className="bg-[image:var(--gradient-card)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">Ações</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>{tipo === "AP" ? "Fornecedor" : "Cliente"}</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                Nenhum título. Crie manualmente ou importe previsões.
              </TableCell></TableRow>
            )}
            {lista.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" title="Histórico" onClick={() => setVerHist(t)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado" && (
                      <>
                        <Button size="icon" variant="ghost" title="Baixar / pagar" onClick={() => setBaixar(t)} disabled={!!t.bloqueadoFechamento}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditar(t)} disabled={!!t.bloqueadoFechamento}>
                          <SquarePen className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {t.bloqueadoFechamento && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-primary">{t.id}</TableCell>
                <TableCell className="font-medium">
                  {t.descricao}
                  {t.parcelaLabel && <span className="ml-1 text-xs text-muted-foreground">({t.parcelaLabel})</span>}
                  {t.obraId && <div className="text-[10px] text-muted-foreground">Obra: {t.obraId}</div>}
                </TableCell>
                <TableCell className="text-muted-foreground">{tipo === "AP" ? (t.fornecedor ?? "—") : (t.cliente ?? "—")}</TableCell>
                <TableCell className="text-muted-foreground">{fmtDateBR(t.vencimento)}</TableCell>
                <TableCell className="text-right font-medium">{fmtBRLPrecise(t.valorOriginal)}</TableCell>
                <TableCell className="text-right">{fmtBRLPrecise(t.saldo)}</TableCell>
                <TableCell><StatusPill s={t.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Editar */}
      <Dialog open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        {editar && (
          <TituloDialog
            tipo={tipo}
            initial={editar}
            fornecedores={fornecedores}
            contas={contas}
            naturezas={naturezas.map((n) => n.nome)}
            centros={centros.map((c) => c.nome)}
            onSave={(patch) => {
              try {
                atualizarTitulo(editar.id, patch);
                toast.success("Título atualizado.");
                setEditar(null);
              } catch (e: any) { toast.error(e.message); }
            }}
            onCancel={() => setEditar(null)}
            onCancelarTitulo={(motivo) => {
              try { cancelarTitulo(editar.id, motivo); toast.success("Título cancelado."); setEditar(null); }
              catch (e: any) { toast.error(e.message); }
            }}
          />
        )}
      </Dialog>

      {/* Baixa */}
      <Dialog open={!!baixar} onOpenChange={(o) => !o && setBaixar(null)}>
        {baixar && (
          <BaixaDialog
            titulo={baixar}
            contas={contas}
            onSave={(b) => {
              try { registrarBaixa(baixar.id, b); toast.success(tipo === "AP" ? "Pagamento registrado." : "Recebimento registrado."); setBaixar(null); }
              catch (e: any) { toast.error(e.message); }
            }}
            onCancel={() => setBaixar(null)}
          />
        )}
      </Dialog>

      {/* Histórico + estorno */}
      <Dialog open={!!verHist} onOpenChange={(o) => !o && setVerHist(null)}>
        {verHist && (
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{verHist.id} — Movimentos & Auditoria</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-sm">
                <div><strong>Descrição:</strong> {verHist.descricao}</div>
                <div><strong>Valor:</strong> {fmtBRLPrecise(verHist.valorOriginal)} · <strong>Pago:</strong> {fmtBRLPrecise(verHist.valorPago)} · <strong>Saldo:</strong> {fmtBRLPrecise(verHist.saldo)}</div>
                <div><strong>Vencimento:</strong> {fmtDateBR(verHist.vencimento)} · <strong>Origem:</strong> {verHist.origem}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Movimentos</div>
                {verHist.movimentos.length === 0 ? (
                  <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">Sem movimentos.</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Data</TableHead><TableHead className="text-right">Valor</TableHead>
                      <TableHead>Meio</TableHead><TableHead>Conta</TableHead><TableHead>Obs.</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {verHist.movimentos.map((m) => (
                        <TableRow key={m.id} className={m.estornado ? "opacity-50 line-through" : ""}>
                          <TableCell>{fmtDateBR(m.data)}</TableCell>
                          <TableCell className="text-right">{fmtBRLPrecise(m.valor)}</TableCell>
                          <TableCell>{m.meioPagamento ?? "—"}</TableCell>
                          <TableCell>{m.contaFinanceira ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.observacao ?? "—"}</TableCell>
                          <TableCell>
                            {!m.estornado && (
                              <Button size="icon" variant="ghost" title="Estornar" onClick={() => setEstornar({ titulo: verHist, movId: m.id })}>
                                <Undo2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerHist(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Estorno */}
      <Dialog open={!!estornar} onOpenChange={(o) => !o && setEstornar(null)}>
        {estornar && (
          <EstornoDialog
            onSave={(motivo) => {
              try { estornarMovimento(estornar.titulo.id, estornar.movId, motivo); toast.success("Movimento estornado."); setEstornar(null); setVerHist(null); }
              catch (e: any) { toast.error(e.message); }
            }}
            onCancel={() => setEstornar(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

/* ============================================================
 * Dialog: criar / editar título
 * ============================================================ */
function TituloDialog({
  tipo, initial, fornecedores, contas, naturezas, centros,
  onSave, onCancel, onCancelarTitulo,
}: {
  tipo: TituloTipo;
  initial?: Titulo;
  fornecedores: { id: string; nome: string }[];
  contas: { id: string; nome: string }[];
  naturezas: string[];
  centros: string[];
  onSave: (input: any) => void;
  onCancel: () => void;
  onCancelarTitulo?: (motivo: string) => void;
}) {
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [valorOriginal, setValor] = useState<number>(initial?.valorOriginal ?? 0);
  const [vencimento, setVenc] = useState(initial?.vencimento ?? new Date().toISOString().slice(0, 10));
  const [natureza, setNatureza] = useState(initial?.natureza ?? (naturezas[0] ?? ""));
  const [centroCusto, setCentro] = useState(initial?.centroCusto ?? (centros[0] ?? ""));
  const [fornecedor, setFornecedor] = useState(initial?.fornecedor ?? "");
  const [cliente, setCliente] = useState(initial?.cliente ?? "");
  const [obraId, setObra] = useState(initial?.obraId ?? "");
  const [contratoId, setContrato] = useState(initial?.contratoId ?? "");
  const [meioPagamento, setMeio] = useState(initial?.meioPagamento ?? "");
  const [contaFinanceira, setConta] = useState(initial?.contaFinanceira ?? "");
  const [observacao, setObs] = useState(initial?.observacao ?? "");
  const [cancelMotivo, setCancelMotivo] = useState("");

  const submit = () => {
    if (!descricao.trim()) return toast.error("Descrição obrigatória.");
    if (!(valorOriginal > 0)) return toast.error("Valor deve ser maior que zero.");
    if (!vencimento) return toast.error("Vencimento obrigatório.");
    onSave({
      descricao, valorOriginal: Number(valorOriginal), vencimento,
      competencia: vencimento.slice(0, 7),
      natureza, centroCusto,
      fornecedor: tipo === "AP" ? fornecedor : undefined,
      cliente: tipo === "AR" ? cliente : undefined,
      obraId: obraId || undefined,
      contratoId: contratoId || undefined,
      meioPagamento: meioPagamento || undefined,
      contaFinanceira: contaFinanceira || undefined,
      observacao: observacao || undefined,
    });
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{initial ? "Editar título" : `Novo título · ${tipo === "AP" ? "Contas a Pagar" : "Contas a Receber"}`}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Descrição</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        <div><Label>Valor</Label><Input type="number" step="0.01" value={valorOriginal} onChange={(e) => setValor(Number(e.target.value))} /></div>
        <div><Label>Vencimento</Label><Input type="date" value={vencimento} onChange={(e) => setVenc(e.target.value)} /></div>
        <div>
          <Label>Natureza</Label>
          <Select value={natureza} onValueChange={setNatureza}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{naturezas.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Centro de custo</Label>
          <Select value={centroCusto} onValueChange={setCentro}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{centros.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {tipo === "AP" ? (
          <div>
            <Label>Fornecedor</Label>
            <Select value={fornecedor} onValueChange={setFornecedor}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{fornecedores.map((f) => <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : (
          <div><Label>Cliente</Label><Input value={cliente} onChange={(e) => setCliente(e.target.value)} /></div>
        )}
        <div><Label>Meio de pagamento</Label><Input value={meioPagamento} onChange={(e) => setMeio(e.target.value)} placeholder="PIX, Boleto, Cartão…" /></div>
        <div>
          <Label>Conta financeira</Label>
          <Select value={contaFinanceira} onValueChange={setConta}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{contas.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Obra (opcional)</Label><Input value={obraId} onChange={(e) => setObra(e.target.value)} /></div>
        <div><Label>Contrato (opcional)</Label><Input value={contratoId} onChange={(e) => setContrato(e.target.value)} /></div>
        <div className="col-span-2"><Label>Observação</Label><Textarea value={observacao} onChange={(e) => setObs(e.target.value)} rows={2} /></div>
      </div>
      {initial && onCancelarTitulo && (
        <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/5 p-3">
          <div className="mb-1 text-xs font-semibold text-rose-600">Cancelar título</div>
          <div className="flex items-center gap-2">
            <Input placeholder="Motivo do cancelamento" value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} />
            <Button variant="destructive" onClick={() => cancelMotivo.trim() ? onCancelarTitulo(cancelMotivo) : toast.error("Informe o motivo.")}>
              <XCircle className="mr-1 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button onClick={submit}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ============================================================
 * Dialog: baixa (parcial/total)
 * ============================================================ */
function BaixaDialog({
  titulo, contas, onSave, onCancel,
}: {
  titulo: Titulo;
  contas: { id: string; nome: string }[];
  onSave: (b: any) => void;
  onCancel: () => void;
}) {
  const [valor, setValor] = useState<number>(titulo.saldo);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [juros, setJuros] = useState<number>(0);
  const [multa, setMulta] = useState<number>(0);
  const [desconto, setDesconto] = useState<number>(0);
  const [meioPagamento, setMeio] = useState(titulo.meioPagamento ?? "");
  const [contaFinanceira, setConta] = useState(titulo.contaFinanceira ?? "");
  const [observacao, setObs] = useState("");

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>
          {titulo.tipo === "AP" ? "Registrar pagamento" : "Registrar recebimento"} · {titulo.id}
        </DialogTitle>
      </DialogHeader>
      <div className="mb-2 rounded bg-muted/40 p-2 text-sm">
        <div><strong>{titulo.descricao}</strong></div>
        <div className="text-xs text-muted-foreground">Saldo atual: {fmtBRLPrecise(titulo.saldo)} de {fmtBRLPrecise(titulo.valorOriginal)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor (principal)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
        <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        <div><Label>Juros</Label><Input type="number" step="0.01" value={juros} onChange={(e) => setJuros(Number(e.target.value))} /></div>
        <div><Label>Multa</Label><Input type="number" step="0.01" value={multa} onChange={(e) => setMulta(Number(e.target.value))} /></div>
        <div><Label>Desconto</Label><Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} /></div>
        <div><Label>Meio</Label><Input value={meioPagamento} onChange={(e) => setMeio(e.target.value)} placeholder="PIX, Boleto…" /></div>
        <div className="col-span-2">
          <Label>Conta financeira</Label>
          <Select value={contaFinanceira} onValueChange={setConta}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{contas.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={observacao} onChange={(e) => setObs(e.target.value)} /></div>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        Total da baixa: <strong>{fmtBRLPrecise(valor + juros + multa - desconto)}</strong>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button onClick={() => onSave({ valor, data, juros, multa, desconto, meioPagamento, contaFinanceira, observacao })}>
          Confirmar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ============================================================
 * Dialog: estorno
 * ============================================================ */
function EstornoDialog({ onSave, onCancel }: { onSave: (motivo: string) => void; onCancel: () => void }) {
  const [motivo, setMotivo] = useState("");
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Estornar movimento</DialogTitle></DialogHeader>
      <div className="space-y-2">
        <Label>Motivo do estorno (obrigatório)</Label>
        <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo para registro de auditoria." />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button variant="destructive" onClick={() => motivo.trim() ? onSave(motivo.trim()) : toast.error("Informe o motivo.")}>
          Estornar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
