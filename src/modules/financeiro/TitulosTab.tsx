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
  const naturezas = useNaturezasFin();
  const grupos = useGrupos();
  const subgrupos = useSubgrupos();
  const centros = useCentrosCustoFin();
  const tiposAplic = useTiposAplicacao();
  const meios = useMeiosPagamento();
  const fornecedores = useFornecedores();
  const contas = useContasFinanceiras();
  const cadastros = { naturezas, grupos, subgrupos, centros, tiposAplic, meios, fornecedores, contas };
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
              cadastros={cadastros}
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
            cadastros={cadastros}
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
              <AnexosBlock titulo={verHist} editavel={!verHist.bloqueadoFechamento} />
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
 * Tipos auxiliares de cadastros
 * ============================================================ */
type Cadastros = {
  naturezas: ReturnType<typeof useNaturezasFin>;
  grupos: ReturnType<typeof useGrupos>;
  subgrupos: ReturnType<typeof useSubgrupos>;
  centros: ReturnType<typeof useCentrosCustoFin>;
  tiposAplic: ReturnType<typeof useTiposAplicacao>;
  meios: ReturnType<typeof useMeiosPagamento>;
  fornecedores: { id: string; nome: string }[];
  contas: { id: string; nome: string }[];
};

/* ============================================================
 * Dialog: criar / editar título — cascata Natureza → Grupo/Subgrupo/Centro/Aplicação
 * ============================================================ */
