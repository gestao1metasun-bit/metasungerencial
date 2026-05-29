/**
 * D15.3.b — AdiantamentosTab 100% Supabase.
 *
 * Consome exclusivamente:
 *   - adiantamentos-repo (view v_adiantamentos_enriquecido + 3 RPCs)
 *   - cadastros-repo (clientes, fornecedores, contas oficiais)
 *
 * NÃO importa fin-adiantamentos-store, useRepoFinanceiro nem qualquer
 * store LS operacional. Preferências de UI ficam em `ui.fin.adiantamentos.v1`
 * (permitido pelo ls-guard).
 *
 * Falhas viram toast + errorLogRepo.log({ modulo:'financeiro', ... }).
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Wallet, FileSearch, Receipt, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/app/StatCard";
import { toast } from "sonner";
import {
  useAdiantamentosSupabase,
  useRegistrarAdiantamento,
  useAbaterAdiantamento,
  useEstornarAdiantamento,
  useParcelasCompativeis,
  type AdiantamentoRow,
  type AdiantamentoTipoUI,
} from "@/lib/repositories/adiantamentos-repo";
import {
  useClientesOficiais,
  useFornecedoresOficiais,
  useContasFinanceirasOficiais,
} from "@/lib/repositories/cadastros-repo";
import { errorLogRepo } from "@/lib/repositories/error-log-repo";
import { promptDialog } from "@/components/app/confirm-dialog";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

const UI_PREF_KEY = "ui.fin.adiantamentos.v1";

type UiPrefs = { tipo: AdiantamentoTipoUI; filtro: string };

function loadPrefs(): UiPrefs {
  if (typeof window === "undefined") return { tipo: "cliente", filtro: "" };
  try {
    const raw = window.localStorage.getItem(UI_PREF_KEY);
    return raw ? { tipo: "cliente", filtro: "", ...JSON.parse(raw) } : { tipo: "cliente", filtro: "" };
  } catch { return { tipo: "cliente", filtro: "" }; }
}
function savePrefs(p: UiPrefs) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(UI_PREF_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

const fmtBRL = (n: number) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const fmtData = (d: string | null) => {
  if (!d) return "—";
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
};

const STATUS_TONE: Record<string, string> = {
  ABERTO: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  PARCIAL: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  QUITADO: "bg-muted text-muted-foreground border-border",
  CANCELADO: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  ESTORNADO: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};

function logFin(acao: string, mensagem: string, payload?: Record<string, unknown>) {
  void errorLogRepo.log({
    modulo: "financeiro", tela: "adiantamentos", acao, mensagem,
    payload, severidade: "error",
  }).catch(() => {});
}

export function AdiantamentosTabSupabase() {
  const initial = loadPrefs();
  const [tipo, setTipo] = useState<AdiantamentoTipoUI>(initial.tipo);
  const [filtro, setFiltro] = useState(initial.filtro);
  const [novoOpen, setNovoOpen] = useState(false);
  const [abaterAlvo, setAbaterAlvo] = useState<AdiantamentoRow | null>(null);

  useEffect(() => { savePrefs({ tipo, filtro }); }, [tipo, filtro]);

  const q = useAdiantamentosSupabase(tipo);
  const estornar = useEstornarAdiantamento();

  const filtrados = useMemo(() => {
    const b = filtro.trim().toLowerCase();
    const lista = q.data ?? [];
    return lista.filter((a) => {
      if (!b) return true;
      const contra = (tipo === "cliente" ? a.cliente_nome : a.fornecedor_nome) ?? "";
      return contra.toLowerCase().includes(b)
        || (a.codigo ?? "").toLowerCase().includes(b)
        || a.id.toLowerCase().includes(b);
    });
  }, [q.data, filtro, tipo]);

  const totalOriginal = filtrados.reduce((s, a) => s + Number(a.valor), 0);
  const totalAtivo = filtrados
    .filter((a) => a.status === "ABERTO" || a.status === "PARCIAL")
    .reduce((s, a) => s + Number(a.saldo), 0);
  const totalConsumido = filtrados.filter((a) => a.status === "QUITADO").length;

  async function onEstornar(a: AdiantamentoRow) {
    const m = await promptDialog({
      title: "Estornar adiantamento",
      description: `Adiantamento ${a.codigo ?? a.id.slice(0, 8)} — ${a.cliente_nome ?? a.fornecedor_nome ?? "—"}. Informe o motivo (mín. 5 caracteres).`,
      label: "Motivo do estorno",
      multiline: true,
      minLength: 5,
      confirmText: "Estornar",
    });
    if (!m || m.length < 5) return;
    try {
      await estornar.mutateAsync({ adiantamento_id: a.id, motivo: m });
      toast.success("Adiantamento estornado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Falha ao estornar: ${msg}`);
      logFin("estornar", msg, { adiantamento_id: a.id });
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={tipo} onValueChange={(v) => setTipo(v as AdiantamentoTipoUI)}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="cliente">Adiantamentos de Cliente</TabsTrigger>
            <TabsTrigger value="fornecedor">Adiantamentos a Fornecedor</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar contraparte ou código…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-9 w-72"
            />
            <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo adiantamento</Button>
              </DialogTrigger>
              <NovoAdiantamentoDialog tipo={tipo} onClose={() => setNovoOpen(false)} />
            </Dialog>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total registrado" value={fmtBRL(totalOriginal)} />
          <StatCard label="Saldo disponível" value={fmtBRL(totalAtivo)} tone="primary" hint="Pode abater parcelas" />
          <StatCard label="Quitados" value={String(totalConsumido)} hint="Já usados em baixas" />
          <StatCard label="Registros" value={String(filtrados.length)} />
        </div>

        <TabsContent value={tipo} className="mt-4">
          <Card className="p-4">
            {q.isError ? (
              <div className="py-8 text-center text-sm text-destructive">
                Falha ao carregar adiantamentos: {(q.error as Error)?.message ?? "erro"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Abat.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.isLoading && (
                    <TableRow><TableCell colSpan={9} className="py-8 text-center text-xs text-muted-foreground">Carregando…</TableCell></TableRow>
                  )}
                  {!q.isLoading && filtrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        <FileSearch className="mx-auto mb-2 h-6 w-6 opacity-50" />
                        Nenhum adiantamento de {tipo} encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtrados.map((a) => {
                    const ativo = a.status === "ABERTO" || a.status === "PARCIAL";
                    const contraNome = tipo === "cliente" ? a.cliente_nome : a.fornecedor_nome;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground">{fmtData(a.data_movimento)}</TableCell>
                        <TableCell className="font-mono text-xs text-primary">{a.codigo ?? a.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{contraNome ?? "—"}</div>
                          {a.contrato_id && <div className="text-[10px] text-muted-foreground">contrato {a.contrato_id.slice(0, 8)}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{a.conta_nome ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{fmtBRL(Number(a.valor))}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={Number(a.saldo) > 0 ? "text-primary" : "text-muted-foreground"}>
                            {fmtBRL(Number(a.saldo))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${STATUS_TONE[a.status] ?? ""} border text-[10px] font-semibold`}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.abatimentos_count === 0
                            ? <span className="text-muted-foreground">—</span>
                            : <span>{a.abatimentos_count}×</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {ativo && Number(a.saldo) > 0 && (
                              <Button size="sm" variant="outline" onClick={() => setAbaterAlvo(a)}>
                                <Receipt className="mr-1 h-3.5 w-3.5" />Abater
                              </Button>
                            )}
                            {ativo && a.abatimentos_count === 0 && (
                              <Button size="sm" variant="ghost" onClick={() => onEstornar(a)}>
                                <Undo2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {abaterAlvo && (
        <AbaterDialog adiantamento={abaterAlvo} onClose={() => setAbaterAlvo(null)} />
      )}
    </div>
  );
}

// ---------- Novo ----------
function NovoAdiantamentoDialog({ tipo, onClose }: { tipo: AdiantamentoTipoUI; onClose: () => void }) {
  const clientes = useClientesOficiais();
  const fornecedores = useFornecedoresOficiais();
  const contas = useContasFinanceirasOficiais();
  const registrar = useRegistrarAdiantamento();

  const contasAtivas = useMemo(
    () => (contas.data ?? []).filter((c) => (c as { ativo?: boolean }).ativo !== false),
    [contas.data],
  );

  const [contraparteId, setContraparteId] = useState<string>("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState<string>("");
  const [contratoId, setContratoId] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!contaId && contasAtivas[0]) setContaId(contasAtivas[0].id);
  }, [contasAtivas, contaId]);

  const opcoes = tipo === "cliente"
    ? (clientes.data ?? []).map((c) => ({ id: c.id, nome: c.nome }))
    : (fornecedores.data ?? []).map((f) => ({ id: f.id, nome: f.nome }));

  async function salvar() {
    const v = Number(valor);
    if (!contraparteId || !v || v <= 0 || !contaId) return;
    try {
      await registrar.mutateAsync({
        tipo,
        valor: v,
        data,
        conta_id: contaId,
        cliente_id: tipo === "cliente" ? contraparteId : null,
        fornecedor_id: tipo === "fornecedor" ? contraparteId : null,
        contrato_id: contratoId || null,
        observacao: obs || null,
      });
      toast.success("Adiantamento registrado.");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Falha ao registrar: ${msg}`);
      logFin("registrar", msg, { tipo, contraparteId, valor: v });
    }
  }

  return (
    <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Novo adiantamento {tipo === "cliente" ? "de cliente" : "a fornecedor"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <div>
          <Label className="text-xs">{tipo === "cliente" ? "Cliente" : "Fornecedor"}</Label>
          <Select value={contraparteId} onValueChange={setContraparteId}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
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
                {contasAtivas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Contrato (opcional, UUID)</Label>
            <Input value={contratoId} onChange={(e) => setContratoId(e.target.value)} placeholder="…" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Observação</Label>
          <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={salvar}
          disabled={!contraparteId || !valor || Number(valor) <= 0 || !contaId || registrar.isPending}
        >
          {registrar.isPending ? "Registrando…" : "Registrar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------- Abater ----------
function AbaterDialog({ adiantamento, onClose }: { adiantamento: AdiantamentoRow; onClose: () => void }) {
  const parcelasQ = useParcelasCompativeis(adiantamento);
  const abater = useAbaterAdiantamento();

  const candidatos = parcelasQ.data ?? [];
  const [parcelaId, setParcelaId] = useState<string>("");
  const parcela = candidatos.find((p) => p.id === parcelaId);
  const maxValor = Math.min(Number(adiantamento.saldo), parcela?.saldo ?? 0);
  const [valor, setValor] = useState<string>("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!parcelaId && candidatos[0]) setParcelaId(candidatos[0].id);
  }, [candidatos, parcelaId]);
  useEffect(() => {
    if (parcela) {
      setValor(Math.min(Number(adiantamento.saldo), parcela.saldo).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelaId]);

  async function confirmar() {
    const v = Number(valor);
    if (!parcelaId || !v || v <= 0) return;
    try {
      await abater.mutateAsync({
        adiantamento_id: adiantamento.id,
        parcela_id: parcelaId,
        valor: v,
        observacao: obs || null,
      });
      toast.success("Abatimento realizado.");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Falha ao abater: ${msg}`);
      logFin("abater", msg, { adiantamento_id: adiantamento.id, parcela_id: parcelaId, valor: v });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Abater adiantamento {adiantamento.codigo ?? adiantamento.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            <div><span className="text-muted-foreground">Contraparte:</span> {adiantamento.cliente_nome ?? adiantamento.fornecedor_nome ?? "—"}</div>
            <div><span className="text-muted-foreground">Saldo disponível:</span> <span className="font-semibold">{fmtBRL(Number(adiantamento.saldo))}</span></div>
          </div>

          {parcelasQ.isLoading ? (
            <div className="text-xs text-muted-foreground">Carregando parcelas…</div>
          ) : candidatos.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Nenhuma parcela em aberto compatível foi encontrada.
              Cadastre/abra o título antes de abater.
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs">Parcela a abater</Label>
                <Select value={parcelaId} onValueChange={setParcelaId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {candidatos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.titulo_codigo ?? p.titulo_id.slice(0, 8)} · parc {p.numero ?? "?"} · saldo {fmtBRL(p.saldo)} · venc {fmtData(p.vencimento)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor a abater (máx. {fmtBRL(maxValor)})</Label>
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
            disabled={
              candidatos.length === 0 || !parcela || Number(valor) <= 0
              || Number(valor) > maxValor + 0.01 || abater.isPending
            }
          >
            {abater.isPending ? "Processando…" : "Confirmar abatimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
