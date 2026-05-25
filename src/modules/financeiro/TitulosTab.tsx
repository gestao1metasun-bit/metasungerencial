// UI dos novos módulos de Títulos Financeiros (AP / AR).
// Importa o store fin-titulos-store e fornece tabelas + dialogs.
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadAnexo, signedUrlAnexo, deleteAnexo } from "@/lib/anexos.functions";
import { Plus, SquarePen, CheckCircle2, XCircle, Undo2, Eye, Lock, Paperclip, Download, Trash2, Upload, ArrowDownCircle, ArrowUpCircle, Link2, Sparkles, Split } from "lucide-react";
import { RenegociarTituloDialog } from "@/components/app/financeiro/RenegociarTituloDialog";
import { EdicaoRateioDialog } from "@/components/app/financeiro/EdicaoRateioDialog";
import { TituloRowActions } from "@/components/app/financeiro/TituloRowActions";
import { useContratos } from "@/lib/contratos-store";
import { useObrasSnapshot } from "@/lib/obras-snapshot-store";
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
import { useFornecedores, upsertFornecedor, newFornecedorId } from "@/lib/fin-fornecedores-store";
import { useContasFinanceiras } from "@/lib/fin-contas-store";
import { useNaturezasFin } from "@/lib/fin-naturezas-store";
import { useGrupos, useSubgrupos } from "@/lib/fin-grupos-store";
import { useCentrosCustoFin } from "@/lib/fin-centros-custo-store";
import { useTiposAplicacao } from "@/lib/fin-tipos-aplicacao-store";
import { useMeiosPagamento } from "@/lib/fin-meios-pagamento-store";
import { useClientesFull, addClienteFull, DuplicateClienteError } from "@/lib/clientes-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
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

/* Plano de parcelamento usado no cadastro de título com múltiplas parcelas. */
type ParcelaPlano = {
  vencimento: string;       // YYYY-MM-DD
  valor: number;
  competencia: string;      // YYYY-MM
  fixadoData?: boolean;     // não recalcular vencimento ao redistribuir
  fixadoValor?: boolean;    // não recalcular valor ao redistribuir
};

function round2(n: number) { return Math.round(n * 100) / 100; }

function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, (m - 1) + n, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  const dt = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day));
  return dt.toISOString().slice(0, 10);
}
function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Se a data cair em sábado/domingo, avança para a próxima segunda-feira. */
function proximoDiaUtilISO(iso: string): string {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=dom, 6=sáb
  if (dow === 6) return addDaysISO(iso, 2);
  if (dow === 0) return addDaysISO(iso, 1);
  return iso;
}

type Periodicidade = "mensal" | "quinzenal" | "semanal" | "anual";
function proximoVencimento(base: string, idx: number, p: Periodicidade): string {
  if (idx === 0) return base;
  if (p === "mensal") return addMonthsISO(base, idx);
  if (p === "anual")  return addMonthsISO(base, idx * 12);
  if (p === "quinzenal") return addDaysISO(base, idx * 15);
  return addDaysISO(base, idx * 7);
}

/* ============================================================
 * Combobox de contraparte (cliente/fornecedor) — buscável + adicionar inline
 * ============================================================ */