function TituloDialog({
  tipo, initial, cadastros, onSave, onCancel, onCancelarTitulo,
}: {
  tipo: TituloTipo;
  initial?: Titulo;
  cadastros: Cadastros;
  onSave: (input: any) => void;
  onCancel: () => void;
  onCancelarTitulo?: (motivo: string) => void;
}) {
  const { naturezas, grupos, subgrupos, centros, tiposAplic, meios, fornecedores, contas } = cadastros;

  // filtra naturezas pelo tipo do título (AP → Pagar | AR → Receber) e somente ativas
  const naturezasDisp = useMemo(
    () => naturezas.filter((n) => n.ativo && (tipo === "AP" ? n.tipo === "Pagar" : n.tipo === "Receber")),
    [naturezas, tipo],
  );

  const [naturezaId, setNaturezaId] = useState<string>(initial?.naturezaId ?? naturezasDisp[0]?.id ?? "");
  const natSel = naturezasDisp.find((n) => n.id === naturezaId) ?? naturezas.find((n) => n.id === naturezaId);

  const [grupoId, setGrupoId] = useState<string>(initial?.grupoId ?? natSel?.grupoId ?? "");
  const [subgrupoId, setSubgrupoId] = useState<string>(initial?.subgrupoId ?? natSel?.subgrupoId ?? "");
  const [centroCustoId, setCentroCustoId] = useState<string>(initial?.centroCustoId ?? natSel?.centroCustoPadraoId ?? centros[0]?.id ?? "");
  const [tipoAplicacaoId, setTipoAplicacaoId] = useState<string>(initial?.tipoAplicacaoId ?? natSel?.tipoAplicacaoPadraoId ?? "");
  const [meioPagamentoId, setMeioPagamentoId] = useState<string>(initial?.meioPagamentoId ?? "");
  const [contaFinanceiraNome, setContaNome] = useState(initial?.contaFinanceira ?? "");

  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [valorOriginal, setValor] = useState<number>(initial?.valorOriginal ?? 0);
  const [vencimento, setVenc] = useState(initial?.vencimento ?? new Date().toISOString().slice(0, 10));
  const [fornecedor, setFornecedor] = useState(initial?.fornecedor ?? "");
  const [cliente, setCliente] = useState(initial?.cliente ?? "");
  const [obraId, setObra] = useState(initial?.obraId ?? "");
  const [contratoId, setContrato] = useState(initial?.contratoId ?? "");
  const [observacao, setObs] = useState(initial?.observacao ?? "");
  const [cancelMotivo, setCancelMotivo] = useState("");

  // Anexos pendentes (apenas em criação; em edição os anexos já existentes são gerenciados pelo AnexosBlock)
  const [anexosPend, setAnexosPend] = useState<Anexo[]>(initial?.anexos ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cascata: ao trocar a natureza, sugerir grupo/subgrupo/centro/aplicação padrão
  const aoTrocarNatureza = (id: string) => {
    setNaturezaId(id);
    const n = naturezas.find((x) => x.id === id);
    if (n) {
      setGrupoId(n.grupoId);
      setSubgrupoId(n.subgrupoId ?? "");
      if (n.centroCustoPadraoId) setCentroCustoId(n.centroCustoPadraoId);
      if (n.tipoAplicacaoPadraoId) setTipoAplicacaoId(n.tipoAplicacaoPadraoId);
    }
  };

  const subgruposDisp = useMemo(() => subgrupos.filter((s) => s.grupoId === grupoId && s.ativo), [subgrupos, grupoId]);

  const handleFiles = async (fs: FileList | null) => {
    if (!fs) return;
    for (const file of Array.from(fs)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: máx. 5 MB`); continue; }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      setAnexosPend((prev) => [...prev, {
        id: `ANX-NEW-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nome: file.name, mime: file.type || "application/octet-stream",
        tamanho: file.size, dataUrl, enviadoEm: new Date().toISOString(),
      }]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    if (!descricao.trim()) return toast.error("Descrição obrigatória.");
    if (!(valorOriginal > 0)) return toast.error("Valor deve ser maior que zero.");
    if (!vencimento) return toast.error("Vencimento obrigatório.");
    if (!naturezaId) return toast.error("Selecione a natureza financeira.");
    if (!centroCustoId) return toast.error("Selecione o centro de custo.");

    const nat = naturezas.find((n) => n.id === naturezaId);
    const cc = centros.find((c) => c.id === centroCustoId);
    const meio = meios.find((m) => m.id === meioPagamentoId);

    onSave({
      descricao, valorOriginal: Number(valorOriginal), vencimento,
      competencia: vencimento.slice(0, 7),
      // IDs estruturais
      naturezaId, grupoId, subgrupoId: subgrupoId || undefined,
      centroCustoId, tipoAplicacaoId: tipoAplicacaoId || undefined,
      meioPagamentoId: meioPagamentoId || undefined,
      // Strings para compat
      natureza: nat?.nome ?? "",
      centroCusto: cc?.nome ?? "",
      meioPagamento: meio?.nome,
      contaFinanceira: contaFinanceiraNome || undefined,
      fornecedor: tipo === "AP" ? fornecedor : undefined,
      cliente: tipo === "AR" ? cliente : undefined,
      obraId: obraId || undefined,
      contratoId: contratoId || undefined,
      observacao: observacao || undefined,
      anexos: anexosPend.length ? anexosPend : undefined,
    });
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Editar título" : `Novo título · ${tipo === "AP" ? "Contas a Pagar" : "Contas a Receber"}`}</DialogTitle></DialogHeader>

      {/* Linha 1: identificação básica */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        <div><Label>Valor *</Label><Input type="number" step="0.01" value={valorOriginal} onChange={(e) => setValor(Number(e.target.value))} onWheel={(e) => e.currentTarget.blur()} /></div>
        <div><Label>Vencimento *</Label><Input type="date" value={vencimento} onChange={(e) => setVenc(e.target.value)} /></div>
      </div>

      {/* Bloco classificação contábil (cascata) */}
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary/80">Classificação gerencial</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Natureza financeira *</Label>
            <Select value={naturezaId} onValueChange={aoTrocarNatureza}>
              <SelectTrigger><SelectValue placeholder="Selecione a natureza…" /></SelectTrigger>
              <SelectContent>
                {naturezasDisp.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    <span className="font-mono text-xs text-muted-foreground">{n.codigo}</span> · {n.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grupo</Label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{grupos.filter((g) => g.ativo).map((g) => <SelectItem key={g.id} value={g.id}>{g.codigo} · {g.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subgrupo</Label>
            <Select value={subgrupoId} onValueChange={setSubgrupoId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{subgruposDisp.map((s) => <SelectItem key={s.id} value={s.id}>{s.codigo} · {s.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Centro de custo *</Label>
            <Select value={centroCustoId} onValueChange={setCentroCustoId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{centros.filter((c) => c.ativo).map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de aplicação</Label>
            <Select value={tipoAplicacaoId} onValueChange={setTipoAplicacaoId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{tiposAplic.filter((t) => t.ativo).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}{t.posVenda ? " (pós-venda)" : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {natSel?.contaContabilFutura && (
          <div className="mt-2 text-[10px] text-muted-foreground">Conta contábil: <span className="font-mono">{natSel.contaContabilFutura}</span></div>
        )}
      </div>

      {/* Bloco partes + pagamento */}
      <div className="mt-3 grid grid-cols-2 gap-3">
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
        <div>
          <Label>Meio de pagamento</Label>
          <Select value={meioPagamentoId} onValueChange={setMeioPagamentoId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{meios.filter((m) => m.ativo).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Conta financeira</Label>
          <Select value={contaFinanceiraNome} onValueChange={setContaNome}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{contas.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Obra (opcional)</Label><Input value={obraId} onChange={(e) => setObra(e.target.value)} /></div>
        <div><Label>Contrato (opcional)</Label><Input value={contratoId} onChange={(e) => setContrato(e.target.value)} /></div>
        <div className="col-span-2"><Label>Observação</Label><Textarea value={observacao} onChange={(e) => setObs(e.target.value)} rows={2} /></div>
      </div>

      {/* Anexos */}
      <div className="mt-3 rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Paperclip className="mr-1 inline h-3.5 w-3.5" /> Anexos / Comprovantes
          </div>
          <div>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.xml" />
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </div>
        {anexosPend.length === 0 ? (
          <div className="rounded border border-dashed p-2 text-center text-xs text-muted-foreground">Nenhum anexo. PDF, imagens ou XML — máx. 5 MB cada.</div>
        ) : (
          <div className="space-y-1">
            {anexosPend.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded bg-background/60 px-2 py-1 text-xs">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{a.nome}</span>
                <span className="text-muted-foreground">{Math.round(a.tamanho / 1024)} KB</span>
                <a href={a.dataUrl} download={a.nome}><Download className="h-3.5 w-3.5" /></a>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAnexosPend((prev) => prev.filter((x) => x.id !== a.id))}>
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {initial && onCancelarTitulo && (
        <div className="mt-3 rounded border border-rose-500/30 bg-rose-500/5 p-3">
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
 * Bloco de anexos do histórico — permite adicionar/remover diretamente
 * ============================================================ */
function AnexosBlock({ titulo, editavel }: { titulo: Titulo; editavel: boolean }) {
  const anexos = titulo.anexos ?? [];
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fs: FileList | null) => {
    if (!fs) return;
    for (const file of Array.from(fs)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: máx. 5 MB`); continue; }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      try {
        adicionarAnexo(titulo.id, { nome: file.name, mime: file.type || "application/octet-stream", tamanho: file.size, dataUrl });
      } catch (e: any) { toast.error(e.message); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground">
          <Paperclip className="mr-1 inline h-3.5 w-3.5" /> Anexos ({anexos.length})
        </div>
        {editavel && (
          <>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.xml" />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
          </>
        )}
      </div>
      {anexos.length === 0 ? (
        <div className="rounded border border-dashed p-2 text-center text-xs text-muted-foreground">Nenhum anexo.</div>
      ) : (
        <div className="space-y-1">
          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded bg-muted/40 px-2 py-1 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{a.nome}</span>
              <span className="text-muted-foreground">{Math.round(a.tamanho / 1024)} KB</span>
              <a href={a.dataUrl} download={a.nome} title="Baixar"><Download className="h-3.5 w-3.5" /></a>
              {editavel && (
                <Button size="icon" variant="ghost" className="h-6 w-6"
                  onClick={() => { try { removerAnexo(titulo.id, a.id); } catch (e: any) { toast.error(e.message); } }}>
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
