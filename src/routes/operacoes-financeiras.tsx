/**
 * D17.UI Fase 5b — Operações Financeiras (UI funcional Enterprise)
 *
 * Wireup completo:
 *  • EnterpriseRecordToolbar oficial com busca canônica e filtros.
 *  • Grid por aba (tipo) com RowActions (visualizar/aprovar/liberar/cancelar/timeline).
 *  • Drawer com parcelas + timeline (operacoes_financeiras_eventos).
 *  • Modal "Novo" com contraparte estruturada, datas e grade de parcelas editável.
 *
 * Regra de pedra (Onda F): NUNCA toca contratos/PV/propostas/eng/comissão.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Landmark, Wallet, Undo2, Star, CalendarRange, Trash2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EnterpriseRecordToolbar, ModuloHistoricoDrawer } from "@/components/app/enterprise";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { OperacoesFinanceirasGrid } from "@/components/op-financeiras/OperacoesFinanceirasGrid";
import {
  type OpFinTipo, useCriarOperacao, useGerarParcelas, useUpdateParcela,
} from "@/lib/repositories/op-financeiras-repo";
import {
  useNaturezasFin, useCentrosResultado, useContasFinanceirasOficiais,
  useFornecedoresOficiais, useClientesOficiais,
} from "@/lib/repositories/cadastros-repo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/operacoes-financeiras")({
  head: () => ({ meta: [{ title: "Operações Financeiras — Meta Sun" }] }),
  component: OperacoesFinanceirasPage,
});

type Tab = "emprestimos" | "aportes" | "devolucoes" | "especiais" | "parcelamentos";

const TAB_META: Record<Tab, {
  label: string; icon: typeof Landmark; descricao: string;
  tipos?: OpFinTipo[]; apenasParceladas?: boolean; tipoNovoDefault: OpFinTipo;
  natureza: "ENTRADA" | "SAIDA";
}> = {
  emprestimos: {
    label: "Empréstimos", icon: Landmark,
    descricao: "Capital de giro, BNDES, FCO, linhas bancárias e empréstimos entre partes.",
    tipos: ["EMPRESTIMO_COLABORADOR","EMPRESTIMO_CLIENTE","EMPRESTIMO_FORNECEDOR","EMPRESTIMO_SOCIO_EMPRESA","EMPRESTIMO_EMPRESA_TERCEIRO","CAPITAL_DE_GIRO"],
    tipoNovoDefault: "CAPITAL_DE_GIRO", natureza: "ENTRADA",
  },
  aportes: {
    label: "Aportes", icon: Wallet,
    descricao: "Aportes de sócios e capital próprio.",
    tipos: ["APORTE_CAPITAL"],
    tipoNovoDefault: "APORTE_CAPITAL", natureza: "ENTRADA",
  },
  devolucoes: {
    label: "Devoluções", icon: Undo2,
    descricao: "Devoluções a sócios e amortizações antecipadas (empréstimo sócio→empresa, natureza saída).",
    tipos: ["EMPRESTIMO_SOCIO_EMPRESA"],
    tipoNovoDefault: "EMPRESTIMO_SOCIO_EMPRESA", natureza: "SAIDA",
  },
  especiais: {
    label: "Operações Especiais", icon: Star,
    descricao: "Aplicações financeiras, resgates e operações pontuais.",
    tipos: ["APLICACAO_FINANCEIRA"],
    tipoNovoDefault: "APLICACAO_FINANCEIRA", natureza: "SAIDA",
  },
  parcelamentos: {
    label: "Parcelamentos", icon: CalendarRange,
    descricao: "Operações parceladas (REFIS, governo, fornecedores) — qtd_parcelas > 1.",
    apenasParceladas: true,
    tipoNovoDefault: "CAPITAL_DE_GIRO", natureza: "SAIDA",
  },
};

function OperacoesFinanceirasPage() {
  const [tab, setTab] = useState<Tab>("emprestimos");
  const [search, setSearch] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const meta = TAB_META[tab];

  return (
    <>
      <PageHeader
        title="Operações Financeiras"
        subtitle="Empréstimos, aportes, devoluções, aplicações e parcelamentos — segregados do fluxo comercial."
      />
      <div className="mb-3">
        <EnterpriseRecordToolbar
          entityType="operacoes_financeiras"
          availableActions={["novo", "atualizar", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
          selectedIds={[]}
          searchPlaceholder="Buscar código, contraparte, banco, finalidade…"
          search={search}
          onSearchChange={setSearch}
          onAction={(a) => {
            if (a === "novo") setNovoOpen(true);
            else if (a === "atualizar") toast.success("Lista recarregada.");
            else if (a === "historico") setHistOpen(true);
            else if (a === "imprimir") window.print();
            else if (a === "colunas") toast.info("Gestor de colunas universal chega em D17.UI.4c.");
            else if (a === "filtroAvancado") toast.info("Filtros avançados chegam em D17.UI.4c (data, status, instituição).");
            else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.4c.");
          }}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSearch(""); }}>
        <TabsList>
          {(Object.keys(TAB_META) as Tab[]).map((k) => {
            const m = TAB_META[k];
            const I = m.icon;
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5">
                <I className="h-3.5 w-3.5" /> {m.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(TAB_META) as Tab[]).map((k) => {
          const m = TAB_META[k];
          return (
            <TabsContent key={k} value={k} className="mt-4 space-y-2">
              <p className="text-[11.5px] text-muted-foreground">{m.descricao}</p>
              <OperacoesFinanceirasGrid
                tipos={m.tipos}
                apenasParceladas={m.apenasParceladas}
                search={search}
                emptyHint={`Nenhuma operação nesta visão. Use "Novo" para registrar a primeira ${m.label.toLowerCase()}.`}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      <NovaOperacaoDialog
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        tipoDefault={meta.tipoNovoDefault}
        naturezaDefault={meta.natureza}
      />
      <ModuloHistoricoDrawer
        open={histOpen}
        onOpenChange={setHistOpen}
        titulo="Operações Financeiras"
        modulos={["financeiro"]}
      />
    </>
  );
}

/* ───────────────── Modal Nova Operação ───────────────── */