function ContraparteCombo({
  value, onChange, options, placeholder, onAdd, addLabel,
}: {
  value: string;
  onChange: (nome: string) => void;
  options: { id: string; nome: string; sub?: string }[];
  placeholder: string;
  onAdd: (nome: string) => void;
  addLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const buscaTrim = busca.trim();
  const existe = options.some((o) => o.nome.toLowerCase() === buscaTrim.toLowerCase());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Buscar…" value={busca} onValueChange={setBusca} />
          <CommandList>
            <CommandEmpty>Nenhum encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.id} value={o.nome} onSelect={() => { onChange(o.nome); setOpen(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${value === o.nome ? "opacity-100" : "opacity-0"}`} />
                  <div className="flex flex-col">
                    <span>{o.nome}</span>
                    {o.sub && <span className="text-[10px] text-muted-foreground">{o.sub}</span>}
                  </div>
                </CommandItem>
              ))}
              {buscaTrim && !existe && (
                <CommandItem value={`__add__${buscaTrim}`} onSelect={() => { onAdd(buscaTrim); onChange(buscaTrim); setBusca(""); setOpen(false); }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>{addLabel}: <strong>{buscaTrim}</strong></span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  const uploadAnexoFn = useServerFn(uploadAnexo);
  const [fStatus, setFStatus] = useState<TituloStatus | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [criarOpen, setCriarOpen] = useState(false);
  const [editar, setEditar] = useState<Titulo | null>(null);
  const [baixar, setBaixar] = useState<Titulo | null>(null);
  const [estornar, setEstornar] = useState<{ titulo: Titulo; movId: string } | null>(null);
  const [verHist, setVerHist] = useState<Titulo | null>(null);
  const [renegociar, setRenegociar] = useState<Titulo | null>(null);
  const [ratear, setRatear] = useState<Titulo | null>(null);

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
              onSave={async (input, pendingFiles) => {
                const parcelas: ParcelaPlano[] | undefined = input._parcelas;
                delete input._parcelas;
                const criados: Titulo[] = [];
                try {
                  if (parcelas && parcelas.length > 1) {
                    parcelas.forEach((p, idx) => {
                      const label = `${idx + 1}/${parcelas.length}`;
                      criados.push(criarTitulo({
                        ...input,
                        tipo, origem: input.origem ?? "manual",
                        descricao: `${input.descricao} (${label})`,
                        valorOriginal: p.valor,
                        vencimento: p.vencimento,
                        competencia: p.competencia,
                        parcelaLabel: label,
                      }));
                    });
                    toast.success(`${parcelas.length} parcelas criadas.`);
                  } else {
                    criados.push(criarTitulo({ ...input, tipo, origem: input.origem ?? "manual" }));
                    toast.success("Título criado.");
                  }
                } catch (e: any) {
                  toast.error(e?.message ?? "Falha ao criar título(s).");
                  return;
                }
                setCriarOpen(false);
                const alvo = criados[0];
                if (alvo) for (const file of pendingFiles) {
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("tituloId", alvo.id);
                    const { anexo } = await uploadAnexoFn({ data: fd });
                    adicionarAnexo(alvo.id, {
                      id: anexo.id,
                      nome: anexo.nome,
                      mime: anexo.mime,
                      tamanho: anexo.tamanho,
                      storagePath: anexo.storage_path,
                      enviadoEm: anexo.created_at,
                    });
                  } catch (e: any) {
                    toast.error(`${file.name}: ${e?.message ?? "falha no upload"}`);
                  }
                }
                // Reabre o título recém-criado para anexar comprovantes e/ou fazer rateio.
                if (alvo) setEditar(alvo);
              }}

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
                  <div className="flex items-center gap-1.5">
                    <TituloRowActions
                      titulo={t}
                      onEditar={setEditar}
                      onBaixar={setBaixar}
                      onRatear={setRatear}
                      onDetalhar={setVerHist}
                      onArquivos={setVerHist}
                      onHistorico={setVerHist}
                      onRenegociar={setRenegociar}
                    />
                    {t.bloqueadoFechamento && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    {t.rateios && t.rateios.length > 0 && (
                      <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600" title={`${t.rateios.length} rateios`}>
                        R{t.rateios.length}
                      </span>
                    )}
                    {t.statusRenegociacao === "renegociado" && (
                      <span className="text-[10px] font-semibold text-primary" title="Título renegociado">REN</span>
                    )}
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
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
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

      {/* Renegociação */}
      <RenegociarTituloDialog
        titulo={renegociar}
        open={!!renegociar}
        onClose={() => setRenegociar(null)}
      />

      {/* Edição de rateio */}
      <EdicaoRateioDialog
        titulo={ratear}
        open={!!ratear}
        onOpenChange={(o) => !o && setRatear(null)}
      />
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
  onSave: (input: any, pendingFiles: File[]) => void;
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
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataEmissao, setDataEmissao] = useState(initial?.dataEmissao ?? hoje);
  const [vencimento, setVenc] = useState(initial?.vencimento ?? hoje);
  const [fornecedor, setFornecedor] = useState(initial?.fornecedor ?? "");
  const [cliente, setCliente] = useState(initial?.cliente ?? "");
  const [obraId, setObra] = useState(initial?.obraId ?? "");
  const [contratoId, setContrato] = useState(initial?.contratoId ?? "");
  const [observacao, setObs] = useState(initial?.observacao ?? "");
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [origem, setOrigem] = useState<string>(initial?.origem ?? "manual");

  // Listas de origens reais (obras e contratos cadastrados no ERP)
  const contratosAll = useContratos();
  const obrasAll = useObrasSnapshot();
  const clientesAll = useClientesFull();

  // Obras filtradas pelo contrato selecionado (quando houver)
  const obrasDoContrato = useMemo(
    () => obrasAll.filter((o) => !contratoId || o.contrato === contratoId),
    [obrasAll, contratoId],
  );

  // Opções de origem permitidas por tipo
  const origensDisp = useMemo(() => {
    if (tipo === "AR") return [
      { value: "manual",        label: "Manual" },
      { value: "contrato",      label: "Contrato (parcela)" },
      { value: "financiamento", label: "Financiamento (liberação)" },
      { value: "manutencao",    label: "Manutenção / pós-venda" },
    ];
    return [
      { value: "manual",     label: "Manual" },
      { value: "compra",     label: "Compra de material" },
      { value: "comissao",   label: "Comissão" },
      { value: "mao_obra",   label: "Mão de obra" },
      { value: "frete",      label: "Frete" },
      { value: "manutencao", label: "Manutenção / pós-venda" },
    ];
  }, [tipo]);

  // Auto-preenchimento ao escolher contrato (e reseta obra se não pertencer mais)
  const aoEscolherContrato = (id: string) => {
    setContrato(id);
    if (id && obraId) {
      const o = obrasAll.find((x) => x.id === obraId);
      if (o && o.contrato !== id) setObra("");
    }
    const c = contratosAll.find((x) => x.id === id);
    if (c) {
      if (!cliente) setCliente(c.cliente);
      if (tipo === "AR" && origem === "manual") setOrigem("contrato");
    }
  };
  // Auto-preenchimento ao escolher obra (puxa contrato e cliente)
  const aoEscolherObra = (id: string) => {
    setObra(id);
    const o = obrasAll.find((x) => x.id === id);
    if (o) {
      if (o.contrato && !contratoId) setContrato(o.contrato);
      if (o.cliente && !cliente) setCliente(o.cliente);
    }
  };

  // Adicionar contraparte inline
  const adicionarFornecedorInline = (nome: string) => {
    try {
      upsertFornecedor({ id: newFornecedorId(), nome, ativo: true });
      toast.success(`Fornecedor "${nome}" cadastrado.`);
    } catch (e: any) { toast.error(e?.message ?? "Falha ao cadastrar."); }
  };
  const adicionarClienteInline = (nome: string) => {
    try {
      addClienteFull({ nome, doc: "", telefone: "", cidade: "", uf: "" });
      toast.success(`Cliente "${nome}" cadastrado.`);
    } catch (e: any) {
      if (e instanceof DuplicateClienteError) toast.info("Cliente já existia — usando o cadastro existente.");
      else toast.error(e?.message ?? "Falha ao cadastrar.");
    }
  };

  // Arquivos pendentes (apenas em criação; em edição os anexos já existentes são gerenciados pelo AnexosBlock)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Parcelamento (somente na criação)
  const [parcelarOn, setParcelarOn] = useState<boolean>(false);
  const [numParcelas, setNumParcelas] = useState<number>(2);
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal");
  const [mesmoVencimento, setMesmoVenc] = useState<boolean>(false);
  const [mesmaCompetencia, setMesmaComp] = useState<boolean>(false);
  const [parcelas, setParcelas] = useState<ParcelaPlano[]>([]);

  // Gera/redistribui parcelas respeitando fixadoData e fixadoValor.
  const gerarParcelas = () => {
    const n = Math.max(1, Math.min(120, Math.floor(numParcelas)));
    if (!vencimento) { toast.error("Defina o vencimento da 1ª parcela."); return; }
    if (!(valorOriginal > 0)) { toast.error("Defina o valor total."); return; }
    const base: ParcelaPlano[] = Array.from({ length: n }, (_, i) => {
      const prev = parcelas[i];
      const venc = prev?.fixadoData
        ? prev.vencimento
        : (mesmoVencimento ? vencimento : proximoVencimento(vencimento, i, periodicidade));
      const comp = mesmaCompetencia ? vencimento.slice(0, 7) : venc.slice(0, 7);
      return {
        vencimento: venc,
        valor: prev?.fixadoValor ? prev.valor : 0,
        competencia: comp,
        fixadoData: prev?.fixadoData,
        fixadoValor: prev?.fixadoValor,
      };
    });
    // Distribui o restante (após fixos) igualmente; última parcela absorve o resíduo.
    const totalFixo = base.reduce((s, p) => s + (p.fixadoValor ? p.valor : 0), 0);
    const livres = base.filter((p) => !p.fixadoValor).length;
    const restante = round2(valorOriginal - totalFixo);
    if (livres > 0) {
      const cota = round2(restante / livres);
      let acumLivre = 0;
      let idxUltimoLivre = -1;
      base.forEach((p, i) => { if (!p.fixadoValor) idxUltimoLivre = i; });
      base.forEach((p, i) => {
        if (!p.fixadoValor) {
          if (i === idxUltimoLivre) {
            p.valor = round2(restante - acumLivre);
          } else {
            p.valor = cota;
            acumLivre = round2(acumLivre + cota);
          }
        }
      });
    }
    setParcelas(base);
  };

  const somaParcelas = useMemo(() => round2(parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0)), [parcelas]);
  const parcelasValidas = parcelarOn && parcelas.length >= 2 && Math.abs(somaParcelas - round2(valorOriginal)) < 0.01;


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

  const handleFiles = (fs: FileList | null) => {
    if (!fs) return;
    const aceitos: File[] = [];
    for (const file of Array.from(fs)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: máx. 10 MB`); continue; }
      aceitos.push(file);
    }
    if (aceitos.length) setPendingFiles((prev) => [...prev, ...aceitos]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    if (!descricao.trim()) return toast.error("Descrição obrigatória.");
    if (!(valorOriginal > 0)) return toast.error("Valor deve ser maior que zero.");
    if (!vencimento) return toast.error("Vencimento obrigatório.");
    if (!naturezaId) return toast.error("Selecione a natureza financeira.");
    if (!centroCustoId) return toast.error("Selecione o centro de custo.");
    if (parcelarOn) {
      if (parcelas.length < 2) return toast.error("Gere ao menos 2 parcelas ou desligue o parcelamento.");
      if (Math.abs(somaParcelas - round2(valorOriginal)) >= 0.01) {
        return toast.error(`Soma das parcelas (${somaParcelas.toFixed(2)}) difere do total (${valorOriginal.toFixed(2)}).`);
      }
      if (parcelas.some((p) => !p.vencimento || !(p.valor > 0))) {
        return toast.error("Cada parcela exige vencimento e valor > 0.");
      }
    }


    const nat = naturezas.find((n) => n.id === naturezaId);
    const cc = centros.find((c) => c.id === centroCustoId);
    const meio = meios.find((m) => m.id === meioPagamentoId);

    onSave({
      descricao, valorOriginal: Number(valorOriginal), vencimento,
      dataEmissao,
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
      origem, // ← origem explícita da operação
      _parcelas: parcelarOn ? parcelas : undefined,
    }, pendingFiles);

  };

  // Caminho contábil legível (Grupo › Subgrupo › Natureza › Conta)
  const grupoSel = grupos.find((g) => g.id === grupoId);
  const subgrupoSel = subgrupos.find((s) => s.id === subgrupoId);
  const caminhoContabil = [
    grupoSel && `${grupoSel.codigo} ${grupoSel.nome}`,
    subgrupoSel && `${subgrupoSel.codigo} ${subgrupoSel.nome}`,
    natSel && `${natSel.codigo} ${natSel.nome}`,
    natSel?.contaContabilFutura,
  ].filter(Boolean).join(" › ");

  return (
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {tipo === "AR" ? (
            <ArrowDownCircle className="h-5 w-5 text-success" />
          ) : (
            <ArrowUpCircle className="h-5 w-5 text-destructive" />
          )}
          <span>{initial ? "Editar título" : "Novo título"}</span>
          <Badge
            variant="outline"
            className={
              tipo === "AR"
                ? "border-success/40 bg-success/10 text-success font-semibold"
                : "border-destructive/40 bg-destructive/10 text-destructive font-semibold"
            }
          >
            {tipo === "AR" ? "Entrada · Contas a Receber" : "Saída · Contas a Pagar"}
          </Badge>
        </DialogTitle>
        <div className="mt-1 text-xs text-muted-foreground">
          {tipo === "AR"
            ? "Lançamento de receita prevista/realizada. Vincule à origem (contrato, obra ou financiamento) para refletir corretamente nos relatórios."
            : "Lançamento de despesa prevista/realizada. Vincule ao fornecedor e à obra/contrato quando aplicável."}
        </div>
      </DialogHeader>

      {/* Passo 1 — Contraparte */}
      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          1 · {tipo === "AP" ? "Fornecedor" : "Cliente"}
        </div>
        {tipo === "AP" ? (
          <Select value={fornecedor} onValueChange={setFornecedor}>
            <SelectTrigger><SelectValue placeholder="Selecione o fornecedor…" /></SelectTrigger>
            <SelectContent>{fornecedores.map((f) => <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
        )}
      </div>

      {/* Passo 2 — Valor, emissão, vencimento + descrição */}
      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          2 · Valor e datas
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Valor *</Label><Input type="number" step="0.01" value={valorOriginal} onChange={(e) => setValor(Number(e.target.value))} onWheel={(e) => e.currentTarget.blur()} /></div>
          <div><Label>Data de emissão</Label><Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} /></div>
          <div><Label>Vencimento *</Label><Input type="date" value={vencimento} onChange={(e) => setVenc(e.target.value)} /></div>
          <div className="col-span-3"><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        </div>
      </div>

      {/* Passo 3 — Natureza (grupo/subgrupo derivam automaticamente) */}
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary/80">
          3 · Natureza financeira
        </div>
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
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Grupo (auto)</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
              {grupoSel ? `${grupoSel.codigo} · ${grupoSel.nome}` : "—"}
            </div>
          </div>
          <div>
            <Label className="text-xs">Subgrupo (auto)</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
              {subgrupoSel ? `${subgrupoSel.codigo} · ${subgrupoSel.nome}` : "—"}
            </div>
          </div>
        </div>
        {caminhoContabil && (
          <div className="mt-2 rounded border border-primary/15 bg-background/60 px-2.5 py-1.5">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">Plano de contas</div>
            <div className="mt-0.5 font-mono text-[11px] leading-snug text-foreground/90">{caminhoContabil}</div>
          </div>
        )}
      </div>

      {/* Passo 4 — Obra / Projeto */}
      <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground/80">
          <Link2 className="h-3.5 w-3.5" /> 4 · Obra / Projeto vinculado
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Obra</Label>
            <Select value={obraId || "__none__"} onValueChange={(v) => aoEscolherObra(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="— sem obra —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem obra —</SelectItem>
                {obrasAll.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="font-mono text-xs text-muted-foreground">{o.id}</span> · {o.cliente} <span className="text-muted-foreground">({o.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contrato</Label>
            <Select value={contratoId || "__none__"} onValueChange={(v) => aoEscolherContrato(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="— sem contrato —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem contrato —</SelectItem>
                {contratosAll.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-mono text-xs text-muted-foreground">{c.id}</span> · {c.cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de origem *</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {origensDisp.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
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
      </div>

      {/* Passo 5 — Centro de custo (puxado da natureza) + meio/conta */}
      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          5 · Centro de custo e pagamento
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Centro de custo * <span className="text-[10px] text-muted-foreground">(sugerido pela natureza)</span></Label>
            <Select value={centroCustoId} onValueChange={setCentroCustoId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{centros.filter((c) => c.ativo).map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
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
          <div className="col-span-2"><Label>Observação</Label><Textarea value={observacao} onChange={(e) => setObs(e.target.value)} rows={2} /></div>
        </div>
      </div>

      {/* Parcelamento — somente na criação */}
      {!initial && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              6 · Parcelamento {parcelarOn && parcelas.length > 0 && (
                <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${parcelasValidas ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}`}>
                  Soma {fmtBRLPrecise(somaParcelas)} de {fmtBRLPrecise(valorOriginal)}
                </span>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={parcelarOn} onChange={(e) => { setParcelarOn(e.target.checked); if (!e.target.checked) setParcelas([]); }} />
              Dividir em parcelas
            </label>
          </div>

          {parcelarOn && (
            <>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Qtd. parcelas</Label>
                  <Input type="number" min={2} max={120} value={numParcelas} onChange={(e) => setNumParcelas(Number(e.target.value) || 2)} />
                </div>
                <div>
                  <Label className="text-xs">Periodicidade</Label>
                  <Select value={periodicidade} onValueChange={(v) => setPeriodicidade(v as Periodicidade)} disabled={mesmoVencimento}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-end gap-2">
                  <Button type="button" variant="outline" onClick={gerarParcelas}>Gerar parcelas</Button>
                  {parcelas.length > 0 && (
                    <Button type="button" variant="ghost" onClick={() => setParcelas([])}>Limpar</Button>
                  )}
                </div>
                <label className="col-span-2 flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={mesmoVencimento} onChange={(e) => setMesmoVenc(e.target.checked)} />
                  Mesma data de vencimento em todas as parcelas
                </label>
                <label className="col-span-2 flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={mesmaCompetencia} onChange={(e) => setMesmaComp(e.target.checked)} />
                  Mesmo mês de competência em todas
                </label>
              </div>

              {parcelas.length > 0 && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded border bg-background/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1 text-left">#</th>
                        <th className="px-2 py-1 text-left">Vencimento</th>
                        <th className="px-2 py-1 text-center" title="Fixar data (não recalcular)">🔒D</th>
                        <th className="px-2 py-1 text-right">Valor</th>
                        <th className="px-2 py-1 text-center" title="Fixar valor (não recalcular)">🔒V</th>
                        <th className="px-2 py-1 text-left">Competência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelas.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1 font-mono">{i + 1}/{parcelas.length}</td>
                          <td className="px-2 py-1">
                            <Input type="date" value={p.vencimento} className="h-7"
                              onChange={(e) => setParcelas((prev) => prev.map((x, j) => j === i ? { ...x, vencimento: e.target.value, competencia: e.target.value.slice(0, 7) } : x))} />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <input type="checkbox" checked={!!p.fixadoData}
                              onChange={(e) => setParcelas((prev) => prev.map((x, j) => j === i ? { ...x, fixadoData: e.target.checked } : x))} />
                          </td>
                          <td className="px-2 py-1">
                            <Input type="number" step="0.01" value={p.valor} className="h-7 text-right"
                              onChange={(e) => setParcelas((prev) => prev.map((x, j) => j === i ? { ...x, valor: Number(e.target.value) } : x))} />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <input type="checkbox" checked={!!p.fixadoValor}
                              onChange={(e) => setParcelas((prev) => prev.map((x, j) => j === i ? { ...x, fixadoValor: e.target.checked } : x))} />
                          </td>
                          <td className="px-2 py-1">
                            <Input type="month" value={p.competencia} className="h-7"
                              onChange={(e) => setParcelas((prev) => prev.map((x, j) => j === i ? { ...x, competencia: e.target.value } : x))} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-2 text-[10px] text-muted-foreground">
                Marque 🔒 para preservar a data ou valor de uma parcela ao clicar em <strong>Gerar parcelas</strong> novamente. A última parcela livre absorve a diferença de centavos.
              </div>
            </>
          )}
        </div>
      )}

      {/* Anexos — em edição usamos AnexosBlock (Storage). Na criação, o anexo + rateio são feitos ao reabrir o título após salvar. */}
      {initial ? (
        <AnexosBlock titulo={initial} editavel={!initial.bloqueadoFechamento} />
      ) : (
        <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          <Paperclip className="mr-1 inline h-3.5 w-3.5" />
          Após salvar, o título reabrirá automaticamente para anexar comprovantes e fazer rateio (se houver).
        </div>
      )}

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
  const uploadAnexoFn = useServerFn(uploadAnexo);
  const signedUrlAnexoFn = useServerFn(signedUrlAnexo);
  const deleteAnexoFn = useServerFn(deleteAnexo);

  const handleFiles = async (fs: FileList | null) => {
    if (!fs) return;
    for (const file of Array.from(fs)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: máx. 10 MB`); continue; }
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("tituloId", titulo.id);
        const { anexo } = await uploadAnexoFn({ data: fd });
        adicionarAnexo(titulo.id, {
          id: anexo.id,
          nome: anexo.nome,
          mime: anexo.mime,
          tamanho: anexo.tamanho,
          storagePath: anexo.storage_path,
          enviadoEm: anexo.created_at,
        });
      } catch (e: any) { toast.error(`${file.name}: ${e?.message ?? "falha no upload"}`); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const baixar = async (a: Anexo) => {
    if (a.dataUrl) { window.open(a.dataUrl, "_blank"); return; }
    if (!a.storagePath) { toast.error("Anexo sem caminho de Storage."); return; }
    try {
      const { url } = await signedUrlAnexoFn({ data: { anexoId: a.id } });
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e?.message ?? "Falha ao gerar URL."); }
  };

  const excluir = async (a: Anexo) => {
    try {
      if (a.storagePath) await deleteAnexoFn({ data: { anexoId: a.id } });
      removerAnexo(titulo.id, a.id);
    } catch (e: any) { toast.error(e?.message ?? "Falha ao excluir."); }
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
              <Button size="icon" variant="ghost" className="h-6 w-6" title="Baixar" onClick={() => baixar(a)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              {editavel && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => excluir(a)}>
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
    <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
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
    <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
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