const TIPOS_OPTS: { value: OpFinTipo; label: string }[] = [
  { value: "CAPITAL_DE_GIRO",            label: "Capital de giro" },
  { value: "EMPRESTIMO_COLABORADOR",     label: "Empréstimo a colaborador" },
  { value: "EMPRESTIMO_CLIENTE",         label: "Empréstimo a cliente" },
  { value: "EMPRESTIMO_FORNECEDOR",      label: "Empréstimo a fornecedor" },
  { value: "EMPRESTIMO_SOCIO_EMPRESA",   label: "Empréstimo sócio↔empresa" },
  { value: "EMPRESTIMO_EMPRESA_TERCEIRO",label: "Empréstimo empresa→terceiro" },
  { value: "APORTE_CAPITAL",             label: "Aporte de capital" },
  { value: "APLICACAO_FINANCEIRA",       label: "Aplicação financeira" },
];

type ContraparteTipo = "CLIENTE" | "FORNECEDOR" | "COLABORADOR" | "SOCIO" | "TERCEIRO";

const CONTRA_OPTS: { value: ContraparteTipo; label: string }[] = [
  { value: "CLIENTE",     label: "Cliente" },
  { value: "FORNECEDOR",  label: "Fornecedor" },
  { value: "COLABORADOR", label: "Colaborador" },
  { value: "SOCIO",       label: "Sócio" },
  { value: "TERCEIRO",    label: "Terceiro" },
];

/** Tipo da operação → tipo de contraparte sugerido. */
function defaultContraparteParaTipo(tipo: OpFinTipo): ContraparteTipo {
  switch (tipo) {
    case "EMPRESTIMO_CLIENTE":          return "CLIENTE";
    case "EMPRESTIMO_FORNECEDOR":       return "FORNECEDOR";
    case "EMPRESTIMO_COLABORADOR":      return "COLABORADOR";
    case "EMPRESTIMO_SOCIO_EMPRESA":
    case "APORTE_CAPITAL":              return "SOCIO";
    case "EMPRESTIMO_EMPRESA_TERCEIRO": return "TERCEIRO";
    default:                            return "TERCEIRO";
  }
}

interface ParcelaLocal { numero: number; valor: number; vencimento: string; }

/** Gera grade uniforme: valor/qtd dividido em N, sobra na última; vencimentos primeiroVenc + (n-1)*intervalo. */
function gerarGradeLocal(valorTotal: number, qtd: number, primeiroVenc: string, intervalo: number): ParcelaLocal[] {
  if (!valorTotal || !qtd || qtd < 1 || !primeiroVenc) return [];
  const base = new Date(primeiroVenc + "T00:00:00");
  const valorBase = Math.floor((valorTotal / qtd) * 100) / 100;
  const grade: ParcelaLocal[] = [];
  let acumulado = 0;
  for (let i = 0; i < qtd; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i * intervalo);
    const isLast = i === qtd - 1;
    const valor = isLast ? Math.round((valorTotal - acumulado) * 100) / 100 : valorBase;
    acumulado += valor;
    grade.push({ numero: i + 1, valor, vencimento: d.toISOString().slice(0, 10) });
  }
  return grade;
}

function NovaOperacaoDialog({
  open, onClose, tipoDefault, naturezaDefault,
}: { open: boolean; onClose: () => void; tipoDefault: OpFinTipo; naturezaDefault: "ENTRADA" | "SAIDA"; }) {
  const criar = useCriarOperacao();
  const gerarParcelas = useGerarParcelas();
  const updateParcela = useUpdateParcela();
  const { data: naturezas = [] } = useNaturezasFin();
  const { data: centros = [] } = useCentrosResultado();
  const { data: contas = [] } = useContasFinanceirasOficiais();
  const { data: fornecedores = [] } = useFornecedoresOficiais();
  const { data: clientes = [] } = useClientesOficiais();

  const [tipo, setTipo] = useState<OpFinTipo>(tipoDefault);
  const [natureza, setNatureza] = useState<"ENTRADA" | "SAIDA">(naturezaDefault);
  const [valor, setValor] = useState("");
  const [dataOp, setDataOp] = useState(new Date().toISOString().slice(0, 10));
  const [primeiroVenc, setPrimeiroVenc] = useState(new Date().toISOString().slice(0, 10));
  const [intervalo, setIntervalo] = useState("30");
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [finalidade, setFinalidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [jurosPct, setJurosPct] = useState("");
  const [naturezaId, setNaturezaId] = useState<string>("");
  const [centroId, setCentroId] = useState<string>("");
  const [contaId, setContaId] = useState<string>("");

  // Contraparte estruturada
  const [contraTipo, setContraTipo] = useState<ContraparteTipo>(defaultContraparteParaTipo(tipoDefault));
  const [contraId, setContraId] = useState<string>("");
  const [contraNome, setContraNome] = useState<string>("");
  const [contraDoc, setContraDoc] = useState<string>("");

  // Grade local de parcelas (editável)
  const [parcelas, setParcelas] = useState<ParcelaLocal[]>([]);

  // Recalcula grade ao mudar valor/qtd/venc/intervalo
  useEffect(() => {
    const v = parseFloat(valor.replace(",", "."));
    const qtd = parseInt(qtdParcelas, 10);
    const interv = parseInt(intervalo, 10) || 30;
    if (!v || v <= 0 || !qtd || !primeiroVenc) { setParcelas([]); return; }
    setParcelas(gerarGradeLocal(v, qtd, primeiroVenc, interv));
  }, [valor, qtdParcelas, primeiroVenc, intervalo]);

  // Quando o tipo muda, ajusta sugestão de contraparte
  useEffect(() => {
    setContraTipo(defaultContraparteParaTipo(tipo));
    setContraId(""); setContraNome(""); setContraDoc("");
  }, [tipo]);

  const somaParcelas = useMemo(
    () => Math.round(parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0) * 100) / 100,
    [parcelas],
  );
  const valorTotalNum = parseFloat(valor.replace(",", ".")) || 0;
  const somaOk = parcelas.length > 0 && Math.abs(somaParcelas - valorTotalNum) < 0.005;

  const reset = () => {
    setTipo(tipoDefault); setNatureza(naturezaDefault);
    setValor(""); setQtdParcelas("1"); setFinalidade(""); setObservacoes("");
    setInstituicao(""); setJurosPct("");
    setNaturezaId(""); setCentroId(""); setContaId("");
    setContraTipo(defaultContraparteParaTipo(tipoDefault));
    setContraId(""); setContraNome(""); setContraDoc("");
    setPrimeiroVenc(new Date().toISOString().slice(0, 10));
    setIntervalo("30"); setParcelas([]);
  };

  const updateParcelaLocal = (idx: number, patch: Partial<ParcelaLocal>) => {
    setParcelas((arr) => arr.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  const regenerarGrade = () => {
    const v = parseFloat(valor.replace(",", "."));
    const qtd = parseInt(qtdParcelas, 10);
    const interv = parseInt(intervalo, 10) || 30;
    setParcelas(gerarGradeLocal(v, qtd, primeiroVenc, interv));
  };

  /** Monta os campos de contraparte conforme tipo selecionado. */
  function montarContraparte(): Partial<Parameters<typeof criar.mutate>[0]> {
    switch (contraTipo) {
      case "CLIENTE":
        return { cliente_id: contraId || undefined };
      case "FORNECEDOR":
        return { fornecedor_id: contraId || undefined };
      case "COLABORADOR":
        return { colaborador_nome: contraNome || undefined };
      case "SOCIO":
        return { socio_nome: contraNome || undefined };
      case "TERCEIRO":
        return {
          terceiro_nome: contraNome || undefined,
          terceiro_documento: contraDoc || undefined,
        };
    }
  }

  function validarContraparte(): string | null {
    if (contraTipo === "CLIENTE" && !contraId) return "Selecione o cliente.";
    if (contraTipo === "FORNECEDOR" && !contraId) return "Selecione o fornecedor.";
    if (["COLABORADOR","SOCIO","TERCEIRO"].includes(contraTipo) && !contraNome.trim())
      return `Informe o nome do ${contraTipo.toLowerCase()}.`;
    return null;
  }

  const submit = async () => {
    const v = parseFloat(valor.replace(",", "."));
    const qtd = parseInt(qtdParcelas, 10);
    const interv = parseInt(intervalo, 10) || 30;
    if (!v || v <= 0) { toast.error("Informe um valor válido."); return; }
    if (!qtd || qtd < 1) { toast.error("Qtd de parcelas inválida."); return; }
    if (!finalidade.trim()) { toast.error("Informe a finalidade."); return; }
    if (!naturezaId) { toast.error("Selecione a natureza financeira."); return; }
    if (!centroId) { toast.error("Selecione o centro de resultado."); return; }
    if (!contaId) { toast.error("Selecione a conta financeira."); return; }
    const erroContra = validarContraparte();
    if (erroContra) { toast.error(erroContra); return; }
    if (!somaOk) {
      toast.error(`Soma das parcelas (${somaParcelas.toFixed(2)}) difere do valor total (${v.toFixed(2)}).`);
      return;
    }

    const contraFields = montarContraparte();

    try {
      // 1) cria a operação (RASCUNHO)
      const created = await criar.mutateAsync({
        tipo, natureza_caixa: natureza,
        natureza_id: naturezaId, centro_resultado_id: centroId, conta_id: contaId,
        valor_total: v, data_operacao: dataOp,
        qtd_parcelas: qtd,
        finalidade,
        observacoes: observacoes || undefined,
        instituicao: instituicao || undefined,
        juros_pct: jurosPct ? parseFloat(jurosPct.replace(",", ".")) : undefined,
        ...contraFields,
      });

      // 2) gera parcelas uniformes a partir do primeiro vencimento
      await gerarParcelas.mutateAsync({
        id: created.id,
        vencimentoPrimeiro: primeiroVenc,
        intervaloDias: interv,
      });

      // 3) aplica edições manuais por parcela (se diferem da grade uniforme)
      const { data: geradas, error: errParc } = await supabase
        .from("operacoes_financeiras_parcelas")
        .select("id,numero,valor,vencimento")
        .eq("operacao_id", created.id)
        .order("numero");
      if (errParc) throw errParc;

      for (const local of parcelas) {
        const persistida = geradas?.find((p) => p.numero === local.numero);
        if (!persistida) continue;
        const valorMudou = Math.abs(Number(persistida.valor) - local.valor) > 0.005;
        const vencMudou = persistida.vencimento !== local.vencimento;
        if (valorMudou || vencMudou) {
          await updateParcela.mutateAsync({
            id: persistida.id,
            valor: valorMudou ? local.valor : undefined,
            vencimento: vencMudou ? local.vencimento : undefined,
          });
        }
      }

      toast.success(`Operação ${created.codigo} criada em RASCUNHO com ${qtd} parcela(s).`);
      reset(); onClose();
    } catch (e) {
      toast.error(`Falha ao criar: ${(e as Error).message}`);
    }
  };

  const isPending = criar.isPending || gerarParcelas.isPending || updateParcela.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Nova operação financeira</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[12.5px]">
          <div className="col-span-2">
            <Label className="text-[11px]">Tipo *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as OpFinTipo)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px]">Natureza de caixa *</Label>
            <Select value={natureza} onValueChange={(v) => setNatureza(v as "ENTRADA" | "SAIDA")}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRADA">Entrada (a receber)</SelectItem>
                <SelectItem value="SAIDA">Saída (a pagar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Data da operação *</Label>
            <Input type="date" className="h-8" value={dataOp} onChange={(e) => setDataOp(e.target.value)} />
          </div>

          {/* Contraparte estruturada */}
          <div className="col-span-2 border-t border-border/60 pt-3">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Contraparte</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Tipo *</Label>
                <Select value={contraTipo} onValueChange={(v) => { setContraTipo(v as ContraparteTipo); setContraId(""); setContraNome(""); setContraDoc(""); }}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRA_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {contraTipo === "CLIENTE" && (
                <div>
                  <Label className="text-[11px]">Cliente *</Label>
                  <Select value={contraId} onValueChange={setContraId}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}{c.doc ? ` — ${c.doc}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {contraTipo === "FORNECEDOR" && (
                <div>
                  <Label className="text-[11px]">Fornecedor *</Label>
                  <Select value={contraId} onValueChange={setContraId}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}{f.documento ? ` — ${f.documento}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(contraTipo === "COLABORADOR" || contraTipo === "SOCIO") && (
                <div>
                  <Label className="text-[11px]">Nome *</Label>
                  <Input className="h-8" value={contraNome} onChange={(e) => setContraNome(e.target.value)} />
                </div>
              )}
              {contraTipo === "TERCEIRO" && (
                <>
                  <div>
                    <Label className="text-[11px]">Nome *</Label>
                    <Input className="h-8" value={contraNome} onChange={(e) => setContraNome(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px]">Documento (CPF/CNPJ)</Label>
                    <Input className="h-8" value={contraDoc} onChange={(e) => setContraDoc(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Valor + parcelas */}
          <div className="col-span-2 border-t border-border/60 pt-3">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Valor & Parcelas</div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px]">Valor total (R$) *</Label>
                <Input className="h-8" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">Qtd. parcelas *</Label>
                <Input type="number" min={1} className="h-8" value={qtdParcelas} onChange={(e) => setQtdParcelas(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">1º vencimento *</Label>
                <Input type="date" className="h-8" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">Intervalo (dias)</Label>
                <Input type="number" min={1} className="h-8" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} />
              </div>
            </div>

            {parcelas.length > 0 && (
              <div className="mt-2 border border-border/60 rounded">
                <div className="flex items-center justify-between px-2 py-1 bg-muted/40 text-[11px]">
                  <span className="font-semibold">Grade de parcelas ({parcelas.length})</span>
                  <div className="flex items-center gap-2">
                    <span className={somaOk ? "text-emerald-700" : "text-rose-700"}>
                      Soma: R$ {somaParcelas.toFixed(2)} / Total: R$ {valorTotalNum.toFixed(2)}
                    </span>
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-[11px]" onClick={regenerarGrade}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Regenerar
                    </Button>
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-[11.5px]">
                    <thead className="bg-muted/20 text-[10.5px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1 text-left w-12">#</th>
                        <th className="px-2 py-1 text-left">Vencimento</th>
                        <th className="px-2 py-1 text-right">Valor (R$)</th>
                        <th className="px-2 py-1 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {parcelas.map((p, idx) => (
                        <tr key={p.numero} className="border-t border-border/60">
                          <td className="px-2 py-1">{p.numero}/{parcelas.length}</td>
                          <td className="px-2 py-1">
                            <Input type="date" className="h-7 text-[11.5px]" value={p.vencimento}
                              onChange={(e) => updateParcelaLocal(idx, { vencimento: e.target.value })} />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <Input className="h-7 text-[11.5px] text-right" value={p.valor.toFixed(2)}
                              onChange={(e) => updateParcelaLocal(idx, { valor: parseFloat(e.target.value.replace(",", ".")) || 0 })} />
                          </td>
                          <td className="px-2 py-1 text-center text-muted-foreground">
                            <Trash2 className="h-3 w-3 opacity-30" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Classificação contábil */}
          <div className="col-span-2 border-t border-border/60 pt-3">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Classificação</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Natureza financeira *</Label>
                <Select value={naturezaId} onValueChange={setNaturezaId}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {naturezas.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.codigo} — {n.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Centro de resultado *</Label>
                <Select value={centroId} onValueChange={setCentroId}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {centros.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Conta financeira *</Label>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Detalhes adicionais */}
          <div className="col-span-2 border-t border-border/60 pt-3">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Detalhes</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Instituição / banco</Label>
                <Input className="h-8" value={instituicao} onChange={(e) => setInstituicao(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">Juros % a.m. (opcional)</Label>
                <Input className="h-8" value={jurosPct} onChange={(e) => setJurosPct(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-[11px]">Finalidade *</Label>
                <Input className="h-8" value={finalidade} onChange={(e) => setFinalidade(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-[11px]">Observações</Label>
                <Textarea className="min-h-16 text-[12.5px]" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={isPending}>
            {isPending ? "Criando…" : "Criar (RASCUNHO) + gerar parcelas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
