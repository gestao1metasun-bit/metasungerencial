import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, FileText, CheckCircle2, Clock, XCircle,
  DollarSign, TrendingUp, Users, AlertTriangle, Target, Trash2, Percent, BarChart3,
  Zap, Sun, Filter, Activity, Award, Gauge, SquarePen, Layers, History, MapPin, Undo2, Printer, PenLine,
  Eye, Paperclip, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ContratoImpressao } from "@/components/app/ContratoImpressao";
import { retornarPropostaParaOrcamento } from "@/modules/propostas/store";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
  ComposedChart, FunnelChart, Funnel, LabelList,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { EyeButton } from "@/components/app/EyeButton";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabFromHash } from "@/lib/route-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addPendencia } from "@/lib/fin-pendencias";
import {
  contratos as contratosSeed, vendedores as vendedoresSeed, propostas as propostasSeed,
  evolucaoMensal, fmtBRL, estoqueItens,
} from "@/lib/mock-data";
import {
  useContratos, setContratos as storeSetContratos, upsertContrato, updateContratoAudit,
  addProjeto, updateProjeto, removeProjeto, buscarCEP,
  validateContratoCompleto, solicitarAlteracaoContrato,
  aprovarProjeto, aprovarContratoAssinado,
  retornarContratoParaGerado, retornarContratoParaARedigir,
  type ContratoFull, type ClienteFull, type ProjetoVinculado, type PagamentoLinha,
} from "@/lib/contratos-store";
import { useClientesFull, addClienteFull, findClienteByDoc, DuplicateClienteError, type ClienteRecord } from "@/lib/clientes-store";
import { useContratoBase, setContratoBase, getContratoBase, type BaseClausula } from "@/lib/contrato-base-store";
import { Textarea } from "@/components/ui/textarea";


export const Route = createFileRoute("/comercial")({
  head: () => ({ meta: [{ title: "Comercial — Meta Sun Gerencial" }] }),
  component: ComercialPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/* ---------------- Máscaras / formatadores ---------------- */
const onlyDigits = (v: string) => v.replace(/\D/g, "");
function maskDoc(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    // CPF 000.000.000-00
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  // CNPJ 00.000.000/0000-00
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}
function maskTel(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^\((\d{2})\) (\d{4})(\d)/, "($1) $2-$3");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^\((\d{2})\) (\d{5})(\d)/, "($1) $2-$3");
}
const isDocValid = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 11 || d.length === 14;
};
const isTelValid = (v: string) => onlyDigits(v).length === 11;
function fmtDataBR(v?: string | null): string {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  return s;
}

/** Normaliza ID legado "CT-YYYY-NNNN" para o padrão "NNN/YYYY". */
function fmtContratoId(id: string): string {
  const m = id.match(/^CT-(\d{4})-(\d+)$/);
  if (m) return `${String(m[2]).slice(-3).padStart(3, "0")}/${m[1]}`;
  return id;
}

type Contrato = ContratoFull;
type Vendedor = (typeof vendedoresSeed)[number];
type Proposta = (typeof propostasSeed)[number];
export type VolumeMes = { id: string; mes: string; ano: number; qtd: number; valor: number };

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const volumeSeed: VolumeMes[] = [
  { id: "V-01", mes: "Jan", ano: 2026, qtd: 18, valor: 1240000 },
  { id: "V-02", mes: "Fev", ano: 2026, qtd: 22, valor: 1580000 },
  { id: "V-03", mes: "Mar", ano: 2026, qtd: 28, valor: 1920000 },
  { id: "V-04", mes: "Abr", ano: 2026, qtd: 33, valor: 2410000 },
  { id: "V-05", mes: "Mai", ano: 2026, qtd: 26, valor: 1850000 },
];

function ComercialPage() {
  const [tab, setTab] = useTabFromHash("/comercial");
  const contratos = useContratos();
  const setContratos = (next: Contrato[] | ((p: Contrato[]) => Contrato[])) => {
    const v = typeof next === "function" ? (next as any)(contratos) : next;
    storeSetContratos(v);
  };
  const [propostas, setPropostas] = useState<Proposta[]>(propostasSeed);
  const [vendedoresList, setVendedoresList] = useState<Vendedor[]>(vendedoresSeed);
  const [volume, setVolume] = useState<VolumeMes[]>(volumeSeed);

  return (
    <>
      <PageHeader title="Comercial" subtitle="Propostas, contratos, vendedores e volume mensal." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="contrato-assinado">Contrato Assinado</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="analise">Análise Executiva</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5">
          <DashboardComercial contratos={contratos} setContratos={setContratos} vendedoresList={vendedoresList} volume={volume} />
        </TabsContent>
        <TabsContent value="contratos" className="mt-5">
          <ContratosTab contratos={contratos} setContratos={setContratos} />
        </TabsContent>
        <TabsContent value="contrato-assinado" className="mt-5">
          <ContratoAssinadoTab contratos={contratos} setContratos={setContratos} vendedoresList={vendedoresList} />
        </TabsContent>
        <TabsContent value="vendedores" className="mt-5">
          <VendedoresTab contratos={contratos} vendedoresList={vendedoresList} setVendedoresList={setVendedoresList} />
        </TabsContent>
        <TabsContent value="analise" className="mt-5">
          <AnaliseExecutivaTab contratos={contratos} vendedoresList={vendedoresList} volume={volume} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- CONTRATO ASSINADO (somente assinados) ---------------- */
function valorContrato(c: Contrato): number {
  if (Number(c.valor) > 0) return Number(c.valor);
  return (c.projetos ?? []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
}

function ContratoAssinadoTab({
  contratos, setContratos, vendedoresList,
}: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void; vendedoresList: Vendedor[] }) {
  const [busca, setBusca] = useState("");
  const [imprimir, setImprimir] = useState<Contrato | null>(null);
  const assinados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contratos
      .filter((c) => c.status === "Assinado")
      .filter((c) => !q || c.cliente.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.propostaNumero ?? "").toLowerCase().includes(q));
  }, [contratos, busca]);
  const valorTotal = assinados.reduce((s, c) => s + valorContrato(c), 0);

  const retornar = (c: Contrato) => {
    const motivo = prompt(
      `Retornar contrato ${c.id} para Contratos Gerados (refazer assinatura)?\n\n` +
      `Atenção: ao retornar, os projetos saem da Engenharia e o contrato é removido de Financiamentos.\n\n` +
      `Motivo (obrigatório):`,
    );
    if (!motivo || !motivo.trim()) { toast.error("Informe um motivo para retornar."); return; }
    const r = retornarContratoParaGerado(c.id, motivo.trim(), "Comercial");
    if (!r.ok) { toast.error(r.motivo); return; }
    toast.success(`Contrato ${c.id} retornado. Engenharia e Financiamentos atualizados.`);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assinados</div>
          <div className="mt-1 text-2xl font-bold text-success">{assinados.length}</div>
          <div className="text-xs text-muted-foreground">{fmtBRL(valorTotal)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ticket médio</div>
          <div className="mt-1 text-2xl font-bold text-primary">{fmtBRL(valorTotal / Math.max(assinados.length, 1))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total no funil</div>
          <div className="mt-1 text-2xl font-bold text-primary">{contratos.length}</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-success" /> Contratos assinados
          </div>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar contrato, cliente, proposta…" className="h-9 pl-9" />
          </div>
        </div>
        {assinados.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum contrato assinado ainda.
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Contrato</TableHead>
              <TableHead className="w-[140px]">Ações</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Proposta</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead className="text-center">Anexo</TableHead>
              <TableHead className="text-center">Aprovação</TableHead>
              <TableHead className="text-center">Projetos</TableHead>
              <TableHead className="text-center">Pendentes Eng.</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {assinados.map((c) => (
                <ContratoAssinadoRow key={c.id} contrato={c} vendedoresList={vendedoresList} onImprimir={setImprimir} onRetornar={retornar} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {imprimir && <ContratoImpressao contrato={imprimir} onClose={() => setImprimir(null)} />}
    </div>
  );
}

function ContratoAssinadoRow({
  contrato: c, vendedoresList, onImprimir, onRetornar,
}: { contrato: Contrato; vendedoresList: Vendedor[]; onImprimir: (c: Contrato) => void; onRetornar: (c: Contrato) => void }) {
  const aprovado = c.assinadoAprovado === true;
  const projetos = c.projetos ?? [];
  const total = projetos.length;
  const pendentes = projetos.filter((p) => !p.enviadoEngenharia).length;
  const enviados = total - pendentes;
  const temAnexo = !!c.contratoAssinadoArquivo;
  const [editOpen, setEditOpen] = useState(false);
  const { node: anexoInput, trigger: abrirSeletor } = useAnexarHandler(c);
  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-semibold">{fmtContratoId(c.id)}</TableCell>
      <TableCell>
        {anexoInput}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-between gap-2 border-primary/40 bg-primary/5 px-3 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
              title="Ações"
            >
              <span className="flex items-center gap-1.5">
                <SquarePen className="h-3.5 w-3.5" /> Ações
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">{fmtContratoId(c.id)}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {temAnexo && (
              <DropdownMenuItem onSelect={() => abrirAnexoContrato(c)}>
                <Eye className="mr-2 h-4 w-4" /> Visualizar anexo
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={abrirSeletor}>
              <Paperclip className="mr-2 h-4 w-4" /> {temAnexo ? "Reanexar contrato" : "Anexar contrato"}
            </DropdownMenuItem>
            {!aprovado && (
              <DropdownMenuItem
                disabled={!temAnexo}
                onSelect={() => {
                  const r = aprovarContratoAssinado(c.id, "Comercial");
                  if (!r.ok) { toast.error(r.motivo); return; }
                  const temFin = (c.pagamentoDetalhes?.formas ?? []).some((f) => f.tipo === "Financiamento");
                  toast.success(`Contrato ${fmtContratoId(c.id)} aprovado. Liberado para Engenharia${temFin ? " e Financiamento" : ""}.`);
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar contrato
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setEditOpen(true)} disabled={!aprovado} title={!aprovado ? "Disponível após aprovação do contrato" : undefined}>
              <SquarePen className="mr-2 h-4 w-4" /> Criar / aprovar projetos
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onImprimir(c)}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRetornar(c)}>
              <Undo2 className="mr-2 h-4 w-4" /> Retornar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <EditarContratoDialog contrato={c} vendedoresList={vendedoresList} open={editOpen} onOpenChange={setEditOpen} hideTrigger lockDados />
      </TableCell>
      <TableCell className="font-medium">{c.cliente}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{c.propostaNumero ?? "—"}</TableCell>
      <TableCell className="text-xs">{c.vendedor || "—"}</TableCell>
      <TableCell className="text-right font-semibold">{fmtBRL(valorContrato(c))}</TableCell>
      <TableCell className="text-xs">{fmtDataBR(c.dataAssinatura)}</TableCell>
      <TableCell className="text-center">
        {temAnexo ? (
          <button
            type="button"
            onClick={() => abrirAnexoContrato(c)}
            className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success hover:bg-success/25"
            title={`Visualizar ${c.contratoAssinadoArquivo}`}
          >
            <Eye className="h-3 w-3" /> Anexado
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
            <AlertTriangle className="h-3 w-3" /> Faltando
          </span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {aprovado ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" /> Aprovado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
            <Clock className="h-3 w-3" /> Aguardando
          </span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold tabular-nums" title={`${enviados} enviados de ${total}`}>
          {enviados}/{total}
        </span>
      </TableCell>
      <TableCell className="text-center">
        {total === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : pendentes === 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" /> 0
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 tabular-nums">
            <Clock className="h-3 w-3" /> {pendentes}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

/** Armazena temporariamente a dataURL do anexo (para visualização) por id de contrato. */
const ANEXO_URLS = new Map<string, string>();
function setAnexoUrl(id: string, url: string) { ANEXO_URLS.set(id, url); }
function getAnexoUrl(id: string) { return ANEXO_URLS.get(id); }
function abrirAnexoContrato(contrato: Contrato) {
  const url = getAnexoUrl(contrato.id);
  if (!url) {
    toast.info(`Anexo "${contrato.contratoAssinadoArquivo}" registrado nesta sessão não está disponível para abrir aqui. Reanexe o arquivo para visualizar.`);
    return;
  }
  const w = window.open();
  if (w) {
    w.document.write(
      `<title>${contrato.contratoAssinadoArquivo ?? "Anexo"}</title>` +
      (url.startsWith("data:application/pdf")
        ? `<iframe src="${url}" style="border:0;width:100%;height:100vh"></iframe>`
        : `<img src="${url}" style="max-width:100%;height:auto;display:block;margin:auto" />`),
    );
  }
}

/** Trigger oculto pra abrir o seletor de arquivo do anexo, controlado pelo dropdown. */
function useAnexarHandler(contrato: Contrato) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const node = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,image/*"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") setAnexoUrl(contrato.id, reader.result);
        };
        reader.readAsDataURL(f);
        updateContratoAudit(
          contrato.id,
          {
            contratoAssinadoArquivo: f.name,
            dataAssinatura: contrato.dataAssinatura ?? new Date().toISOString().slice(0, 10),
          },
          "Comercial",
        );
        toast.success(`Anexo "${f.name}" registrado em ${fmtContratoId(contrato.id)}.`);
        if (inputRef.current) inputRef.current.value = "";
      }}
    />
  );
  return { node, trigger: () => inputRef.current?.click() };
}


/* ---------------- CONTRATOS GERADOS (cadastro CPF/CNPJ + endereço → contrato redigido) ---------------- */
function ContratosTab({
  contratos, setContratos,
}: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void }) {
  const [busca, setBusca] = useState("");
  // Aprovados pelo orçamento e ainda sem o contrato redigido.
  const aRedigir = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contratos
      .filter((c) => c.status === "Pendente" && !c.contratoRedigido)
      .filter((c) => !q || c.cliente.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.propostaNumero ?? "").toLowerCase().includes(q));
  }, [contratos, busca]);
  const redigidos = useMemo(
    () => contratos.filter((c) => c.contratoRedigido && c.status === "Pendente"),
    [contratos],
  );
  const redigidosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return redigidos.filter((c) => !q || c.cliente.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.propostaNumero ?? "").toLowerCase().includes(q));
  }, [redigidos, busca]);

  const [aberto, setAberto] = useState<Contrato | null>(null);
  const [imprimir, setImprimir] = useState<Contrato | null>(null);
  const [gerarAssinado, setGerarAssinado] = useState<Contrato | null>(null);
  const [dataAssinaturaInput, setDataAssinaturaInput] = useState<string>(() => new Date().toISOString().slice(0, 10));

  function retornarParaOrcamento(c: Contrato) {
    const motivo = prompt(`Retornar contrato ${c.id} para Orçamentos?\n\nMotivo (obrigatório):`);
    if (!motivo || !motivo.trim()) { toast.error("Informe um motivo para retornar."); return; }
    setContratos(contratos.filter((x) => x.id !== c.id));
    if (c.propostaId) {
      retornarPropostaParaOrcamento(c.propostaId, "Comercial", motivo.trim());
    }
    toast.success(`Contrato ${c.id} retornado para Orçamentos.`);
  }


  function reabrirRedigido(c: Contrato) {
    const motivo = prompt(`Reabrir cadastro do contrato ${c.id}?\n\nMotivo (obrigatório):`);
    if (!motivo || !motivo.trim()) { toast.error("Informe um motivo para retornar."); return; }
    const r = retornarContratoParaARedigir(c.id, motivo.trim(), "Comercial");
    if (!r.ok) { toast.error(r.motivo); return; }
    toast.success(`Contrato ${c.id} voltou para "A redigir".`);
  }

  function confirmarAssinado() {
    if (!gerarAssinado) return;
    if (!dataAssinaturaInput) { toast.error("Informe a data de assinatura."); return; }
    updateContratoAudit(gerarAssinado.id, { status: "Assinado", dataAssinatura: dataAssinaturaInput }, "Comercial");
    toast.success(`Contrato ${gerarAssinado.id} assinado em ${dataAssinaturaInput}. Disponível em Contrato Assinado.`);
    setGerarAssinado(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <ModeloBaseContratoDialog />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">A redigir</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-2xl font-bold text-warning">{aRedigir.length}</div>
            {aRedigir.length > 0 && <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-warning" />}
          </div>
          <div className="text-xs text-muted-foreground">Cadastrar dados → gerar contrato impresso</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Redigidos · aguardando assinatura</div>
          <div className="mt-1 text-2xl font-bold text-info">{redigidos.length}</div>
          <div className="text-xs text-muted-foreground">Imprimir e gerar assinado</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total no funil</div>
          <div className="mt-1 text-2xl font-bold text-primary">{contratos.length}</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Contratos aprovados aguardando redação
          </div>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar contrato, cliente, proposta…" className="h-9 pl-9" />
          </div>
        </div>
        {aRedigir.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum contrato aguardando redação. Aprove uma proposta em Orçamentos para iniciar.
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Proposta</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {aRedigir.map((c) => {
                const cf = c.clienteFull;
                const docDig = onlyDigits(cf?.doc ?? "");
                const temDoc = docDig.length === 11 || docDig.length === 14;
                const temEndereco = !!(cf?.cep && cf?.rua && cf?.numero);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-semibold">{c.id}</TableCell>
                    <TableCell className="font-medium">{c.cliente}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.propostaNumero ?? "—"}</TableCell>
                    <TableCell className="text-xs">{c.vendedor || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                    <TableCell className="text-xs">{temDoc ? <span className="text-success">OK</span> : <span className="text-warning">Pendente</span>}</TableCell>
                    <TableCell className="text-xs">{temEndereco ? <span className="text-success">OK</span> : <span className="text-warning">Pendente</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => retornarParaOrcamento(c)} className="h-8 gap-1.5">
                          <Undo2 className="h-3.5 w-3.5" /> Retornar
                        </Button>
                        <Button size="sm" onClick={() => setAberto(c)} className="h-8 gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> Cadastrar · gerar contrato
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-info" /> Contratos redigidos · aguardando assinatura
        </div>
        {redigidosFiltrados.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum contrato redigido. Cadastre os dados de um contrato acima para gerar.
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Proposta</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {redigidosFiltrados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-semibold">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.cliente}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.propostaNumero ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.vendedor || "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setImprimir(c)}>
                        <Printer className="h-3.5 w-3.5" /> Imprimir
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setAberto(c)}>
                        <SquarePen className="h-3.5 w-3.5" /> Editar dados
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => reabrirRedigido(c)}>
                        <Undo2 className="h-3.5 w-3.5" /> Retornar
                      </Button>
                      <Button size="sm" className="h-8 gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => { setGerarAssinado(c); setDataAssinaturaInput(new Date().toISOString().slice(0,10)); }}>
                        <PenLine className="h-3.5 w-3.5" /> Gerar Assinado
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {aberto && (
        <RedigirContratoDialog
          contrato={aberto}
          onClose={() => setAberto(null)}
          onConfirm={(patch) => {
            const atualizado = { ...aberto, ...patch, contratoRedigido: true } as Contrato;
            setContratos(contratos.map((c) => c.id === aberto.id ? atualizado : c));
            toast.success(`Contrato ${aberto.id} gerado. Abrindo visualização para impressão.`);
            setAberto(null);
            setImprimir(atualizado);
          }}
        />
      )}

      {imprimir && <ContratoImpressao contrato={imprimir} onClose={() => setImprimir(null)} />}

      <Dialog open={!!gerarAssinado} onOpenChange={(o) => { if (!o) setGerarAssinado(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar contrato assinado {gerarAssinado?.id}</DialogTitle>
            <DialogDescription className="text-xs">
              Informe a data em que o contrato foi assinado pelo cliente. Após confirmar, o contrato será movido para a aba <strong>Contrato Assinado</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">Data de assinatura *</Label>
            <Input type="date" className="mt-1.5" value={dataAssinaturaInput} onChange={(e) => setDataAssinaturaInput(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGerarAssinado(null)}>Cancelar</Button>
            <Button onClick={confirmarAssinado} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="h-4 w-4" /> Confirmar assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/* ---------------- MODELO BASE DE CONTRATO ---------------- */
function ModeloBaseContratoDialog() {
  const [open, setOpen] = useState(false);
  const [base, setBaseState] = useContratoBase();
  const [draft, setDraft] = useState<BaseClausula[]>(base);

  useEffect(() => { if (open) setDraft(base); }, [open, base]);

  function add() {
    setDraft([...draft, { id: crypto.randomUUID(), acao: "substituir", referencia: "3.2", texto: "" }]);
  }
  function upd(id: string, patch: Partial<BaseClausula>) {
    setDraft(draft.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function rm(id: string) { setDraft(draft.filter((c) => c.id !== id)); }
  function salvar() {
    const limpo = draft.filter((c) => c.acao === "remover" || (c.referencia && c.texto));
    setBaseState(limpo);
    toast.success(`Modelo base atualizado (${limpo.length} ajuste${limpo.length === 1 ? "" : "s"}). Vale para os próximos contratos redigidos.`);
    setOpen(false);
  }
  function limparTudo() {
    if (!confirm("Limpar todas as personalizações do modelo base?")) return;
    setDraft([]);
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" /> Modelo base de contrato
        {base.length > 0 && (
          <span className="ml-1 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-bold">
            {base.length}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Modelo base de contrato</DialogTitle>
            <DialogDescription className="text-xs">
              Define ajustes <b>padrão</b> que entram automaticamente em todo novo contrato no momento da redação.
              Alterações feitas dentro de um contrato já redigido <b>não</b> mudam essa base, e mudanças aqui
              <b> não</b> afetam contratos já redigidos — só os próximos.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 overflow-y-auto space-y-3">
            <p className="text-xs text-muted-foreground">
              Cada linha é um ajuste sobre o template padrão Meta Sun. Você pode
              <b> substituir</b> uma cláusula (ex. 3.2), <b>adicionar</b> uma nova
              (renumeração automática), ou <b>remover</b> uma cláusula inteira (ex. "6").
            </p>
            {draft.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                Nenhum ajuste no modelo base. Os contratos usarão o template Meta Sun padrão.
              </div>
            )}
            {draft.map((c) => (
              <div key={c.id} className="rounded-md border p-3 space-y-2 bg-card">
                <div className="grid sm:grid-cols-[160px_140px_1fr_auto] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Ação</Label>
                    <Select value={c.acao} onValueChange={(v) => upd(c.id, { acao: v as BaseClausula["acao"] })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="substituir">Substituir</SelectItem>
                        <SelectItem value="adicionar">Adicionar</SelectItem>
                        <SelectItem value="remover">Remover</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Referência</Label>
                    <Input className="mt-1.5" value={c.referencia} onChange={(e) => upd(c.id, { referencia: e.target.value })} placeholder="3.2" />
                  </div>
                  <div className="text-[11px] text-muted-foreground self-center pt-4">
                    {c.acao === "remover" ? "Remove cláusula inteira (ex. \"6\")" : c.acao === "adicionar" ? "Insere antes desta e renumera" : "Substitui o texto desta cláusula"}
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rm(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {c.acao !== "remover" && (
                  <Textarea rows={3} value={c.texto ?? ""} onChange={(e) => upd(c.id, { texto: e.target.value })} placeholder="Texto da cláusula..." />
                )}
              </div>
            ))}
            <div className="flex justify-between pt-2">
              <Button size="sm" variant="outline" onClick={add}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar ajuste à base
              </Button>
              {draft.length > 0 && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={limparTudo}>
                  Limpar tudo
                </Button>
              )}
            </div>
          </div>
          <DialogFooter className="border-t bg-muted/30 px-6 py-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Salvar modelo base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function mapTipoTopo(t?: PagamentoLinha["tipo"]): Contrato["pagamentoTipo"] | undefined {
  if (!t) return undefined;
  if (t === "PIX") return "PIX";
  if (t === "Boleto") return "Boleto";
  if (t === "Financiamento") return "Financiamento";
  if (t === "Dinheiro") return "Dinheiro";
  if (t.startsWith("Cartão")) return "Cartão";
  return "Misto";
}

function RedigirContratoDialog({
  contrato, onClose, onConfirm,
}: {
  contrato: Contrato;
  onClose: () => void;
  onConfirm: (patch: Partial<Contrato>) => void;
}) {
  const upper = (v: string) => v.toUpperCase();
  const cf = contrato.clienteFull;
  // Identificação
  const initialTipo: "PF" | "PJ" = onlyDigits(cf?.doc ?? "").length === 14 ? "PJ" : "PF";
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">(initialTipo);
  const [nome, setNome] = useState(cf?.nome ?? contrato.cliente ?? "");
  const [doc, setDoc] = useState(maskDoc(cf?.doc ?? ""));
  const [telefone, setTelefone] = useState(maskTel(cf?.telefone ?? ""));
  const [email, setEmail] = useState(cf?.email ?? "");
  // Responsável (PJ)
  const [responsavel, setResponsavel] = useState(contrato.responsavel ?? "");
  const [responsavelDoc, setResponsavelDoc] = useState(maskDoc(contrato.responsavelDoc ?? ""));
  const [responsavelCargo, setResponsavelCargo] = useState(contrato.responsavelCargo ?? "");
  // Endereço
  const [cep, setCep] = useState(cf?.cep ?? "");
  const [rua, setRua] = useState(cf?.rua ?? "");
  const [numero, setNumero] = useState(cf?.numero ?? "");
  const [complemento, setComplemento] = useState(cf?.complemento ?? "");
  const [bairro, setBairro] = useState(cf?.bairro ?? "");
  const [cidade, setCidade] = useState(cf?.cidade ?? "");
  const [uf, setUf] = useState(cf?.uf ?? "");
  const [buscando, setBuscando] = useState(false);
  // Pagamento
  const [pagamentoTipo, setPagamentoTipo] = useState<NonNullable<Contrato["pagamentoTipo"]>>(contrato.pagamentoTipo ?? "PIX");
  const det0 = contrato.pagamentoDetalhes ?? {};
  const [marcoInicial, setMarcoInicial] = useState<NonNullable<NonNullable<Contrato["pagamentoDetalhes"]>["marcoInicial"]>>(det0.marcoInicial ?? "assinatura");
  const [multaPctDefault, setMultaPctDefault] = useState<number>(det0.multaPct ?? 2);
  const [jurosMesPctDefault, setJurosMesPctDefault] = useState<number>(det0.jurosMesPct ?? 1);
  const [correcaoDefault, setCorrecaoDefault] = useState(det0.correcao ?? "IGP-M");
  const [pagObs, setPagObs] = useState(det0.obs ?? "");
  // Composição de formas (várias linhas — entrada PIX + boletos etc.)
  const [formas, setFormas] = useState<PagamentoLinha[]>(
    det0.formas && det0.formas.length > 0
      ? det0.formas
      : [{ id: crypto.randomUUID(), tipo: "PIX", momento: "entrada", valor: contrato.valor, parcelas: 1, jurosTipo: "sem" }]
  );
  function addForma() {
    setFormas([...formas, { id: crypto.randomUUID(), tipo: "Boleto", momento: "pos-instalacao", valor: 0, parcelas: 1, jurosTipo: "sem" }]);
  }
  function updForma(id: string, patch: Partial<PagamentoLinha>) {
    setFormas(formas.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function rmForma(id: string) { setFormas(formas.filter((f) => f.id !== id)); }
  const somaFormas = formas.reduce((s, f) => s + (Number(f.valor) || 0), 0);
  const diffFormas = Number(contrato.valor || 0) - somaFormas;

  // Cláusulas custom — começa com o MODELO BASE se o contrato ainda não tiver personalização própria
  const [clausulas, setClausulas] = useState<NonNullable<Contrato["clausulasCustom"]>>(
    contrato.clausulasCustom ?? getContratoBase()
  );
  function addClausula() {
    setClausulas([...clausulas, { id: crypto.randomUUID(), acao: "substituir", referencia: "3.2", texto: "" }]);
  }
  function updClausula(id: string, patch: Partial<NonNullable<Contrato["clausulasCustom"]>[number]>) {
    setClausulas(clausulas.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function rmClausula(id: string) { setClausulas(clausulas.filter((c) => c.id !== id)); }

  function fmtCep(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  async function buscar() {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) { toast.error("Informe um CEP de 8 dígitos."); return; }
    setBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const data = await r.json();
      if (data?.erro) { toast.error("CEP não encontrado. Preencha manualmente."); return; }
      setRua(upper(data.logradouro ?? ""));
      setBairro(upper(data.bairro ?? ""));
      setCidade(upper(data.localidade ?? ""));
      setUf(upper(data.uf ?? ""));
      if (data.complemento && !complemento) setComplemento(upper(data.complemento));
      toast.success("Endereço preenchido — confira e ajuste se necessário.");
    } catch {
      toast.error("Erro de rede ao consultar CEP.");
    } finally {
      setBuscando(false);
    }
  }

  function salvar() {
    if (!nome.trim()) { toast.error("Nome do cliente é obrigatório."); return; }
    const docDig = onlyDigits(doc);
    if (!(tipoPessoa === "PF" ? docDig.length === 11 : docDig.length === 14)) {
      toast.error(tipoPessoa === "PF" ? "CPF inválido (11 dígitos)." : "CNPJ inválido (14 dígitos)."); return;
    }
    if (tipoPessoa === "PJ" && !responsavel.trim()) {
      toast.error("Para PJ informe o representante legal."); return;
    }
    if (cep.replace(/\D/g, "").length !== 8) { toast.error("CEP é obrigatório (8 dígitos)."); return; }
    if (!rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
      toast.error("Endereço completo é obrigatório (Rua, Nº, Bairro, Cidade, UF)."); return;
    }
    const clienteFull: ClienteFull = {
      nome: upper(nome),
      doc,
      telefone,
      email,
      cep: cep.replace(/\D/g, ""),
      rua: upper(rua), numero: upper(numero), complemento: upper(complemento),
      bairro: upper(bairro), cidade: upper(cidade), uf: upper(uf),
    };
    onConfirm({
      cliente: upper(nome),
      clienteFull,
      status: "Pendente",
      responsavel: tipoPessoa === "PJ" ? upper(responsavel) : undefined,
      responsavelDoc: tipoPessoa === "PJ" ? responsavelDoc : undefined,
      responsavelCargo: tipoPessoa === "PJ" ? responsavelCargo : undefined,
      pagamentoTipo: formas.length > 1 ? "Misto" : (mapTipoTopo(formas[0]?.tipo) ?? pagamentoTipo),
      pagamentoDetalhes: {
        marcoInicial,
        multaPct: multaPctDefault, jurosMesPct: jurosMesPctDefault, correcao: correcaoDefault,
        obs: pagObs,
        formas,
        // Compat legado (1ª linha)
        parcelas: formas[0]?.parcelas ?? 1,
        banco: formas.find((f) => f.tipo === "Financiamento")?.banco,
      },
      clausulasCustom: clausulas.filter((c) => c.acao === "remover" || (c.referencia && c.texto)),
      pagamento: formas.length > 1
        ? `Misto (${formas.map((f) => f.tipo).join(" + ")})`
        : (formas[0]?.tipo === "Financiamento" && formas[0]?.banco ? `Financiamento ${formas[0].banco}` : (formas[0]?.tipo ?? pagamentoTipo)),
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Redigir contrato {contrato.id}</DialogTitle>
            <DialogDescription className="text-xs">
              Proposta {contrato.propostaNumero ?? "—"} · valor {fmtBRL(contrato.valor)}. Preencha as 3 abas abaixo para gerar o contrato.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-4 overflow-y-auto">
          <Tabs defaultValue="cliente" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cliente">1. Cliente</TabsTrigger>
              <TabsTrigger value="pagamento">2. Pagamento</TabsTrigger>
              <TabsTrigger value="clausulas">3. Cláusulas</TabsTrigger>
            </TabsList>

            {/* CLIENTE */}
            <TabsContent value="cliente" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant={tipoPessoa === "PF" ? "default" : "outline"}
                  onClick={() => { setTipoPessoa("PF"); setDoc(maskDoc(doc)); }}>Pessoa Física</Button>
                <Button type="button" size="sm" variant={tipoPessoa === "PJ" ? "default" : "outline"}
                  onClick={() => { setTipoPessoa("PJ"); setDoc(maskDoc(doc)); }}>Pessoa Jurídica</Button>
              </div>
              <div className="grid sm:grid-cols-[1fr_220px] gap-3">
                <div>
                  <Label className="text-xs">{tipoPessoa === "PF" ? "Nome completo" : "Razão social"} *</Label>
                  <Input className="mt-1.5" value={nome} onChange={(e) => setNome(upper(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">{tipoPessoa === "PF" ? "CPF" : "CNPJ"} *</Label>
                  <Input className="mt-1.5" value={doc} onChange={(e) => setDoc(maskDoc(e.target.value))}
                    placeholder={tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} inputMode="numeric" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Telefone</Label><Input className="mt-1.5" value={telefone} onChange={(e) => setTelefone(maskTel(e.target.value))} placeholder="(00) 00000-0000" /></div>
                <div><Label className="text-xs">E-mail</Label><Input className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>

              {tipoPessoa === "PJ" && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Representante legal</div>
                  <div className="grid sm:grid-cols-[1fr_180px_160px] gap-3">
                    <div><Label className="text-xs">Nome do responsável *</Label><Input className="mt-1.5" value={responsavel} onChange={(e) => setResponsavel(upper(e.target.value))} /></div>
                    <div><Label className="text-xs">CPF</Label><Input className="mt-1.5" value={responsavelDoc} onChange={(e) => setResponsavelDoc(maskDoc(e.target.value))} placeholder="000.000.000-00" /></div>
                    <div><Label className="text-xs">Cargo</Label><Input className="mt-1.5" value={responsavelCargo} onChange={(e) => setResponsavelCargo(e.target.value)} placeholder="Sócio-administrador" /></div>
                  </div>
                </div>
              )}

              <div className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</div>
              <div className="grid sm:grid-cols-[160px_1fr] gap-3 items-end">
                <div>
                  <Label className="text-xs">CEP *</Label>
                  <div className="mt-1.5 flex gap-1">
                    <Input value={cep} onChange={(e) => setCep(fmtCep(e.target.value))} placeholder="00000-000" inputMode="numeric" maxLength={9} />
                    <Button type="button" size="sm" variant="outline" onClick={buscar} disabled={buscando}>
                      {buscando ? "..." : "Buscar"}
                    </Button>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">Caso o CEP esteja errado, edite os campos manualmente.</div>
              </div>
              <div className="grid sm:grid-cols-[1fr_120px] gap-3">
                <div><Label className="text-xs">Rua / Logradouro *</Label><Input className="mt-1.5" value={rua} onChange={(e) => setRua(upper(e.target.value))} /></div>
                <div><Label className="text-xs">Número *</Label><Input className="mt-1.5" value={numero} onChange={(e) => setNumero(upper(e.target.value))} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Complemento</Label><Input className="mt-1.5" value={complemento} onChange={(e) => setComplemento(upper(e.target.value))} /></div>
                <div><Label className="text-xs">Bairro *</Label><Input className="mt-1.5" value={bairro} onChange={(e) => setBairro(upper(e.target.value))} /></div>
              </div>
              <div className="grid sm:grid-cols-[1fr_100px] gap-3">
                <div><Label className="text-xs">Cidade *</Label><Input className="mt-1.5" value={cidade} onChange={(e) => setCidade(upper(e.target.value))} /></div>
                <div><Label className="text-xs">UF *</Label><Input className="mt-1.5" value={uf} maxLength={2} onChange={(e) => setUf(upper(e.target.value).slice(0, 2))} /></div>
              </div>
            </TabsContent>

            {/* PAGAMENTO */}
            <TabsContent value="pagamento" className="space-y-3 pt-3">
              <div className="rounded-md border bg-muted/20 p-2 text-xs">
                <div className="flex justify-between"><span>Valor do contrato</span><span className="font-semibold">{fmtBRL(contrato.valor)}</span></div>
                <div className="flex justify-between"><span>Soma das formas</span><span className={Math.abs(diffFormas) <= 0.5 ? "font-semibold text-success" : "font-semibold text-destructive"}>{fmtBRL(somaFormas)}</span></div>
                {Math.abs(diffFormas) > 0.5 && (
                  <div className="flex justify-between text-destructive"><span>Diferença</span><span>{fmtBRL(diffFormas)}</span></div>
                )}
              </div>

              <div className="rounded-md border bg-warning/5 p-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-warning">Regras gerais de boleto (default)</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><Label className="text-xs">Multa (%)</Label><Input type="number" step="0.1" className="mt-1.5" value={multaPctDefault} onChange={(e) => setMultaPctDefault(Number(e.target.value) || 0)} /></div>
                  <div><Label className="text-xs">Juros ao mês (%)</Label><Input type="number" step="0.1" className="mt-1.5" value={jurosMesPctDefault} onChange={(e) => setJurosMesPctDefault(Number(e.target.value) || 0)} /></div>
                  <div><Label className="text-xs">Correção</Label><Input className="mt-1.5" value={correcaoDefault} onChange={(e) => setCorrecaoDefault(e.target.value)} placeholder="IGP-M" /></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Composição (formas de pagamento)</div>
                  <Button size="sm" variant="outline" onClick={addForma}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar forma</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ex.: PIX <b>R$ 50.000</b> na entrada + 10 Boletos somando <b>R$ 50.000</b> pós-instalação.
                  Cada linha vira uma letra <b>a) b) c)</b> na cláusula 2.2 do contrato.
                </p>

                {formas.map((f, idx) => {
                  const ehCartao = f.tipo.startsWith("Cartão");
                  return (
                    <div key={f.id} className="rounded-md border p-3 space-y-2 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-primary">{String.fromCharCode(97 + idx)}) Forma {idx + 1}</div>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => rmForma(f.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-[1fr_1fr] gap-2">
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={f.tipo} onValueChange={(v) => updForma(f.id, { tipo: v as PagamentoLinha["tipo"] })}>
                            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(["PIX","Boleto","Financiamento","Cartão de Crédito","Cartão de Débito","Dinheiro","Transferência","Permuta"] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Momento</Label>
                          <Select value={f.momento} onValueChange={(v) => updForma(f.id, { momento: v as PagamentoLinha["momento"] })}>
                            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="entrada">Entrada (assinatura)</SelectItem>
                              <SelectItem value="ato">No ato</SelectItem>
                              <SelectItem value="entrega-materiais">Na entrega do material</SelectItem>
                              <SelectItem value="pos-instalacao">Após instalação</SelectItem>
                              <SelectItem value="conforme-cronograma">Conforme cronograma</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-[1fr_120px] gap-2">
                        <div>
                          <Label className="text-xs">Valor (R$)</Label>
                          <Input type="number" step="0.01" min={0} className="mt-1.5" value={f.valor}
                            onChange={(e) => updForma(f.id, { valor: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs">Nº parcelas</Label>
                          <Input type="number" min={1} className="mt-1.5" value={f.parcelas}
                            onChange={(e) => updForma(f.id, { parcelas: Math.max(1, Number(e.target.value) || 1) })} />
                        </div>
                      </div>

                      {ehCartao && (
                        <div className="rounded-md border bg-info/5 p-2 space-y-2">
                          <div>
                            <Label className="text-xs">Quem paga os juros do cartão?</Label>
                            <Select value={f.jurosTipo ?? "sem"} onValueChange={(v) => updForma(f.id, { jurosTipo: v as any })}>
                              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sem">Sem juros / à vista</SelectItem>
                                <SelectItem value="empresa">Juros da empresa (não repassar)</SelectItem>
                                <SelectItem value="cliente">Juros do cliente (acrescentar)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {f.jurosTipo === "cliente" && (
                            <div>
                              <Label className="text-xs">Valor total COM juros do cliente (R$)</Label>
                              <Input type="number" step="0.01" min={0} className="mt-1.5" value={f.valorComJuros ?? 0}
                                onChange={(e) => updForma(f.id, { valorComJuros: Number(e.target.value) || 0 })} />
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Valor à vista da empresa: <b>{fmtBRL(f.valor)}</b>. O cliente pagará <b>{f.parcelas}x</b> de <b>{fmtBRL((f.valorComJuros || 0) / Math.max(1, f.parcelas))}</b>.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {f.tipo === "Financiamento" && (
                        <div>
                          <Label className="text-xs">Banco</Label>
                          <Input className="mt-1.5" value={f.banco ?? ""} onChange={(e) => updForma(f.id, { banco: e.target.value })} placeholder="BASA, SICREDI, BB..." />
                        </div>
                      )}

                      {f.parcelas > 1 && (
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">1º vencimento (dias após o momento)</Label>
                            <Input type="number" min={0} className="mt-1.5" value={f.primeiroVencDias ?? 30}
                              onChange={(e) => updForma(f.id, { primeiroVencDias: Math.max(0, Number(e.target.value) || 0) })} />
                          </div>
                          <div>
                            <Label className="text-xs">Intervalo entre parcelas (dias)</Label>
                            <Input type="number" min={1} className="mt-1.5" value={f.intervaloDias ?? 30}
                              onChange={(e) => updForma(f.id, { intervaloDias: Math.max(1, Number(e.target.value) || 30) })} />
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs">Observação desta forma (opcional)</Label>
                        <Input className="mt-1.5" value={f.obs ?? ""} onChange={(e) => updForma(f.id, { obs: e.target.value })} placeholder="Ex.: a partir de 30 dias após a vistoria" />
                      </div>

                      {f.parcelas > 1 && (() => {
                        const total = ehCartao && f.jurosTipo === "cliente" && f.valorComJuros ? f.valorComJuros : f.valor;
                        const valorParcela = total / f.parcelas;
                        const primeiro = f.primeiroVencDias ?? 30;
                        const intervalo = f.intervaloDias ?? 30;
                        const momentoLabel = ({
                          "entrada": "assinatura",
                          "ato": "ato",
                          "entrega-materiais": "entrega do material",
                          "pos-instalacao": "instalação",
                          "conforme-cronograma": "cronograma",
                        } as Record<string, string>)[f.momento] ?? "início";
                        return (
                          <div className="rounded-md border bg-muted/20 p-2 text-[11px]">
                            <div className="font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Cronograma de parcelas
                              {ehCartao && f.jurosTipo === "cliente" && f.valorComJuros
                                ? ` · com juros do cliente (total ${fmtBRL(total)})`
                                : ehCartao && f.jurosTipo === "empresa"
                                ? ` · juros da empresa (cliente paga ${fmtBRL(total)})`
                                : ""}
                            </div>
                            <table className="w-full">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-0.5 pr-2">#</th>
                                  <th className="py-0.5 pr-2">Vencimento</th>
                                  <th className="py-0.5 text-right">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: f.parcelas }).map((_, i) => (
                                  <tr key={i} className="border-t border-border/40">
                                    <td className="py-0.5 pr-2">{i + 1}/{f.parcelas}</td>
                                    <td className="py-0.5 pr-2">{primeiro + i * intervalo} dias após {momentoLabel}</td>
                                    <td className="py-0.5 text-right font-medium">{fmtBRL(valorParcela)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t border-border font-semibold">
                                  <td colSpan={2} className="pt-1">Total</td>
                                  <td className="pt-1 text-right">{fmtBRL(valorParcela * f.parcelas)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              <div>
                <Label className="text-xs">Observações gerais de pagamento</Label>
                <Textarea className="mt-1.5" rows={2} value={pagObs} onChange={(e) => setPagObs(e.target.value)} placeholder="Texto livre adicional que aparecerá ao final da cláusula 2." />
              </div>
            </TabsContent>


            {/* CLÁUSULAS */}
            <TabsContent value="clausulas" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Personalize cláusulas específicas. Você pode <b>substituir</b> uma cláusula existente (ex. 3.2),
                <b> adicionar</b> uma nova (renumerando as seguintes) ou <b>remover</b> uma cláusula inteira (ex. "7").
              </p>
              {clausulas.length === 0 && (
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Nenhuma personalização. O contrato usará o template padrão Meta Sun.
                </div>
              )}
              {clausulas.map((c) => (
                <div key={c.id} className="rounded-md border p-3 space-y-2">
                  <div className="grid sm:grid-cols-[160px_140px_1fr_auto] gap-2 items-end">
                    <div>
                      <Label className="text-xs">Ação</Label>
                      <Select value={c.acao} onValueChange={(v) => updClausula(c.id, { acao: v as any })}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="substituir">Substituir</SelectItem>
                          <SelectItem value="adicionar">Adicionar</SelectItem>
                          <SelectItem value="remover">Remover</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Referência</Label>
                      <Input className="mt-1.5" value={c.referencia} onChange={(e) => updClausula(c.id, { referencia: e.target.value })} placeholder="3.2" />
                    </div>
                    <div className="text-[11px] text-muted-foreground self-center pt-4">
                      {c.acao === "remover" ? "Remove cláusula inteira (ex. \"7\")" : c.acao === "adicionar" ? "Insere novo parágrafo e renumera os seguintes" : "Substitui o texto do parágrafo"}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => rmClausula(c.id)}>Remover</Button>
                  </div>
                  {c.acao !== "remover" && (
                    <Textarea rows={3} value={c.texto ?? ""} onChange={(e) => updClausula(c.id, { texto: e.target.value })} placeholder="Texto da cláusula..." />
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addClausula}>+ Adicionar cláusula personalizada</Button>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="border-t bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="gap-1">
            <CheckCircle2 className="h-4 w-4" /> Gerar contrato redigido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* ---------------- DASHBOARD ---------------- */

function DashboardComercial({
  contratos, setContratos, vendedoresList, volume,
}: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void; vendedoresList: Vendedor[]; volume: VolumeMes[] }) {
  const total = contratos.length;
  const valorTotal = contratos.reduce((s, c) => s + c.valor, 0);
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const cancelados = contratos.filter((c) => c.status === "Cancelado");
  const valorAssinado = assinados.reduce((s, c) => s + c.valor, 0);
  const valorPend = pendentes.reduce((s, c) => s + c.valor, 0);
  const valorCanc = cancelados.reduce((s, c) => s + c.valor, 0);
  const ticket = valorAssinado / Math.max(assinados.length, 1);

  // Comparativo Propostas (volume cadastrado) × Contratos
  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0);
  const valorPropostas = volume.reduce((s, v) => s + v.valor, 0);
  const conversaoPct = (assinados.length / Math.max(totalPropostas, 1)) * 100;
  const conversaoValor = (valorAssinado / Math.max(valorPropostas, 1)) * 100;

  // Comparativo mensal (propostas vs assinados — usando volume + contratos por mês)
  const comparativo = useMemo(() => {
    return volume.map((v) => {
      const ass = contratos.filter((c) => {
        const m = new Date(c.data).getMonth();
        return c.status === "Assinado" && MESES[m] === v.mes;
      });
      const valAss = ass.reduce((s, c) => s + c.valor, 0);
      return {
        mes: v.mes,
        propostas: v.qtd,
        contratos: ass.length,
        valorPropostas: v.valor,
        valorContratos: valAss,
        conversao: v.qtd > 0 ? (ass.length / v.qtd) * 100 : 0,
      };
    });
  }, [volume, contratos]);

  const [openModal, setOpenModal] = useState<null | "gerados" | "assinados" | "pendentes" | "cancelados" | "valor" | "ticket">(null);

  const updateStatus = (id: string, status: string) => {
    setContratos(contratos.map((c) => (c.id === id ? { ...c, status } : c)));
    toast.success(`${id} → ${status}`);
  };

  // KPIs adicionais essenciais
  const kwpTotal = assinados.reduce((s, c) => s + (Number(c.kwp) || 0), 0);
  const valorPorKwp = kwpTotal > 0 ? valorAssinado / kwpTotal : 0;
  const taxaCancelamento = total > 0 ? (cancelados.length / total) * 100 : 0;
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();
  const contratosMes = assinados.filter((c) => {
    const d = new Date(c.dataAssinatura ?? c.data);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  const valorMes = contratosMes.reduce((s, c) => s + c.valor, 0);
  const rankConsultor = useMemo(() => {
    const map = new Map<string, { qtd: number; valor: number }>();
    assinados.forEach((c) => {
      const k = c.vendedor || "—";
      const cur = map.get(k) ?? { qtd: 0, valor: 0 };
      map.set(k, { qtd: cur.qtd + 1, valor: cur.valor + c.valor });
    });
    return [...map.entries()].sort((a, b) => b[1].valor - a[1].valor)[0];
  }, [assinados]);
  const topConsultorNome = rankConsultor?.[0] ?? "—";
  const topConsultorValor = rankConsultor?.[1].valor ?? 0;

  return (
    <>
      {/* KPIs comparativos */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Propostas (mês a mês)</div>
          <div className="mt-1 flex items-baseline gap-2"><div className="text-2xl font-bold text-primary">{totalPropostas}</div><div className="text-xs text-muted-foreground">{fmtBRL(valorPropostas)}</div></div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos assinados</div>
          <div className="mt-1 flex items-baseline gap-2"><div className="text-2xl font-bold text-success">{assinados.length}</div><div className="text-xs text-muted-foreground">{fmtBRL(valorAssinado)}</div></div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversão (qtd)</div>
          <div className="mt-1 text-2xl font-bold text-info">{conversaoPct.toFixed(1)}%</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-info" style={{ width: `${Math.min(conversaoPct,100)}%` }} /></div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversão (valor)</div>
          <div className="mt-1 text-2xl font-bold text-primary">{conversaoValor.toFixed(1)}%</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(conversaoValor,100)}%` }} /></div>
        </Card>
      </div>

      {/* KPIs essenciais adicionais */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sun className="h-3.5 w-3.5 text-warning" /> kWp assinado
          </div>
          <div className="mt-1 text-2xl font-bold text-warning">{kwpTotal.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{fmtBRL(valorPorKwp)} /kWp médio</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" /> Vendas no mês
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-bold text-primary">{contratosMes.length}</div>
            <div className="text-xs text-muted-foreground">{fmtBRL(valorMes)}</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <XCircle className="h-3.5 w-3.5 text-destructive" /> Taxa de cancelamento
          </div>
          <div className="mt-1 text-2xl font-bold text-destructive">{taxaCancelamento.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">{cancelados.length} de {total} contratos</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Award className="h-3.5 w-3.5 text-success" /> Top consultor
          </div>
          <div className="mt-1 truncate text-lg font-bold text-success">{topConsultorNome}</div>
          <div className="text-xs text-muted-foreground">{fmtBRL(topConsultorValor)}</div>
        </Card>
      </div>


      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Contratos Gerados" value={total} hint={fmtBRL(valorTotal)} icon={FileText} tone="primary" trend={{ value: "100%", positive: true }} onView={() => setOpenModal("gerados")} />
        <StatCard label="Assinados" value={`${assinados.length} (${((assinados.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorAssinado)} icon={CheckCircle2} tone="success" onView={() => setOpenModal("assinados")} />
        <StatCard label="Pendentes" value={`${pendentes.length} (${((pendentes.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorPend)} icon={Clock} tone="warning" onView={() => setOpenModal("pendentes")} />
        <StatCard label="Cancelados" value={`${cancelados.length} (${((cancelados.length/Math.max(total,1))*100).toFixed(1)}%)`} hint={fmtBRL(valorCanc)} icon={XCircle} tone="destructive" onView={() => setOpenModal("cancelados")} />
        <StatCard label="Valor Assinado" value={fmtBRL(valorAssinado)} hint={`${assinados.length} contratos`} icon={DollarSign} tone="success" onView={() => setOpenModal("valor")} />
        <StatCard label="Ticket Médio" value={fmtBRL(ticket)} hint={`média ${assinados.length} assin.`} icon={TrendingUp} tone="info" onView={() => setOpenModal("ticket")} />
      </div>

      <DetailContratosModal
        open={openModal !== null}
        onClose={() => setOpenModal(null)}
        title={
          openModal === "assinados" ? "Contratos assinados" :
          openModal === "pendentes" ? "Contratos pendentes" :
          openModal === "cancelados" ? "Contratos cancelados" :
          openModal === "valor" ? "Ranking por valor assinado" :
          openModal === "ticket" ? "Análise de ticket médio" :
          "Todos os contratos gerados"
        }
        contratos={
          openModal === "assinados" ? assinados :
          openModal === "pendentes" ? pendentes :
          openModal === "cancelados" ? cancelados :
          openModal === "valor" ? [...assinados].sort((a, b) => b.valor - a.valor) :
          openModal === "ticket" ? assinados :
          contratos
        }
        showTicketSummary={openModal === "ticket"}
        onUpdateStatus={updateStatus}
      />

      {/* Comparativo Propostas × Contratos */}
      <Card className="mt-5 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-primary" /> Propostas × Contratos por mês</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={comparativo}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${v.toFixed(0)}%`} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="propostas" fill="var(--chart-1)" radius={[4,4,0,0]} name="Propostas" />
            <Bar yAxisId="left" dataKey="contratos" fill="var(--chart-2)" radius={[4,4,0,0]} name="Contratos assinados" />
            <Line yAxisId="right" type="monotone" dataKey="conversao" stroke="var(--chart-5)" strokeWidth={2.5} name="Conversão %" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Top vendedores + meta */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Top vendedores</div>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>#</TableHead><TableHead>Vendedor</TableHead>
              <TableHead className="text-center">Contratos</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ticket</TableHead>
              <TableHead className="text-right">kWp</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead className="text-right">Part.</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {[...vendedoresList].sort((a,b)=>b.vendido-a.vendido).map((v, i) => {
                const part = (v.vendido / Math.max(vendedoresList.reduce((s,x)=>s+x.vendido,0),1)) * 100;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-bold text-primary">{i+1}</TableCell>
                    <TableCell className="font-medium">{v.nome}</TableCell>
                    <TableCell className="text-center">{v.contratos}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(v.vendido)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(v.vendido / Math.max(v.contratos,1))}</TableCell>
                    <TableCell className="text-right">{v.kwp.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{v.conversao}%</TableCell>
                    <TableCell className="text-right text-primary">{part.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Ranking visual</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vendedoresList.map(v => ({ nome: v.nome.split(" ")[0], valor: v.vendido }))} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="nome" type="category" stroke="var(--muted-foreground)" fontSize={11} width={70} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-3 text-sm font-semibold">Valor vendido mensal</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={evolucaoMensal}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}

function DetailContratosModal({
  open, onClose, title, contratos, showTicketSummary, onUpdateStatus,
}: {
  open: boolean; onClose: () => void; title: string; contratos: Contrato[];
  showTicketSummary?: boolean; onUpdateStatus: (id: string, status: string) => void;
}) {
  const total = contratos.length;
  const valor = contratos.reduce((s,c)=>s+c.valor, 0);
  const ticket = valor / Math.max(total, 1);
  const maior = contratos.reduce((m,c)=>c.valor>m?c.valor:m, 0);
  const menor = contratos.reduce((m,c)=>c.valor<m?c.valor:m, contratos[0]?.valor ?? 0);

  return (
    <Dialog open={open} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {total} contrato{total!==1?"s":""} · Valor total {fmtBRL(valor)}
          </DialogDescription>
        </DialogHeader>

        {showTicketSummary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Ticket médio</div><div className="text-lg font-bold text-primary">{fmtBRL(ticket)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Maior venda</div><div className="text-lg font-bold text-success">{fmtBRL(maior)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Menor venda</div><div className="text-lg font-bold">{fmtBRL(menor)}</div></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-[10px] uppercase text-muted-foreground">Contratos</div><div className="text-lg font-bold">{total}</div></div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Banco</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {contratos.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                <TableCell className="font-medium">{c.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                <TableCell className="text-right">{c.kwp.toFixed(1)}</TableCell>
                <TableCell className="text-muted-foreground">{c.banco}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-muted-foreground">{c.data}</TableCell>
              </TableRow>
            ))}
            {total===0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum contrato</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- NEGOCIAÇÃO (Propostas + Contratos unificados) ---------------- */

type LinhaNeg = {
  tipo: "Proposta" | "Contrato";
  id: string; cliente: string; vendedor: string; valor: number; kwp: number;
  status: string; data: string;
};

function NegociacaoTab({
  contratos, setContratos, propostas, setPropostas,
}: {
  contratos: Contrato[]; setContratos: (v: Contrato[]) => void;
  propostas: Proposta[]; setPropostas: (v: Proposta[]) => void;
}) {
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "Proposta" | "Contrato">("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const linhas = useMemo<LinhaNeg[]>(() => {
    const ps: LinhaNeg[] = propostas.map((p) => ({ tipo: "Proposta", id: p.id, cliente: p.cliente, vendedor: p.vendedor, valor: p.valor, kwp: p.kwp, status: p.status, data: p.data }));
    const cs: LinhaNeg[] = contratos.map((c) => ({ tipo: "Contrato", id: c.id, cliente: c.cliente, vendedor: c.vendedor, valor: c.valor, kwp: c.kwp, status: c.status, data: c.data }));
    return [...ps, ...cs].sort((a, b) => b.data.localeCompare(a.data));
  }, [propostas, contratos]);

  const allStatuses = useMemo(() => Array.from(new Set(linhas.map((l) => l.status))), [linhas]);

  const filtered = linhas.filter((l) =>
    (tipoFiltro === "todos" || l.tipo === tipoFiltro) &&
    (statusFiltro === "todos" || l.status === statusFiltro) &&
    [l.id, l.cliente, l.vendedor].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  const totalPropostas = propostas.length;
  const valorPropostas = propostas.reduce((s, p) => s + p.valor, 0);
  const totalContratos = contratos.length;
  const valorContratos = contratos.reduce((s, c) => s + c.valor, 0);

  const updateStatus = (l: LinhaNeg, status: string) => {
    if (l.tipo === "Proposta") {
      setPropostas(propostas.map((p) => (p.id === l.id ? { ...p, status } : p)));
    } else {
      setContratos(contratos.map((c) => (c.id === l.id ? { ...c, status } : c)));
    }
    toast.success(`${l.id} → ${status}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Propostas" value={totalPropostas} hint={fmtBRL(valorPropostas)} icon={FileText} tone="info" />
        <StatCard label="Contratos" value={totalContratos} hint={fmtBRL(valorContratos)} icon={CheckCircle2} tone="primary" />
        <StatCard label="Conversão" value={`${((totalContratos / Math.max(totalPropostas + totalContratos, 1)) * 100).toFixed(1)}%`} hint="contratos / total" icon={Percent} tone="success" />
        <StatCard label="Ticket médio (geral)" value={fmtBRL((valorPropostas + valorContratos) / Math.max(totalPropostas + totalContratos, 1))} icon={TrendingUp} tone="warning" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por id, cliente ou vendedor" className="pl-9" />
          </div>
          <Select value={tipoFiltro} onValueChange={(v: "todos" | "Proposta" | "Contrato") => setTipoFiltro(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="Proposta">Propostas</SelectItem>
              <SelectItem value="Contrato">Contratos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Tipo</TableHead><TableHead>ID</TableHead><TableHead>Cliente</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Status</TableHead><TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={`${l.tipo}-${l.id}`}>
                <TableCell><span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${l.tipo === "Contrato" ? "bg-primary/15 text-primary" : "bg-info/15 text-info"}`}>{l.tipo}</span></TableCell>
                <TableCell className="font-mono text-xs text-primary">{l.id}</TableCell>
                <TableCell className="font-medium">{l.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{l.vendedor}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(l.valor)}</TableCell>
                <TableCell className="text-right">{l.kwp.toFixed(1)}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                <TableCell className="text-muted-foreground">{l.data}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Select value={l.status} onValueChange={(v) => updateStatus(l, v)}>
                    <SelectTrigger className="h-8 w-40 inline-flex"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {l.tipo === "Contrato" ? (
                        <>
                          <SelectItem value="Gerado">Gerado</SelectItem>
                          <SelectItem value="Assinado">Assinado</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Em negociação">Em negociação</SelectItem>
                          <SelectItem value="Enviada">Enviada</SelectItem>
                          <SelectItem value="Aguardando retorno">Aguardando retorno</SelectItem>
                          <SelectItem value="Convertida">Convertida</SelectItem>
                          <SelectItem value="Fechada">Fechada</SelectItem>
                          <SelectItem value="Recusada">Recusada</SelectItem>
                          <SelectItem value="Perdida">Perdida</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">{filtered.length} de {linhas.length} registros</div>
      </Card>
    </div>
  );
}

/* ---------------- VOLUME MENSAL ---------------- */

function VolumeMensalTab({
  volume, setVolume, contratos,
}: { volume: VolumeMes[]; setVolume: (v: VolumeMes[]) => void; contratos: Contrato[] }) {
  const totalQtd = volume.reduce((s, v) => s + v.qtd, 0);
  const totalValor = volume.reduce((s, v) => s + v.valor, 0);
  const ticket = totalValor / Math.max(totalQtd, 1);
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const conv = (assinados.length / Math.max(totalQtd, 1)) * 100;

  const remove = (id: string) => { setVolume(volume.filter((v) => v.id !== id)); toast.success("Removido"); };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total propostas (mês a mês)" value={totalQtd} icon={FileText} tone="info" />
        <StatCard label="Valor total propostas" value={fmtBRL(totalValor)} icon={DollarSign} tone="primary" />
        <StatCard label="Ticket médio proposta" value={fmtBRL(ticket)} icon={TrendingUp} tone="warning" />
        <StatCard label="Conversão para contrato" value={`${conv.toFixed(1)}%`} hint={`${assinados.length} assinados`} icon={Percent} tone="success" />
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Volume mensal — quantidade × valor</div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={volume}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="qtd" fill="var(--chart-1)" radius={[4,4,0,0]} name="Qtd propostas" />
            <Line yAxisId="right" type="monotone" dataKey="valor" stroke="var(--chart-2)" strokeWidth={2.5} name="Valor total" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="text-sm font-semibold">Lançamentos mensais</div>
          <NovoVolumeDialog onSave={(v) => setVolume([...volume.filter((x) => !(x.mes === v.mes && x.ano === v.ano)), v].sort((a,b) => (a.ano - b.ano) || (MESES.indexOf(a.mes) - MESES.indexOf(b.mes))))} />
        </div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Mês</TableHead><TableHead>Ano</TableHead>
            <TableHead className="text-right">Qtd propostas</TableHead>
            <TableHead className="text-right">Valor total</TableHead>
            <TableHead className="text-right">Ticket médio</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {volume.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.mes}</TableCell>
                <TableCell className="text-muted-foreground">{v.ano}</TableCell>
                <TableCell className="text-right font-semibold">{v.qtd}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{fmtBRL(v.valor)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.valor / Math.max(v.qtd, 1))}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {volume.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum lançamento</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function NovoVolumeDialog({ onSave }: { onSave: (v: VolumeMes) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mes: "Jan", ano: new Date().getFullYear(), qtd: "", valor: "" });
  const submit = () => {
    const qtd = Number(form.qtd);
    const valor = Number(form.valor);
    if (!qtd || qtd < 0 || valor < 0) { toast.error("Informe quantidade e valor válidos"); return; }
    onSave({ id: `V-${Date.now()}`, mes: form.mes, ano: Number(form.ano), qtd, valor });
    toast.success("Volume salvo");
    setForm({ mes: "Jan", ano: new Date().getFullYear(), qtd: "", valor: "" });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Lançar mês</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Lançar volume do mês</DialogTitle><DialogDescription>Cadastre quantidade total de propostas e o valor total do mês.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Mês</Label>
            <Select value={form.mes} onValueChange={(v) => setForm({ ...form, mes: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Ano</Label><Input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Quantidade de propostas</Label><Input type="number" value={form.qtd} onChange={(e) => setForm({ ...form, qtd: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Valor total (R$)</Label><Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- CADASTRAR CONTRATO ---------------- */

function nextContratoId(contratos: Contrato[]): string {
  const ano = new Date().getFullYear();
  const sufixo = `/${ano}`;
  const nums = contratos
    .map((c) => {
      // suporta tanto novo formato "090/2026" quanto antigo "CT-2026-0143"
      const m = c.id.match(/^(\d{1,4})\s*\/\s*\d{4}$/) ?? c.id.match(/(\d+)\s*$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${String(next).padStart(3, "0")}${sufixo}`;
}

/** Faixas de comissão definidas pelo parâmetro (R$/kWp). */
function comissaoFromParametro(parametro: number): { pct: number | null; aprovacao: boolean } {
  if (!isFinite(parametro) || parametro <= 0) return { pct: null, aprovacao: false };
  if (parametro < 2000) return { pct: null, aprovacao: true };
  if (parametro <= 2100) return { pct: 3, aprovacao: false };
  if (parametro <= 2300) return { pct: 4, aprovacao: false };
  if (parametro <= 2449) return { pct: 5, aprovacao: false };
  return { pct: 6, aprovacao: false };
}

/* ---------------- CLIENTE PICKER + NOVO CLIENTE ---------------- */

function ClientePicker({ value, onPick }: { value?: string; onPick: (c: ClienteRecord) => void }) {
  const clientes = useClientesFull();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clientes.slice(0, 10);
    return clientes.filter((c) =>
      c.nome.toLowerCase().includes(s) ||
      (c.doc ?? "").toLowerCase().includes(s) ||
      (c.cidade ?? "").toLowerCase().includes(s),
    ).slice(0, 20);
  }, [q, clientes]);
  const selecionado = clientes.find((c) => c.id === value);

  return (
    <>
      <div className="space-y-1.5">
        <Label>Cliente *</Label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={open ? q : (selecionado?.nome ?? q)}
              placeholder="Buscar cliente por nome, CPF/CNPJ ou cidade…"
              onFocus={() => setOpen(true)}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            {open && filtrados.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {filtrados.map((c) => (
                  <button
                    type="button" key={c.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onPick(c); setOpen(false); setQ(""); }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {c.doc || "—"} · {c.cidade}/{c.uf} · {c.telefone || "—"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => setNovoOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </div>
      <NovoClienteDialog open={novoOpen} onClose={() => setNovoOpen(false)} onCreated={(c) => { onPick(c); setNovoOpen(false); }} />
    </>
  );
}

function NovoClienteDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: ClienteRecord) => void }) {
  const [f, setF] = useState({
    nome: "", doc: "", telefone: "", email: "",
    cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const lookupCEP = async (cep: string) => {
    set("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    const r = await buscarCEP(cep);
    if (r) setF((p) => ({ ...p, rua: r.rua ?? p.rua, bairro: r.bairro ?? p.bairro, cidade: r.cidade ?? p.cidade, uf: r.uf ?? p.uf }));
  };
  const salvar = () => {
    if (!f.nome.trim()) { toast.error("Informe o nome"); return; }
    if (f.doc && !isDocValid(f.doc)) { toast.error("CPF/CNPJ inválido"); return; }
    if (f.telefone && !isTelValid(f.telefone)) { toast.error("Telefone inválido"); return; }
    if (f.doc) {
      const dup = findClienteByDoc(f.doc);
      if (dup) {
        toast.error(`CPF/CNPJ já cadastrado (${dup.nome}). Selecione o cliente existente ou edite os dados em Cadastros > Clientes.`);
        return;
      }
    }
    try {
      const c = addClienteFull({ ...f, nome: f.nome.trim() });
      toast.success(`Cliente cadastrado: ${c.nome}`);
      onCreated(c);
      setF({ nome: "", doc: "", telefone: "", email: "", cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "" });
    } catch (e) {
      if (e instanceof DuplicateClienteError) {
        toast.error(`CPF/CNPJ já cadastrado (${e.existing.nome}). Selecione o cliente existente ou edite em Cadastros > Clientes.`);
      } else throw e;
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0 gap-0">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Novo cliente</DialogTitle>
                <DialogDescription className="text-xs">Cadastro rápido — E-mail é opcional. Use o CEP para preencher endereço.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4" style={{ maxHeight: "calc(92vh - 140px)" }}>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Identificação</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2"><Label>Nome / Razão social *</Label>
                <Input value={f.nome} onChange={(e) => set("nome", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>CPF / CNPJ *</Label>
                <Input value={f.doc} onChange={(e) => set("doc", maskDoc(e.target.value))} maxLength={18} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5"><Label>Telefone *</Label>
                <Input value={f.telefone} onChange={(e) => set("telefone", maskTel(e.target.value))} maxLength={15} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>E-mail (opcional)</Label>
                <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Endereço</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5"><Label>CEP</Label>
                <Input value={f.cep} onChange={(e) => lookupCEP(e.target.value)} maxLength={10} placeholder="69000-000" />
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>Rua</Label>
                <Input value={f.rua} onChange={(e) => set("rua", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Número</Label>
                <Input value={f.numero} onChange={(e) => set("numero", e.target.value)} maxLength={10} />
              </div>
              <div className="space-y-1.5"><Label>Bairro</Label>
                <Input value={f.bairro} onChange={(e) => set("bairro", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>Complemento</Label>
                <Input value={f.complemento} onChange={(e) => set("complemento", e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>Cidade</Label>
                <Input value={f.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label>UF</Label>
                <Input value={f.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} maxLength={2} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={salvar} className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Cadastrar cliente</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function CadastrarContratoTab({
  contratos, setContratos, vendedoresList,
}: { contratos: Contrato[]; setContratos: (c: Contrato[]) => void; vendedoresList: Vendedor[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const proximo = nextContratoId(contratos);
  const emptyCliente: ClienteFull = {
    nome: "", doc: "", telefone: "", telefone2: "", email: "",
    cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "",
  };
  const [form, setForm] = useState({
    dataCadastro: today, dataAssinatura: "",
    valor: "", vendedor: "",
    modulosContrato: "", potenciaContrato: "550",
    inv1: "", inv2: "", inv3: "", inv4: "", inv5: "", inv6: "",
    pagamento: "", banco: "", obs: "",
    possuiFinanciamento: "Não" as "Sim" | "Não",
    finBanco: "BASA" as string,
    finValor: "",
    finGerente: "",
    finStatus: "Em análise",
    finObs: "",
  });
  const [cli, setCli] = useState<ClienteFull>(emptyCliente);
  const [clienteId, setClienteId] = useState<string>("");
  
  const [cepLoading, setCepLoading] = useState(false);

  const setCliField = (k: keyof ClienteFull, v: string) => setCli((p) => ({ ...p, [k]: v }));
  const lookupCEP = async (cep: string) => {
    setCliField("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const r = await buscarCEP(cep);
    setCepLoading(false);
    if (r) {
      setCli((p) => ({ ...p, ...r } as ClienteFull));
      toast.success("Endereço preenchido pelo CEP");
    } else { toast.error("CEP não encontrado"); }
  };

  const pickCliente = (c: ClienteRecord) => {
    setClienteId(c.id);
    setCli({
      nome: c.nome, doc: c.doc ?? "", telefone: c.telefone ?? "", telefone2: "",
      email: c.email ?? "",
      cep: c.cep ?? "", rua: c.rua ?? "", numero: c.numero ?? "", bairro: c.bairro ?? "",
      complemento: c.complemento ?? "", cidade: c.cidade ?? "", uf: c.uf ?? "",
    });
    toast.success(`Cliente ${c.nome} selecionado`);
  };

  const valorNum = Number(form.valor) || 0;
  const modulosNum = Number(form.modulosContrato) || 0;
  const potenciaNum = Number(form.potenciaContrato) || 0;
  const kwpEsperado = (modulosNum * potenciaNum) / 1000;
  const parametroNum = kwpEsperado > 0 ? valorNum / kwpEsperado : 0;
  const parametroFmt = parametroNum > 0 ? String(Math.round(parametroNum)) : "";
  const { pct: comissaoPct, aprovacao } = comissaoFromParametro(parametroNum);
  const comissaoValor = comissaoPct != null ? (valorNum * comissaoPct) / 100 : 0;

  const [openForm, setOpenForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"cliente" | "contrato">("cliente");
  const [submitting, setSubmitting] = useState(false);

  const limpar = () => {
    setForm({
      dataCadastro: today, dataAssinatura: "", valor: "", vendedor: "",
      modulosContrato: "", potenciaContrato: "550",
      inv1: "", inv2: "", inv3: "", inv4: "", inv5: "", inv6: "",
      pagamento: "", banco: "", obs: "",
      possuiFinanciamento: "Não", finBanco: "BASA", finValor: "", finGerente: "", finStatus: "Em análise", finObs: "",
    });
    setCli(emptyCliente);
    setClienteId("");
    
    setActiveTab("cliente");
  };

  const buildContrato = (): Contrato => {
    const novoId = nextContratoId(contratos);
    return {
      id: novoId,
      cliente: cli.nome.trim() || "—",
      clienteId: clienteId || undefined,
      vendedor: form.vendedor,
      valor: valorNum,
      kwp: kwpEsperado,
      status: "Pendente de informações",
      data: form.dataCadastro || today,
      pagamento: form.pagamento,
      banco: form.banco,
      modulos: modulosNum,
      obs: form.obs,
      potencia: potenciaNum,
      inv1: form.inv1, inv2: form.inv2, inv3: form.inv3,
      inv4: form.inv4, inv5: form.inv5, inv6: form.inv6,
      parametro: parametroFmt,
      dataCadastro: form.dataCadastro || today,
      dataAssinatura: form.dataAssinatura,
      comissaoPct: comissaoPct ?? 0,
      comissaoValor,
      possuiFinanciamento: form.possuiFinanciamento === "Sim",

      clienteFull: { ...cli, nome: cli.nome.trim() },
      projetos: [{
        id: `${novoId}-01`,
        contratoId: novoId,
        tipo: "Projeto 1",
        endereco: cli.rua || "",
        numero: cli.numero || "",
        bairro: cli.bairro || "",
        cep: cli.cep || "",
        cidade: cli.cidade || "",
        uf: cli.uf || "",
        modulos: modulosNum,
        potenciaModuloW: potenciaNum,
        kwp: kwpEsperado,
        inversor: form.inv1 || "",
        inv2: form.inv2, inv3: form.inv3, inv4: form.inv4, inv5: form.inv5, inv6: form.inv6,
        equipe: "",
        status: "Em projeto/aprovação",
        inicio: form.dataCadastro || today,
        previsto: "",
        obs: "",
        cronograma: "",
        valor: valorNum,
        aprovado: false,
        enviadoEngenharia: false,
        financeiroGerado: false,
      }],
      
      auditoria: [{
        id: `A-${Date.now()}`, data: new Date().toISOString(),
        usuario: "Operador", campo: "criação", de: "", para: novoId,
      }],
    };
  };

  // Validação ao vivo (para mostrar pendências e travar botão)
  const previewContrato = buildContrato();
  const validation = validateContratoCompleto(previewContrato, { requireComposicao: false });

  const submit = () => {
    if (submitting) return; // bloqueio anti-duplo-clique
    if (aprovacao) { toast.error("Parâmetro abaixo de 2000 — necessária aprovação da diretoria"); return; }
    if (cli.doc && !isDocValid(cli.doc)) { toast.error("CPF/CNPJ inválido"); return; }
    if (cli.telefone && !isTelValid(cli.telefone)) { toast.error("Telefone inválido"); return; }
    // Se não selecionou cliente existente, valida duplicidade pelo CPF/CNPJ informado
    if (!clienteId && cli.doc) {
      const dup = findClienteByDoc(cli.doc);
      if (dup) {
        toast.error(`CPF/CNPJ já cadastrado (${dup.nome}). Selecione o cliente existente em vez de criar novo.`);
        return;
      }
    }
    if (!validation.ok) {
      toast.error(`Não foi possível salvar. Preencha: ${validation.missing.slice(0, 5).join(", ")}${validation.missing.length > 5 ? "…" : ""}`);
      return;
    }
    setSubmitting(true);
    try {
      const novoId = nextContratoId(contratos);
      // Backend-guard: se já existir um contrato com este ID (corrida de duplo clique), aborta.
      if (contratos.some((c) => c.id === novoId)) {
        toast.error("Contrato já cadastrado. Aguarde antes de tentar novamente.");
        return;
      }
      const novo = { ...previewContrato, id: novoId, status: "Em análise" };
      upsertContrato(novo);
      toast.success(`Contrato ${novo.id} cadastrado · status Em análise. Defina os projetos no lápis e aprove para enviar à Engenharia${novo.possuiFinanciamento ? " e Financiamentos" : ""}.`);
      limpar();
      setOpenForm(false);
    } finally {
      setTimeout(() => setSubmitting(false), 800);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Cadastro de contratos</div>
            <div className="text-xs text-muted-foreground">Próximo nº: <span className="font-mono text-primary">{proximo}</span> · Hoje: {today} · Nasce como <b>Pendente</b>; projetos e financeiro são adicionados no lápis.</div>
          </div>
          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={() => setOpenForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar contrato
          </Button>
        </div>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent
          className="max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Novo contrato</DialogTitle>
                  <DialogDescription className="text-xs">
                    Nº <span className="font-mono font-semibold text-primary">{proximo}</span> · Cadastro {today} · será criado como <b>Pendente</b>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(92vh - 140px)" }}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-5">
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="cliente" className="gap-2"><Users className="h-4 w-4" /> 1. Cliente</TabsTrigger>
                <TabsTrigger value="contrato" className="gap-2"><FileText className="h-4 w-4" /> 2. Contrato</TabsTrigger>
              </TabsList>

              <TabsContent value="cliente" className="mt-0 space-y-4">
                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <ClientePicker value={clienteId} onPick={pickCliente} />
                </div>
                <div className="rounded-lg border bg-card p-5">
                  <div className="mb-4 flex items-center gap-2 border-b pb-3">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Dados do cliente</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>CPF / CNPJ</Label>
                      <Input value={cli.doc} onChange={(e) => setCliField("doc", maskDoc(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" maxLength={18} />
                      {cli.doc && !isDocValid(cli.doc) && <p className="text-[10px] text-destructive">CPF (11) ou CNPJ (14 dígitos)</p>}
                    </div>
                    <div className="space-y-1.5"><Label>Telefone</Label>
                      <Input value={cli.telefone} onChange={(e) => setCliField("telefone", maskTel(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} />
                      {cli.telefone && !isTelValid(cli.telefone) && <p className="text-[10px] text-destructive">DDD (2) + 9 dígitos</p>}
                    </div>
                    <div className="space-y-1.5"><Label>Telefone 2</Label>
                      <Input value={cli.telefone2 ?? ""} onChange={(e) => setCliField("telefone2", maskTel(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2"><Label>E-mail</Label>
                      <Input type="email" value={cli.email} onChange={(e) => setCliField("email", e.target.value)} maxLength={120} />
                    </div>
                    <div className="space-y-1.5"><Label>CEP {cepLoading && <span className="text-xs text-muted-foreground">(buscando…)</span>}</Label>
                      <Input value={cli.cep} onChange={(e) => lookupCEP(e.target.value)} placeholder="69000-000" maxLength={10} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2"><Label>Rua</Label>
                      <Input value={cli.rua} onChange={(e) => setCliField("rua", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>Número</Label>
                      <Input value={cli.numero} onChange={(e) => setCliField("numero", e.target.value)} maxLength={10} />
                    </div>
                    <div className="space-y-1.5"><Label>Bairro</Label>
                      <Input value={cli.bairro} onChange={(e) => setCliField("bairro", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>Complemento</Label>
                      <Input value={cli.complemento} onChange={(e) => setCliField("complemento", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>Cidade</Label>
                      <Input value={cli.cidade} onChange={(e) => setCliField("cidade", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label>UF</Label>
                      <Input value={cli.uf} onChange={(e) => setCliField("uf", e.target.value.toUpperCase())} maxLength={2} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contrato" className="mt-0 space-y-4">
                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Identificação</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5"><Label>Nº contrato (auto)</Label>
                      <Input value={proximo} readOnly className="bg-muted font-mono" />
                    </div>
                    <div className="space-y-1.5"><Label>Vendedor</Label>
                      <Select value={form.vendedor} onValueChange={(v) => setForm({ ...form, vendedor: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar vendedor da base" /></SelectTrigger>
                        <SelectContent>{vendedoresList.map((v) => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Data cadastro</Label>
                      <Input type="date" value={form.dataCadastro} onChange={(e) => setForm({ ...form, dataCadastro: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>Data assinatura</Label>
                      <Input type="date" value={form.dataAssinatura} onChange={(e) => setForm({ ...form, dataAssinatura: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">Valores e comissão</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Valor da venda (R$)</Label>
                      <Input
                        inputMode="numeric"
                        value={valorNum > 0 ? fmtBRL(valorNum) : ""}
                        placeholder="R$ 0,00"
                        onChange={(e) => {
                          const cents = e.target.value.replace(/\D/g, "");
                          const reais = cents ? (Number(cents) / 100).toString() : "";
                          setForm({ ...form, valor: reais });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5"><Label>Parâmetro</Label>
                      <Input value={parametroFmt} readOnly className="bg-muted font-mono" />
                    </div>
                    <div className="space-y-1.5"><Label>Comissão (auto)</Label>
                      {aprovacao ? (
                        <Input value="APROVAÇÃO DIRETORIA" readOnly className="bg-destructive/10 font-bold text-destructive" />
                      ) : (
                        <Input value={comissaoPct != null ? `${comissaoPct.toFixed(2)}% · ${fmtBRL(comissaoValor)}` : ""} readOnly className="bg-muted font-semibold text-primary" />
                      )}
                    </div>
                  </div>
                  {parametroNum > 0 && (
                    <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold">Faixas de comissão:</span> &lt;2000 = aprovação diretoria · 2000–2100 = 3% · 2101–2300 = 4% · 2301–2449 = 5% · 2450+ = 6%
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">Dados técnicos do contrato</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Qtd módulos (contrato)</Label>
                      <Input type="number" value={form.modulosContrato} onChange={(e) => setForm({ ...form, modulosContrato: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>Potência/módulo (W)</Label>
                      <Input type="number" value={form.potenciaContrato} onChange={(e) => setForm({ ...form, potenciaContrato: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label>kWp esperado</Label>
                      <Input value={kwpEsperado.toFixed(2)} readOnly className="bg-muted font-mono" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-medium text-muted-foreground">Inversores (até 6)</div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {(["inv1","inv2","inv3","inv4","inv5","inv6"] as const).map((k, idx) => (
                        <div key={k} className="space-y-1.5"><Label className="text-xs">Inversor {idx + 1}</Label>
                          <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={idx === 0 ? "Modelo / potência" : "Opcional"} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">Observações</span>
                  </div>
                  <div className="space-y-1.5"><Label>Observações</Label>
                    <Textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} placeholder="Observações do contrato" rows={3} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">A composição financeira é tratada no módulo <b>Financeiro</b>, separadamente do Comercial.</div>
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">Financiamento bancário</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Possui financiamento?</Label>
                      <Select value={form.possuiFinanciamento} onValueChange={(v) => setForm({ ...form, possuiFinanciamento: v as "Sim" | "Não" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Não">Não</SelectItem>
                          <SelectItem value="Sim">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.possuiFinanciamento === "Sim" && (
                      <div className="md:col-span-3 text-[11px] text-muted-foreground rounded border border-primary/30 bg-primary/5 p-2">
                        Marcado como financiado. O contrato só será enviado para <b>Financiamentos &gt; Pendências</b> após a <b>aprovação</b>.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
                  <b className="text-foreground">Próximos passos:</b> ao salvar o contrato vai para <b>Em análise</b>. Use o botão <b>Validar</b> e depois <b>Aprovar</b> — após aprovado, os projetos seguem direto para a <b>Engenharia</b>. O Financeiro é tratado separadamente.
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t bg-muted/30 px-6 py-3 space-y-2">
            {!validation.ok && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive">
                <b>Pendente:</b> {validation.missing.join(" · ")}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpenForm(false)}>Fechar</Button>
              <Button variant="outline" onClick={limpar} disabled={submitting}>Limpar</Button>
              <Button
                className="bg-primary text-primary-foreground"
                onClick={submit}
                disabled={aprovacao || !validation.ok || submitting}
              >
                {submitting ? (
                  <><span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> Cadastrando…</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> Cadastrar contrato</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="border-b border-border p-4 text-sm font-semibold">Últimos contratos cadastrados</div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
            <TableHead className="text-right">kWp</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Parâmetro</TableHead>
            <TableHead className="text-right">% Com.</TableHead>
            <TableHead className="text-right">R$ Comissão</TableHead>
            <TableHead className="text-center">Projetos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {contratos.slice(0, 12).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                <TableCell className="font-medium">{c.cliente}</TableCell>
                <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
                <TableCell className="text-right">{(c.kwp ?? 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{c.parametro || "—"}</TableCell>
                <TableCell className="text-right">{c.comissaoPct ? `${c.comissaoPct}%` : "—"}</TableCell>
                <TableCell className="text-right text-primary">{c.comissaoValor ? fmtBRL(c.comissaoValor) : "—"}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-bold text-primary">
                    {c.projetos?.length ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={c.status} />
                    {c.status === "Aprovado" && (() => {
                      const pend = (c.projetos ?? []).filter((p) => !p.aprovado);
                      if (pend.length === 0) return null;
                      return (
                        <span className="inline-flex w-fit items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning" title="Aprove os projetos no lápis > aba Projetos">
                          <Clock className="h-3 w-3" /> {pend.length === 1 ? "Projeto pendente" : `${pend.length} projetos pendentes`}
                        </span>
                      );
                    })()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ValidarContratoButton contrato={c} />
                    <AprovarContratoButton contrato={c} />
                    <EditarContratoDialog contrato={c} vendedoresList={vendedoresList} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------------- VALIDAR / APROVAR CONTRATO ---------------- */

function ValidarContratoButton({ contrato }: { contrato: Contrato }) {
  if (contrato.status === "Aprovado" || contrato.status === "Pronto para aprovação" || contrato.status === "Cancelado") return null;
  const validar = () => {
    const r = validateContratoCompleto(contrato, { requireComposicao: false });
    if (r.ok) {
      updateContratoAudit(contrato.id, { status: "Pronto para aprovação" });
      toast.success(`Contrato ${contrato.id} validado · pronto para aprovação`);
    } else {
      updateContratoAudit(contrato.id, { status: "Pendente de informações" });
      toast.error(`Faltam: ${r.missing.join(" · ")}`, { duration: 6000 });
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 text-xs" title="Validar contrato" onClick={validar}>
      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Validar
    </Button>
  );
}

function SolicitarAlteracaoButton({ contrato }: { contrato: Contrato }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const enviar = () => {
    if (motivo.trim().length < 5) { toast.error("Descreva o motivo (mínimo 5 caracteres)"); return; }
    solicitarAlteracaoContrato(contrato.id, motivo.trim(), "Operador", {});
    toast.success("Solicitação registrada na auditoria");
    setMotivo(""); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs"><History className="mr-1 h-3.5 w-3.5" /> Solicitar alteração</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar alteração — {contrato.id}</DialogTitle>
          <DialogDescription>O contrato está aprovado. Informe o motivo da alteração; ficará registrado na auditoria com data, hora e usuário.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Motivo</Label>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} placeholder="Descreva o motivo da alteração" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={enviar}>Registrar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AprovarContratoButton({ contrato }: { contrato: Contrato }) {
  const [open, setOpen] = useState(false);
  if (contrato.status === "Aprovado" || contrato.status === "Cancelado") return null;
  const liberado = contrato.status === "Pronto para aprovação";
  const cli = contrato.clienteFull;
  const aprovar = () => {
    const r = validateContratoCompleto(contrato, { requireComposicao: false });
    if (!r.ok) {
      toast.error(`Não pode aprovar. Faltam: ${r.missing.join(", ")}`);
      return;
    }
    updateContratoAudit(contrato.id, { status: "Aprovado" });
    if (contrato.possuiFinanciamento) {
      addPendencia({
        id: contrato.id,
        cliente: contrato.clienteFull?.nome || contrato.cliente,
        vendedor: contrato.vendedor,
        valor: contrato.valor,
        kwp: contrato.kwp,
        dataCadastro: contrato.dataCadastro || contrato.data,
        status: "Pendente",
      });
      toast.success(`Contrato ${contrato.id} aprovado · enviado a Financiamentos. Envie cada projeto à Engenharia individualmente.`);
    } else {
      toast.success(`Contrato ${contrato.id} aprovado. Envie cada projeto à Engenharia individualmente.`);
    }
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-7 px-2 text-xs bg-success text-success-foreground hover:opacity-90"
          disabled={!liberado}
          title={liberado ? "Aprovar contrato" : "Use Validar primeiro"}
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprovar contrato {contrato.id}</DialogTitle>
          <DialogDescription>
            Confirmar aprovação deste contrato? Após aprovado, dados estruturais terão controle de alteração.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <div><b>Cliente:</b> {cli?.nome || contrato.cliente}</div>
          <div><b>Nº contrato:</b> <span className="font-mono">{contrato.id}</span></div>
          <div><b>Valor:</b> {fmtBRL(contrato.valor)}</div>
          <div><b>Potência contratada:</b> {(contrato.kwp ?? 0).toFixed(2)} kWp · {contrato.modulos ?? 0} mód</div>
          <div><b>Forma de pagamento:</b> {contrato.pagamento || "—"}{contrato.banco ? ` · ${contrato.banco}` : ""}</div>
          <div><b>Vendedor:</b> {contrato.vendedor}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-success text-success-foreground" onClick={aprovar}>Confirmar aprovação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- EDITAR CONTRATO + PROJETOS + AUDITORIA ---------------- */

function EditarContratoDialog({ contrato, vendedoresList, open: openProp, onOpenChange, hideTrigger, lockDados }: { contrato: Contrato; vendedoresList: Vendedor[]; open?: boolean; onOpenChange?: (o: boolean) => void; hideTrigger?: boolean; lockDados?: boolean }) {
  const [openInner, setOpenInner] = useState(false);
  const open = openProp ?? openInner;
  const setOpen = (o: boolean) => { onOpenChange ? onOpenChange(o) : setOpenInner(o); };
  const [tab, setTab] = useState<"dados" | "cliente" | "projetos" | "auditoria">(lockDados ? "projetos" : "cliente");
  const [f, setF] = useState<Contrato>(contrato);
  const [cli, setCli] = useState<ClienteFull>(contrato.clienteFull ?? {
    nome: contrato.cliente, doc: "", telefone: "", telefone2: "", email: "",
    cep: "", rua: "", numero: "", bairro: "", complemento: "", cidade: "", uf: "",
  });
  const [cepLoading, setCepLoading] = useState(false);

  // Recálculo automático: parâmetro (R$/kWp) e comissão sempre que valor/módulos/potência/kWp mudam.
  const _modulos = Number(f.modulos) || 0;
  const _potW = Number(f.potencia) || 0;
  const _kwpCalc = (_modulos * _potW) / 1000;
  const _kwp = _kwpCalc > 0 ? Number(_kwpCalc.toFixed(2)) : (Number(f.kwp) || 0);
  const _valor = Number(f.valor) || 0;
  const _parametroNum = _kwp > 0 ? _valor / _kwp : 0;
  const _parametroFmt = _parametroNum > 0 ? String(Math.round(_parametroNum)) : "";
  const _comissaoCalc = comissaoFromParametro(_parametroNum);
  const _comissaoPct = _comissaoCalc.pct ?? 0;
  const _comissaoValor = _comissaoCalc.pct != null ? (_valor * _comissaoCalc.pct) / 100 : 0;
  const _valorPorKwp = _kwp > 0 ? _valor / _kwp : 0;

  const setCliField = (k: keyof ClienteFull, v: string) => setCli((p) => ({ ...p, [k]: v }));
  const lookupCEP = async (cep: string) => {
    setCliField("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const r = await buscarCEP(cep);
    setCepLoading(false);
    if (r) setCli((p) => ({ ...p, ...r } as ClienteFull));
  };

  const salvar = () => {
    // valida CPF/CNPJ e telefone se preenchidos
    if (cli.doc && !isDocValid(cli.doc)) { toast.error("CPF deve ter 11 dígitos ou CNPJ 14 dígitos"); return; }
    if (cli.telefone && !isTelValid(cli.telefone)) { toast.error("Telefone deve ter DDD (2) + 9 dígitos"); return; }
    if (cli.telefone2 && !isTelValid(cli.telefone2)) { toast.error("Telefone 2 inválido"); return; }

    const aprovouAgora = f.status === "Aprovado" && contrato.status !== "Aprovado";

    updateContratoAudit(contrato.id, {
      vendedor: f.vendedor, valor: _valor, kwp: _kwp,
      status: f.status, data: f.data, dataCadastro: f.dataCadastro ?? f.data,
      dataAssinatura: f.dataAssinatura, banco: f.banco, obs: f.obs,
      modulos: _modulos, potencia: _potW,
      inv1: f.inv1, inv2: f.inv2, inv3: f.inv3,
      inv4: f.inv4, inv5: f.inv5, inv6: f.inv6,
      parametro: _parametroFmt,
      comissaoPct: _comissaoPct,
      comissaoValor: _comissaoValor,
      possuiFinanciamento: !!f.possuiFinanciamento,
      clienteFull: cli,
    });

    // Se aprovou agora, NÃO envia projetos automaticamente. O envio à Engenharia
    // é manual, por projeto, na aba "3. Projetos" (botão "Aprovar projeto").
    if (aprovouAgora) {
      if (f.possuiFinanciamento) {
        addPendencia({
          id: contrato.id,
          cliente: cli.nome || contrato.cliente,
          vendedor: f.vendedor || contrato.vendedor,
          valor: _valor,
          kwp: _kwp,
          dataCadastro: f.dataCadastro ?? f.data ?? contrato.data,
          status: "Pendente",
        });
        toast.success(`Contrato ${contrato.id} aprovado · enviado a Financiamentos. Envie cada projeto à Engenharia individualmente.`);
      } else {
        toast.success(`Contrato ${contrato.id} aprovado. Envie cada projeto à Engenharia individualmente.`);
      }
    } else {
      toast.success(`Contrato ${contrato.id} atualizado · auditoria registrada`);
    }
    // Mantém modal aberto — fechar somente via Fechar/X/Cancelar.
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar"><SquarePen className="h-3.5 w-3.5" /></Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar contrato <span className="font-mono text-primary">{contrato.id}</span></DialogTitle>
          <DialogDescription>Edite dados, cliente, desdobre em projetos e veja auditoria.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cliente">1. Cliente</TabsTrigger>
            <TabsTrigger value="dados">2. Dados do contrato</TabsTrigger>
            <TabsTrigger value="projetos">3. Projetos ({contrato.projetos?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="auditoria"><History className="mr-1 h-3.5 w-3.5" /> Auditoria ({contrato.auditoria?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            {lockDados && (
              <div className="mb-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
                <b>Visualização somente.</b> O contrato já está assinado — edição de dados bloqueada nesta etapa. Use a aba <b>3. Projetos</b> para aprovar e enviar os projetos à Engenharia.
              </div>
            )}
            {contrato.status === "Aprovado" && !lockDados && (
              <div className="mb-3 flex items-center justify-between rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs">
                <span className="text-success font-medium">Contrato aprovado · campos estruturais bloqueados.</span>
                <SolicitarAlteracaoButton contrato={contrato} />
              </div>
            )}
            <fieldset disabled={lockDados} className="contents">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Cliente (vinculado)</Label>
                <Input value={f.cliente} readOnly className="bg-muted" />
                <p className="text-[10px] text-muted-foreground">Para alterar dados do cliente, vá em <b>Cadastros &gt; Clientes</b>.</p>
              </div>
              <div className="space-y-1.5"><Label>Vendedor</Label>
                <Select value={f.vendedor} onValueChange={(v) => setF({ ...f, vendedor: v })} disabled={contrato.status === "Aprovado"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{vendedoresList.map((v) => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={f.status} onValueChange={(v) => {
                  if (v === "Aprovado" && f.status !== "Aprovado") {
                    const r = validateContratoCompleto(contrato, { requireComposicao: false });
                    if (!r.ok) { toast.error(`Faltam: ${r.missing.join(", ")}`); return; }
                    if (!window.confirm(`Aprovar contrato ${contrato.id}?\n\nApós aprovado, dados estruturais terão controle de alteração.`)) return;
                  }
                  setF({ ...f, status: v });
                }} disabled={contrato.status === "Aprovado"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pendente de informações", "Em análise", "Pronto para aprovação", "Aprovado", "Cancelado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Data cadastro</Label>
                <Input type="date" value={f.data ?? ""} onChange={(e) => setF({ ...f, data: e.target.value, dataCadastro: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>Data assinatura</Label>
                <Input type="date" value={f.dataAssinatura ?? ""} onChange={(e) => setF({ ...f, dataAssinatura: e.target.value })} />
              </div>
              {/* Forma de pagamento e Banco foram movidos para a aba "Composição". */}
              <div className="space-y-1.5"><Label>Valor (R$)</Label>
                <Input type="number" value={f.valor} disabled={contrato.status === "Aprovado"} onChange={(e) => setF({ ...f, valor: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5"><Label>Módulos</Label>
                <Input type="number" value={f.modulos ?? 0} disabled={contrato.status === "Aprovado"} onChange={(e) => {
                  const m = Number(e.target.value) || 0;
                  const w = Number(f.potencia) || 0;
                  setF({ ...f, modulos: m, kwp: Number(((m * w) / 1000).toFixed(2)) });
                }} />
              </div>
              <div className="space-y-1.5"><Label>Potência módulo (W)</Label>
                <Input type="number" value={f.potencia ?? 0} disabled={contrato.status === "Aprovado"} onChange={(e) => {
                  const w = Number(e.target.value) || 0;
                  const m = Number(f.modulos) || 0;
                  setF({ ...f, potencia: w, kwp: Number(((m * w) / 1000).toFixed(2)) });
                }} />
              </div>
              <div className="space-y-1.5"><Label>kWp total (auto)</Label>
                <Input type="number" step="0.01" value={_kwp} readOnly className="bg-muted font-mono" />
              </div>
              <div className="space-y-1.5"><Label>Parâmetro (R$/kWp)</Label>
                <Input value={_parametroFmt || "—"} readOnly className="bg-muted font-mono" />
              </div>
              <div className="space-y-1.5"><Label>Valor por kWp</Label>
                <Input value={_valorPorKwp > 0 ? fmtBRL(_valorPorKwp) : "—"} readOnly className="bg-muted font-mono" />
              </div>
              <div className="space-y-1.5"><Label>Comissão</Label>
                <Input
                  value={_comissaoCalc.pct != null ? `${_comissaoCalc.pct.toFixed(2)}% · ${fmtBRL(_comissaoValor)}` : (_comissaoCalc.aprovacao ? "Necessita aprovação" : "—")}
                  readOnly
                  className="bg-muted font-semibold text-primary"
                />
              </div>
              {(["inv1","inv2","inv3","inv4","inv5","inv6"] as const).map((k, i) => (
                <div key={k} className="space-y-1.5"><Label>Inversor {i + 1}</Label>
                  <Input value={(f as any)[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value } as any)} />
                </div>
              ))}
              <div className="space-y-1.5 md:col-span-3"><Label>Observações</Label>
                <Textarea value={f.obs ?? ""} onChange={(e) => setF({ ...f, obs: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 rounded-md border border-border bg-card p-3 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Financiamento bancário</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5"><Label>Possui financiamento?</Label>
                  <Select value={f.possuiFinanciamento ? "Sim" : "Não"} onValueChange={(v) => setF({ ...f, possuiFinanciamento: v === "Sim" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {f.possuiFinanciamento && (
                  <div className="md:col-span-3 text-[11px] text-muted-foreground rounded border border-primary/30 bg-primary/5 p-2">
                    Contrato encaminhado para <b>Financiamentos &gt; Pendências</b>. Banco, gerente, valor e status são definidos pelo setor de Financiamentos.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Aprovação para Engenharia</div>
                  <div className="text-xs text-muted-foreground">Apenas contratos <b>Aprovados</b> e projetos <b>liberados</b> aparecem na Engenharia. O <b>Financeiro</b> é tratado separadamente, sem vínculo automático no Comercial.</div>
                </div>
                <AprovarEnviarDialog contrato={contrato} />
              </div>
            </div>
            </fieldset>
          </TabsContent>

          <TabsContent value="cliente" className="mt-4">
            <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <b className="text-primary">Visualização somente.</b> Os dados do cliente vinculado ao contrato não podem ser editados aqui. Para alterar, acesse <b>Cadastros &gt; Clientes</b> — a alteração será refletida em todos os contratos vinculados.
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2"><Label>Nome</Label>
                <Input value={cli.nome} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>CPF / CNPJ</Label>
                <Input value={cli.doc} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>Telefone</Label>
                <Input value={cli.telefone} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>Telefone 2</Label>
                <Input value={cli.telefone2 ?? ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>E-mail</Label>
                <Input type="email" value={cli.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>CEP</Label>
                <Input value={cli.cep} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>Rua</Label>
                <Input value={cli.rua} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>Número</Label>
                <Input value={cli.numero} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>Bairro</Label>
                <Input value={cli.bairro} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>Complemento</Label>
                <Input value={cli.complemento} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>Cidade</Label>
                <Input value={cli.cidade} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5"><Label>UF</Label>
                <Input value={cli.uf} disabled className="bg-muted" />
              </div>
            </div>
          </TabsContent>


          <TabsContent value="projetos" className="mt-4">
            <ProjetosManager contrato={contrato} />
          </TabsContent>

          <TabsContent value="auditoria" className="mt-4">
            <Card className="p-3">
              {(contrato.auditoria ?? []).length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma alteração registrada.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data/hora</TableHead><TableHead>Usuário</TableHead>
                    <TableHead>Campo</TableHead><TableHead>De</TableHead><TableHead>Para</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[...(contrato.auditoria ?? [])].reverse().map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{new Date(a.data).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{a.usuario}</TableCell>
                        <TableCell className="font-medium">{a.campo}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[180px] truncate">{a.de || "—"}</TableCell>
                        <TableCell className="text-primary max-w-[180px] truncate">{a.para || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-5">
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          {tab === "dados" && !lockDados && (
            <Button className="bg-primary text-primary-foreground" onClick={salvar}>Salvar alterações</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



function AprovarEnviarDialog({ contrato }: { contrato: Contrato }) {
  const [open, setOpen] = useState(false);
  const projetos = contrato.projetos ?? [];
  const [sel, setSel] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(projetos.map((p) => [p.id, !p.enviadoEngenharia])),
  );

  // Quotas do contrato vs soma dos projetos selecionados + já liberados
  const valorContrato = Number(contrato.valor) || 0;
  const modulosContrato = Number(contrato.modulos) || 0;
  const ativos = projetos.filter((p) => p.enviadoEngenharia || sel[p.id]);
  const somaValor = ativos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const somaMod = ativos.reduce((s, p) => s + (Number(p.modulos) || 0), 0);
  const excedeValor = valorContrato > 0 && somaValor - valorContrato > 0.5;
  const excedeMod = modulosContrato > 0 && somaMod > modulosContrato;
  const algumLiberado = ativos.length > 0;

  const aprovar = () => {
    if (!algumLiberado) { toast.error("Selecione ao menos 1 projeto para liberar."); return; }
    if (excedeValor) { toast.error(`Soma de valores (${fmtBRL(somaValor)}) excede o contrato (${fmtBRL(valorContrato)}).`); return; }
    if (excedeMod) { toast.error(`Soma de módulos (${somaMod}) excede o contrato (${modulosContrato}).`); return; }
    if (contrato.status !== "Aprovado") {
      updateContratoAudit(contrato.id, { status: "Aprovado" });
    }
    const liberados = Object.entries(sel).filter(([, v]) => v).map(([id]) => id);
    liberados.forEach((id) => {
      updateProjeto(contrato.id, id, { enviadoEngenharia: true });
    });
    toast.success(`Contrato aprovado · ${liberados.length} projeto(s) liberado(s) para a Engenharia`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-success text-success-foreground hover:opacity-90">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aprovar contrato {contrato.id}</DialogTitle>
          <DialogDescription>
            Selecione os projetos a liberar para a Engenharia. A soma de valor e módulos não pode exceder o contrato. O Financeiro é tratado separadamente, sem vínculo automático aqui.
          </DialogDescription>
        </DialogHeader>
        <div className={`rounded-md border p-2 text-xs ${(excedeValor || excedeMod) ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Valor: <b className="font-mono">{fmtBRL(somaValor)}</b> / {fmtBRL(valorContrato)}</span>
            <span>Módulos: <b className="font-mono">{somaMod}</b> / {modulosContrato}</span>
            {(excedeValor || excedeMod) && <span className="text-destructive font-semibold">Excede o contrato</span>}
          </div>
        </div>
        {projetos.length > 0 && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {projetos.map((p) => (
              <label key={p.id} className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${sel[p.id] || p.enviadoEngenharia ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="checkbox" className="mt-1" checked={!!sel[p.id] || !!p.enviadoEngenharia} disabled={p.enviadoEngenharia} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="font-mono text-primary">{p.id}</span>
                    <span>{p.tipo || "Projeto"}</span>
                    {p.enviadoEngenharia && <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">JÁ LIBERADO</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{p.endereco}{p.numero ? `, ${p.numero}` : ""} · {p.cidade}/{p.uf} · {p.modulos} mód · {p.kwp.toFixed(2)} kWp · <b>{fmtBRL(Number(p.valor) || 0)}</b></div>
                </div>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-success text-success-foreground" onClick={aprovar} disabled={excedeValor || excedeMod || !algumLiberado}>Aprovar e enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



type NovoProjForm = Omit<ProjetoVinculado, "id" | "contratoId">;

function emptyProjeto(contrato: Contrato, tipoLabel: string): NovoProjForm {
  return {
    tipo: tipoLabel,
    endereco: contrato.clienteFull?.rua ?? "",
    numero: contrato.clienteFull?.numero ?? "",
    bairro: contrato.clienteFull?.bairro ?? "",
    cep: contrato.clienteFull?.cep ?? "",
    cidade: contrato.clienteFull?.cidade ?? "",
    uf: contrato.clienteFull?.uf ?? "",
    modulos: contrato.modulos ?? 0,
    potenciaModuloW: contrato.potencia ?? 620,
    kwp: contrato.kwp ?? 0,
    inversor: contrato.inv1 ?? "",
    inv2: contrato.inv2 ?? "",
    inv3: contrato.inv3 ?? "",
    inv4: contrato.inv4 ?? "",
    inv5: contrato.inv5 ?? "",
    inv6: contrato.inv6 ?? "",
    equipe: "",
    status: "Em projeto/aprovação",
    inicio: "",
    previsto: "",
    obs: "",
    cronograma: "",
    enviadoEngenharia: false,
    valor: 0,
  };
}


function ConciliacaoCell({ label, contrato, soma, ok }: { label: string; contrato: string; soma: string; ok: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${ok ? "border-emerald-500/30 bg-card" : "border-destructive/40 bg-card"}`}>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Contrato</span>
        <span className="font-mono text-xs font-semibold">{contrato}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Projetos</span>
        <span className={`font-mono text-xs font-semibold ${ok ? "text-emerald-700" : "text-destructive"}`}>{soma}</span>
      </div>
    </div>
  );
}

function ProjetoEditCard({
  contrato, projeto, projetos, index, onAfterRemove,
}: {
  contrato: Contrato;
  projeto: ProjetoVinculado;
  projetos: ProjetoVinculado[];
  index: number;
  onAfterRemove: () => void;
}) {
  const [d, setD] = useState<ProjetoVinculado>(projeto);
  // Sincroniza quando o projeto subjacente mudar (ex: store atualizou após salvar/composição).
  useEffect(() => { setD(projeto); /* eslint-disable-next-line */ }, [projeto.id, projeto.aprovado, projeto.enviadoEngenharia]);
  const set = (k: keyof ProjetoVinculado, v: any) => setD((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(d) !== JSON.stringify(projeto);

  const lookupCEP = async (cep: string) => {
    set("cep", cep);
    if (cep.replace(/\D/g, "").length !== 8) return;
    const r = await buscarCEP(cep);
    if (r) setD((p) => ({ ...p, endereco: r.rua ?? p.endereco, bairro: r.bairro ?? p.bairro, cidade: r.cidade ?? p.cidade, uf: r.uf ?? p.uf }));
  };

  const salvar = () => {
    if (projeto.aprovado) {
      toast.error("Este projeto já foi aprovado e possui vínculos gerados. Para editar, remova primeiro os lançamentos financeiros e registros de Engenharia vinculados.");
      return;
    }
    if (!d.endereco?.trim()) { toast.error(`Projeto ${index + 1}: informe o endereço`); return; }
    if (!(Number(d.valor) > 0)) { toast.error(`Projeto ${index + 1}: informe o valor`); return; }
    const valorContrato = Number(contrato.valor) || 0;
    const somaOutros = projetos.filter((x) => x.id !== projeto.id).reduce((s, x) => s + (Number(x.valor) || 0), 0);
    if (valorContrato > 0 && somaOutros + Number(d.valor) - valorContrato > 0.5) {
      toast.error(`Soma dos projetos excederia o contrato (${fmtBRL(valorContrato)}).`);
      return;
    }
    const m = Number(d.modulos) || 0;
    const w = Number(d.potenciaModuloW) || 0;
    updateProjeto(contrato.id, projeto.id, { ...d, kwp: Number(((m * w) / 1000).toFixed(2)) });
    toast.success(`Projeto ${index + 1} (${projeto.id}) salvo · conciliação atualizada`);

    // Residual automático: se este é o último projeto e ainda sobra valor/módulos do contrato,
    // cria automaticamente o próximo projeto com o residual.
    const isUltimo = projetos[projetos.length - 1]?.id === projeto.id;
    if (isUltimo) {
      const residualValor = valorContrato - (somaOutros + Number(d.valor));
      const totalModC = Number(contrato.modulos) || 0;
      const somaModOutros = projetos.filter((x) => x.id !== projeto.id).reduce((s, x) => s + (Number(x.modulos) || 0), 0);
      const residualMod = totalModC - (somaModOutros + m);
      if (residualValor > 0.5) {
        const novo: NovoProjForm = {
          ...emptyProjeto(contrato, `Projeto ${projetos.length + 1}`),
          valor: Math.round(residualValor * 100) / 100,
          modulos: residualMod > 0 ? residualMod : 0,
          kwp: residualMod > 0 ? Number(((residualMod * w) / 1000).toFixed(2)) : 0,
          // Inversores em branco — usuário escolhe qual cobre o residual
          inversor: "", inv2: "", inv3: "", inv4: "", inv5: "", inv6: "",
          endereco: "", numero: "", bairro: "", cep: "", cidade: contrato.clienteFull?.cidade ?? "", uf: contrato.clienteFull?.uf ?? "",
        };
        addProjeto(contrato.id, novo);
        toast.info(`Residual de ${fmtBRL(residualValor)} → criado Projeto ${projetos.length + 1} automaticamente`, { duration: 5000 });
      }
    }
  };

  const kwpAuto = ((Number(d.modulos) || 0) * (Number(d.potenciaModuloW) || 0)) / 1000;

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="font-mono text-primary">{projeto.id}</span>
          {projeto.enviadoEngenharia
            ? <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">ENVIADO À ENGENHARIA</span>
            : <span className="text-[10px] rounded bg-warning/15 px-2 py-0.5 text-warning font-bold">PENDENTE</span>}
          {dirty && <span className="text-[10px] rounded bg-amber-500/15 px-2 py-0.5 text-amber-700 font-bold">ALTERAÇÕES NÃO SALVAS</span>}
        </div>
        <div className="flex items-center gap-2">
          {!projeto.aprovado && contrato.status === "Aprovado" && (
            <Button size="sm" className="bg-success text-success-foreground" onClick={() => {
              const faltam: string[] = [];
              if (!(Number(projeto.valor) > 0)) faltam.push("valor do projeto");
              if (!(Number(projeto.modulos) > 0)) faltam.push("módulos");
              if (!(Number(projeto.kwp) > 0)) faltam.push("potência (kWp)");
              if (!projeto.endereco?.trim()) faltam.push("endereço");
              if (!projeto.status?.trim()) faltam.push("status");
              const hasInvP = (x?: string) => { const t=(x??"").trim(); return t!=="" && t!=="0" && Number(t)!==0; };
              if (![projeto.inversor, projeto.inv2, projeto.inv3, projeto.inv4, projeto.inv5, projeto.inv6].some(hasInvP))
                faltam.push("ao menos 1 inversor");
              if (faltam.length) { toast.error(`Não é possível aprovar. Faltam: ${faltam.join(", ")}`); return; }
              const valorContrato = Number(contrato.valor) || 0;
              const somaProjs = (contrato.projetos ?? []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
              if (valorContrato > 0 && somaProjs - valorContrato > 0.5) {
                toast.error(`Projetos não conciliados (soma ${fmtBRL(somaProjs)} ≠ contrato ${fmtBRL(valorContrato)}).`);
                return;
              }
              if (!window.confirm(`Aprovar projeto ${projeto.id}?\n\nO projeto será liberado para a Engenharia.\nApós aprovado, a edição será bloqueada.`)) return;
              aprovarProjeto(contrato.id, projeto.id);
              toast.success(`Projeto ${projeto.id} aprovado · enviado à Engenharia`);
            }}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Aprovar projeto</Button>
          )}
          {projeto.aprovado && (
            <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">APROVADO · EDIÇÃO BLOQUEADA</span>
          )}
          {(() => {
            const isUltimo = projetos.length <= 1;
            const bloqueado = projeto.aprovado || isUltimo;
            const titulo = projeto.aprovado
              ? "Projeto aprovado: remova primeiro de Financiamento, Estoque e Engenharia"
              : isUltimo
                ? "É necessário manter ao menos 1 projeto no contrato"
                : "Remover projeto";
            return (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive disabled:opacity-40"
                disabled={bloqueado}
                title={titulo}
                onClick={() => {
                  if (bloqueado) return;
                  if (!window.confirm(`Remover ${projeto.id}?`)) return;
                  removeProjeto(contrato.id, projeto.id);
                  toast.success("Projeto removido");
                  onAfterRemove();
                }}
              ><Trash2 className="h-3.5 w-3.5" /></Button>
            );
          })()}
        </div>
      </div>
      {projeto.aprovado && (
        <div className="mb-3 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
          <b>Projeto aprovado · edição bloqueada.</b> Para alterar dados deste projeto, remova primeiro os registros de Engenharia vinculados. Apenas Admin Master pode reverter, com auditoria.
        </div>
      )}
      <fieldset disabled={projeto.aprovado} className="contents">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5"><Label>Tipo do projeto</Label>
          <Input value={d.tipo} onChange={(e) => set("tipo", e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>CEP</Label>
          <Input value={d.cep ?? ""} onChange={(e) => lookupCEP(e.target.value)} maxLength={10} />
        </div>
        <div className="space-y-1.5 flex items-end">
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground w-full">
            O status do projeto é definido pela Engenharia após o envio. Aqui, apenas defina os dados técnicos e do endereço.
          </div>
        </div>
        <div className="space-y-1.5 md:col-span-2"><Label>Endereço (rua)</Label>
          <Input value={d.endereco} onChange={(e) => set("endereco", e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>Número</Label>
          <Input value={d.numero ?? ""} onChange={(e) => set("numero", e.target.value)} maxLength={10} />
        </div>
        <div className="space-y-1.5"><Label>Bairro</Label>
          <Input value={d.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>Cidade</Label>
          <Input value={d.cidade} onChange={(e) => set("cidade", e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>UF</Label>
          <Input value={d.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} maxLength={2} />
        </div>
        <div className="space-y-1.5"><Label>Qtd módulos</Label>
          <Input type="number" value={d.modulos} onChange={(e) => set("modulos", Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5"><Label>Potência módulo (W)</Label>
          <Input type="number" value={d.potenciaModuloW} onChange={(e) => set("potenciaModuloW", Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5"><Label>kWp (auto)</Label>
          <Input value={kwpAuto.toFixed(2)} readOnly className="bg-muted font-mono" />
        </div>
        <div className="space-y-1.5"><Label>Valor do projeto (R$) *</Label>
          <Input type="number" step="0.01" value={d.valor ?? 0} onChange={(e) => set("valor", Number(e.target.value) || 0)} />
        </div>
        {([
          ["inversor", "Inversor 1"],
          ["inv2", "Inversor 2"],
          ["inv3", "Inversor 3"],
          ["inv4", "Inversor 4"],
          ["inv5", "Inversor 5"],
          ["inv6", "Inversor 6"],
        ] as const).map(([k, label]) => (
          <div key={k} className="space-y-1.5"><Label>{label}</Label>
            <Input value={(d as any)[k] ?? ""} onChange={(e) => set(k as any, e.target.value)} />
          </div>
        ))}
        <div className="space-y-1.5"><Label>Equipe</Label>
          <Input value={d.equipe} onChange={(e) => set("equipe", e.target.value)} placeholder="Equipe A, B…" />
        </div>
        <div className="space-y-1.5"><Label>Início previsto</Label>
          <Input type="date" value={d.inicio} onChange={(e) => set("inicio", e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>Conclusão prevista</Label>
          <Input type="date" value={d.previsto} onChange={(e) => set("previsto", e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-3"><Label>Observações</Label>
          <Textarea value={d.obs} onChange={(e) => set("obs", e.target.value)} />
        </div>
      </div>
      </fieldset>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Após aprovado, este projeto é enviado automaticamente para a Engenharia. O controle financeiro é feito separadamente no módulo Financeiro.
        </div>
        <Button className="bg-primary text-primary-foreground" onClick={salvar} disabled={!dirty || projeto.aprovado}>
          Salvar Projeto {index + 1}
        </Button>
      </div>
    </Card>
  );
}

function ProjetosManager({ contrato: contratoProp }: { contrato: Contrato }) {
  // Sempre puxar a versão MAIS recente do store.
  const todos = useContratos();
  const contrato = todos.find((c) => c.id === contratoProp.id) ?? contratoProp;
  const projetos = contrato.projetos ?? [];
  const [activeTab, setActiveTab] = useState<string>(projetos[0]?.id ?? "");

  useEffect(() => {
    if (projetos.length > 0 && !projetos.find((p) => p.id === activeTab)) {
      setActiveTab(projetos[0].id);
    }
    // eslint-disable-next-line
  }, [projetos.length]);

  const adicionarNovoProjeto = () => {
    const novo = emptyProjeto(contrato, `Projeto ${projetos.length + 1}`);
    addProjeto(contrato.id, novo);
    toast.success(`Projeto ${projetos.length + 1} adicionado · preencha e clique em Salvar Projeto ${projetos.length + 1}`);
    // O novo id segue o padrão `${contrato.id}-XX`; selecionamos após o re-render.
    const nextNum = String(projetos.length + 1).padStart(2, "0");
    setActiveTab(`${contrato.id}-${nextNum}`);
  };

  const somaProjetos = projetos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const valorContrato = Number(contrato.valor) || 0;
  const diff = valorContrato - somaProjetos;
  const bate = Math.abs(diff) <= 0.5;

  const somaModulos = projetos.reduce((s, p) => s + (Number(p.modulos) || 0), 0);
  const totalModulosCt = Number(contrato.modulos) || 0;
  const bateModulos = totalModulosCt === 0 || somaModulos === totalModulosCt;

  const somaKwp = projetos.reduce((s, p) => s + (Number(p.kwp) || 0), 0);
  const totalKwpCt = Number(contrato.kwp) || 0;
  const bateKwp = totalKwpCt === 0 || Math.abs(somaKwp - totalKwpCt) <= 0.05;

  const hasInv = (x?: string) => {
    const t = (x ?? "").trim();
    return t !== "" && t !== "0" && Number(t) !== 0;
  };
  const invsContrato = [contrato.inv1, contrato.inv2, contrato.inv3, contrato.inv4, contrato.inv5, contrato.inv6]
    .filter(hasInv).length;
  const invsProjetos = projetos.reduce(
    (s, p) => s + [p.inversor, p.inv2, p.inv3, p.inv4, p.inv5, p.inv6].filter(hasInv).length, 0,
  );
  const bateInversores = invsContrato === 0 || invsProjetos >= invsContrato;

  const tudoBate = bate && bateModulos && bateKwp && bateInversores;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground flex-1">
          Cada projeto é uma obra independente vinculada ao contrato {contrato.id}. Edite e salve cada projeto individualmente.
        </div>
        <Button variant="outline" size="sm" onClick={adicionarNovoProjeto}>
          <Plus className="mr-1 h-4 w-4" /> Novo projeto
        </Button>
      </div>
      {projetos.length > 0 && (
        <div className={`rounded-md border p-3 text-xs space-y-2 ${tudoBate ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
          <div className="grid gap-2 md:grid-cols-4">
            <ConciliacaoCell label="Valor" contrato={fmtBRL(valorContrato)} soma={fmtBRL(somaProjetos)} ok={bate} />
            <ConciliacaoCell label="Módulos" contrato={String(totalModulosCt)} soma={String(somaModulos)} ok={bateModulos} />
            <ConciliacaoCell label="kWp" contrato={totalKwpCt.toFixed(2)} soma={somaKwp.toFixed(2)} ok={bateKwp} />
            <ConciliacaoCell label="Inversores" contrato={String(invsContrato)} soma={String(invsProjetos)} ok={bateInversores} />
          </div>
          <div className={`text-[11px] font-semibold ${tudoBate ? "text-emerald-700" : "text-destructive"}`}>
            {tudoBate ? "✓ Valores batem. Projetos conciliados com o contrato." : "Pendente: soma dos projetos diferente do contrato."}
          </div>
        </div>
      )}

      {projetos.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum projeto vinculado ainda. Clique em <b>+ Novo projeto</b> para adicionar.
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            {projetos.map((p, i) => (
              <TabsTrigger key={p.id} value={p.id} className="text-xs">
                <span className="font-mono mr-1">{p.id.split("-").pop()}</span>
                {p.tipo || `Projeto ${i + 1}`}
                {p.enviadoEngenharia && <span className="ml-1 text-success">●</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          {projetos.map((p, i) => (
            <TabsContent key={p.id} value={p.id} className="mt-3">
              <ProjetoEditCard
                contrato={contrato}
                projeto={p}
                projetos={projetos}
                index={i}
                onAfterRemove={() => setActiveTab(projetos.find((x) => x.id !== p.id)?.id ?? "")}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

/* ---------------- VENDEDORES ---------------- */

function VendedoresTab({
  contratos, vendedoresList, setVendedoresList,
}: { contratos: Contrato[]; vendedoresList: Vendedor[]; setVendedoresList: (v: Vendedor[]) => void }) {
  const remove = (id: string) => { setVendedoresList(vendedoresList.filter((v) => v.id !== id)); toast.success("Vendedor removido"); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{vendedoresList.length} vendedor(es) cadastrado(s)</div>
        <NovoVendedorDialog onSave={(v) => setVendedoresList([...vendedoresList, v])} nextId={`VEN-${String(vendedoresList.length + 1).padStart(2, "0")}`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendedoresList.map((v) => {
          const meus = contratos.filter((c) => c.vendedor === v.nome);
          const valor = meus.reduce((s, c) => s + c.valor, 0);
          const ass = meus.filter((c) => c.status === "Assinado").length;
          const pct = (valor / Math.max(v.meta, 1)) * 100;
          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {v.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{v.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">{v.email}</div>
                </div>
                <StatusBadge status={v.status} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Contratos</div><div className="font-bold">{meus.length}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Assinados</div><div className="font-bold text-success">{ass}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Vendido</div><div className="font-bold text-primary">{fmtBRL(valor)}</div></div>
                <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Conversão</div><div className="font-bold">{v.conversao}%</div></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Meta {fmtBRL(v.meta)}</span><span className="font-semibold">{pct.toFixed(0)}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              </div>
              <div className="mt-3">
                <HistoricoVendedorDialog vendedor={v.nome} contratos={meus} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function HistoricoVendedorDialog({ vendedor, contratos }: { vendedor: string; contratos: Contrato[] }) {
  const [open, setOpen] = useState(false);
  const total = contratos.reduce((s, c) => s + c.valor, 0);
  const totalKwp = contratos.reduce((s, c) => s + c.kwp, 0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <FileText className="mr-2 h-3.5 w-3.5" /> Histórico de vendas ({contratos.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de vendas — {vendedor}</DialogTitle>
          <DialogDescription>
            {contratos.length} contrato(s) · Total {fmtBRL(total)} · {totalKwp.toFixed(2)} kWp
          </DialogDescription>
        </DialogHeader>
        {contratos.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhum contrato vinculado a este vendedor.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead>
              <TableHead className="text-right">kWp</TableHead><TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {[...contratos].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell>{c.cliente}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.data}</TableCell>
                  <TableCell className="text-right font-mono">{c.kwp.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(c.valor)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NovoVendedorDialog({ onSave, nextId }: { onSave: (v: Vendedor) => void; nextId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", meta: "", status: "Ativo" });
  const submit = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome"); return; }
    onSave({
      id: nextId, nome: form.nome.trim(), email: form.email.trim(),
      contratos: 0, vendido: 0, kwp: 0, conversao: 0,
      meta: Number(form.meta) || 0, status: form.status,
    });
    toast.success("Vendedor cadastrado");
    setForm({ nome: "", email: "", meta: "", status: "Ativo" });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo Vendedor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo Vendedor</DialogTitle><DialogDescription>Cadastre um novo vendedor da equipe comercial.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5"><Label>Nome completo</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Meta (R$)</Label><Input type="number" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- ANÁLISE EXECUTIVA ---------------- */

function AnaliseExecutivaTab({
  contratos, vendedoresList, volume,
}: { contratos: Contrato[]; vendedoresList: Vendedor[]; volume: VolumeMes[] }) {
  const total = contratos.reduce((s, c) => s + c.valor, 0);
  const mediaVendedor = vendedoresList.reduce((s,v)=>s+v.vendido,0) / Math.max(vendedoresList.length, 1);
  const baixo = vendedoresList.filter((v) => v.vendido < mediaVendedor);
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0);
  const assinados = contratos.filter((c) => c.status === "Assinado").length;
  const conv = (assinados / Math.max(totalPropostas, 1)) * 100;
  const projecao = total * 1.12;

  const alertas: { tipo: "warning" | "destructive" | "info"; titulo: string; descricao: string }[] = [
    { tipo: "warning", titulo: `${baixo.length} vendedor(es) abaixo da média`, descricao: baixo.map(v=>v.nome).join(", ") || "—" },
    { tipo: "destructive", titulo: `${pendentes.length} contrato(s) pendente(s)`, descricao: pendentes.length>0 ? `Valor parado: ${fmtBRL(pendentes.reduce((s,c)=>s+c.valor,0))}` : "Sem pendências críticas" },
    { tipo: "info", titulo: `Conversão propostas → contratos: ${conv.toFixed(1)}%`, descricao: conv >= 60 ? "Acima da meta operacional" : "Abaixo da meta — revisar funil" },
    { tipo: "info", titulo: `Projeção próximos 30 dias`, descricao: `${fmtBRL(projecao)} (+12% vs período atual)` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {alertas.map((a, i) => (
          <Card key={i} className="p-4">
            <div className={`mb-2 inline-flex items-center gap-1 text-xs font-semibold ${a.tipo==="destructive"?"text-destructive":a.tipo==="warning"?"text-warning":"text-info"}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> {a.titulo}
            </div>
            <div className="text-sm text-muted-foreground">{a.descricao}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Cumprimento de meta por vendedor</div>
        <div className="space-y-3">
          {[...vendedoresList].sort((a,b)=>b.vendido-a.vendido).map((v) => {
            const pct = (v.vendido / Math.max(v.meta, 1)) * 100;
            return (
              <div key={v.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{v.nome}</span>
                  <span className="text-muted-foreground">{fmtBRL(v.vendido)} / {fmtBRL(v.meta)} <span className={`ml-2 font-semibold ${pct>=100?"text-success":pct>=80?"text-info":"text-warning"}`}>{pct.toFixed(0)}%</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${pct>=100?"bg-success":pct>=80?"bg-info":"bg-warning"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Tendência mensal — valor vendido</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={evolucaoMensal}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="vendido" stroke="var(--chart-1)" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ---------------- INDICADORES (KPIs avançados) ---------------- */

const STATUS_COLORS: Record<string, string> = {
  Assinado: "var(--chart-2)",
  Pendente: "var(--chart-4)",
  Cancelado: "var(--chart-5)",
  Gerado: "var(--chart-1)",
};

// Série multi-ano simulada (2024 / 2025 / 2026 c/ projeção)
const SERIE_ANOS: { mes: string; "2024": number; "2025": number; "2026": number; projecao?: number }[] = [
  { mes: "Jan", "2024": 720000, "2025": 940000, "2026": 1240000 },
  { mes: "Fev", "2024": 810000, "2025": 1020000, "2026": 1580000 },
  { mes: "Mar", "2024": 880000, "2025": 1180000, "2026": 1920000 },
  { mes: "Abr", "2024": 960000, "2025": 1340000, "2026": 2410000 },
  { mes: "Mai", "2024": 1010000, "2025": 1420000, "2026": 1850000 },
  { mes: "Jun", "2024": 1090000, "2025": 1510000, "2026": 0, projecao: 2050000 },
  { mes: "Jul", "2024": 1180000, "2025": 1620000, "2026": 0, projecao: 2180000 },
  { mes: "Ago", "2024": 1240000, "2025": 1680000, "2026": 0, projecao: 2310000 },
  { mes: "Set", "2024": 1320000, "2025": 1740000, "2026": 0, projecao: 2440000 },
  { mes: "Out", "2024": 1410000, "2025": 1820000, "2026": 0, projecao: 2580000 },
  { mes: "Nov", "2024": 1490000, "2025": 1910000, "2026": 0, projecao: 2720000 },
  { mes: "Dez", "2024": 1580000, "2025": 2040000, "2026": 0, projecao: 2890000 },
];

export function IndicadoresTab({
  contratos, vendedoresList, propostas, volume,
}: { contratos: Contrato[]; vendedoresList: any[]; propostas: any[]; volume: VolumeMes[] }) {
  // === KPIs PRINCIPAIS ===
  const gerados = contratos;
  const assinados = contratos.filter((c) => c.status === "Assinado");
  const pendentes = contratos.filter((c) => c.status === "Pendente");
  const cancelados = contratos.filter((c) => c.status === "Cancelado");

  const sumValor = (arr: Contrato[]) => arr.reduce((s, c) => s + c.valor, 0);
  const sumKwp = (arr: Contrato[]) => arr.reduce((s, c) => s + c.kwp, 0);
  const sumModulos = (arr: Contrato[]) => arr.reduce((s, c) => s + (c.modulos ?? Math.round(c.kwp * 2)), 0);

  const totalGer = gerados.length;
  const valorGer = sumValor(gerados);
  const kwpGer = sumKwp(gerados);
  const kwhGer = kwpGer * 130 * 12; // estimativa kWh/ano (130 kWh/kWp.mês)

  const valorAss = sumValor(assinados);
  const kwpAss = sumKwp(assinados);
  const valorPend = sumValor(pendentes);
  const valorCanc = sumValor(cancelados);

  const pctAss = (assinados.length / Math.max(totalGer, 1)) * 100;
  const pctPend = (pendentes.length / Math.max(totalGer, 1)) * 100;
  const pctCanc = (cancelados.length / Math.max(totalGer, 1)) * 100;
  const ticket = valorAss / Math.max(assinados.length, 1);

  // === KPIs TÉCNICO/ENERGÉTICO ===
  const modulosTotal = sumModulos(assinados);
  const inversoresMedia = assinados.length > 0 ? (assinados.reduce((s, c) => s + Math.max(1, Math.ceil(c.kwp / 15)), 0) / assinados.length) : 0;
  const modulosMedia = modulosTotal / Math.max(assinados.length, 1);
  const potenciaMedia = kwpAss / Math.max(assinados.length, 1);
  const ticketKwp = valorAss / Math.max(kwpAss, 1);
  const valorPorModulo = valorAss / Math.max(modulosTotal, 1);
  const valorPorInversor = valorAss / Math.max(Math.ceil(inversoresMedia * assinados.length), 1);

  // === Indicadores adicionais (inspirados na planilha geral) ===
  const kwhMedio = potenciaMedia * 106.7136512; // kWh médio (kWp médio × fator)
  const parametroMedio = ticketKwp; // R$/kWp — parâmetro de venda
  const valorMedioVenda = assinados.length > 0 ? valorAss / assinados.length : 0;
  // Tempo médio (dias) — usa data do contrato como base
  const hoje = new Date();
  const diasDesde = (d: string) => Math.max(0, Math.round((hoje.getTime() - new Date(d).getTime()) / 86400000));
  const assComData = assinados.filter((c: any) => c.dataAssinatura);
  const tempoMedioAssinatura = assComData.length > 0
    ? assComData.reduce((s, c: any) => {
        const dias = Math.max(0, Math.round((new Date(c.dataAssinatura).getTime() - new Date(c.data).getTime()) / 86400000));
        return s + dias;
      }, 0) / assComData.length
    : (assinados.length > 0
        ? assinados.reduce((s, c) => s + Math.min(diasDesde(c.data), 30), 0) / assinados.length
        : 0);
  const tempoMedioPendente = pendentes.length > 0
    ? pendentes.reduce((s, c) => s + diasDesde(c.data), 0) / pendentes.length
    : 0;

  // Crescimento mensal/anual (com base em SERIE_ANOS)
  const ult2025 = SERIE_ANOS.reduce((s, m) => s + m["2025"], 0);
  const ult2024 = SERIE_ANOS.reduce((s, m) => s + m["2024"], 0);
  const ult2026Real = SERIE_ANOS.reduce((s, m) => s + m["2026"], 0);
  const cresAnual = ((ult2025 - ult2024) / Math.max(ult2024, 1)) * 100;
  const cresMensal = (() => {
    const meses = SERIE_ANOS.filter((m) => m["2026"] > 0);
    if (meses.length < 2) return 0;
    const ult = meses[meses.length - 1]["2026"];
    const pen = meses[meses.length - 2]["2026"];
    return ((ult - pen) / Math.max(pen, 1)) * 100;
  })();

  // Sazonalidade (média mensal 2024+2025)
  const sazonalidade = SERIE_ANOS.map((m) => ({ mes: m.mes, media: (m["2024"] + m["2025"]) / 2 }));

  // === KPIs POR VENDEDOR ===
  const porVendedor = vendedoresList.map((v) => {
    const meus = contratos.filter((c) => c.vendedor === v.nome);
    const ass = meus.filter((c) => c.status === "Assinado");
    const propsV = propostas.filter((p) => p.vendedor === v.nome);
    const valor = sumValor(ass);
    const kwp = sumKwp(ass);
    const ticketV = valor / Math.max(ass.length, 1);
    const conv = (ass.length / Math.max(propsV.length + ass.length, 1)) * 100;
    const maior = ass.reduce((m, c) => (c.valor > m ? c.valor : m), 0);
    const menor = ass.reduce((m, c) => (m === 0 || c.valor < m ? c.valor : m), 0);
    return { nome: v.nome, primeiro: v.nome.split(" ")[0], qtd: ass.length, valor, kwp, ticket: ticketV, conv, maior, menor, tempoMedio: 14 + Math.round(Math.random() * 12) };
  });
  const tempoMedioGeral = porVendedor.reduce((s, v) => s + v.tempoMedio, 0) / Math.max(porVendedor.length, 1);

  // === FUNIL ===
  const totalPropostas = volume.reduce((s, v) => s + v.qtd, 0) || propostas.length;
  const funil = [
    { name: "Propostas", value: totalPropostas, fill: "var(--chart-1)" },
    { name: "Gerados", value: totalGer, fill: "var(--chart-3)" },
    { name: "Pendentes", value: pendentes.length, fill: "var(--chart-4)" },
    { name: "Assinados", value: assinados.length, fill: "var(--chart-2)" },
    { name: "Cancelados", value: cancelados.length, fill: "var(--chart-5)" },
  ];

  // === PIZZA STATUS ===
  const pizza = [
    { name: "Assinados", value: assinados.length, fill: STATUS_COLORS.Assinado },
    { name: "Pendentes", value: pendentes.length, fill: STATUS_COLORS.Pendente },
    { name: "Cancelados", value: cancelados.length, fill: STATUS_COLORS.Cancelado },
  ].filter((p) => p.value > 0);

  const [openKpi, setOpenKpi] = useState<null | "gerados" | "assinados" | "pendentes" | "cancelados" | "ticket">(null);
  const listKpi =
    openKpi === "assinados" ? assinados :
    openKpi === "pendentes" ? pendentes :
    openKpi === "cancelados" ? cancelados :
    openKpi === "ticket" ? [...assinados].sort((a,b)=>b.valor-a.valor) :
    contratos;
  const titlesKpi: Record<string, string> = {
    gerados: "Contratos Gerados", assinados: "Contratos Assinados",
    pendentes: "Contratos Pendentes", cancelados: "Contratos Cancelados",
    ticket: "Análise de Ticket Médio",
  };

  return (
    <div className="space-y-5">
      {/* === KPIs PRINCIPAIS === */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><BarChart3 className="h-3.5 w-3.5 text-primary" /> KPIs Principais</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiBlock tone="primary" icon={FileText} label="Contratos Gerados" main={totalGer} sub={fmtBRL(valorGer)} extra={`${kwpGer.toFixed(1)} kWp · ${(kwhGer/1000).toFixed(0)} MWh/ano`} onView={() => setOpenKpi("gerados")} />
          <KpiBlock tone="success" icon={CheckCircle2} label="Assinados" main={assinados.length} sub={fmtBRL(valorAss)} extra={`${pctAss.toFixed(1)}% sobre gerados`} onView={() => setOpenKpi("assinados")} />
          <KpiBlock tone="warning" icon={Clock} label="Pendentes" main={pendentes.length} sub={fmtBRL(valorPend)} extra={`${pctPend.toFixed(1)}% sobre gerados`} onView={() => setOpenKpi("pendentes")} />
          <KpiBlock tone="destructive" icon={XCircle} label="Cancelados" main={cancelados.length} sub={fmtBRL(valorCanc)} extra={`${pctCanc.toFixed(1)}% cancelamento`} onView={() => setOpenKpi("cancelados")} />
          <KpiBlock tone="info" icon={TrendingUp} label="Ticket Médio" main={fmtBRL(ticket)} sub={`${assinados.length} assinados`} extra="por contrato assinado" onView={() => setOpenKpi("ticket")} />
        </div>
      </div>

      <Dialog open={openKpi !== null} onOpenChange={(v) => !v && setOpenKpi(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openKpi ? titlesKpi[openKpi] : ""}</DialogTitle>
            <DialogDescription>
              {listKpi.length} contrato(s) · Valor {fmtBRL(listKpi.reduce((s,c)=>s+c.valor,0))} · kWp {listKpi.reduce((s,c)=>s+c.kwp,0).toFixed(1)}
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">kWp</TableHead>
              <TableHead>Status</TableHead><TableHead>Data</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {listKpi.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-primary">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{c.vendedor}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(c.valor)}</TableCell>
                  <TableCell className="text-right">{c.kwp.toFixed(1)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{c.data}</TableCell>
                </TableRow>
              ))}
              {listKpi.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* === KPIs TÉCNICO/ENERGÉTICO === */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Sun className="h-3.5 w-3.5 text-warning" /> KPIs Técnico/Energético</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiSmall icon={Zap} label="kWp total vendido" value={`${kwpAss.toFixed(1)} kWp`} />
          <KpiSmall icon={Sun} label="kWh projetado/ano" value={`${(kwpAss * 130 * 12 / 1000).toFixed(1)} MWh`} />
          <KpiSmall icon={Activity} label="Módulos / contrato" value={modulosMedia.toFixed(1)} />
          <KpiSmall icon={Activity} label="Inversores / contrato" value={inversoresMedia.toFixed(1)} />
          <KpiSmall icon={Gauge} label="Potência média" value={`${potenciaMedia.toFixed(1)} kWp`} />
          <KpiSmall icon={DollarSign} label="Ticket por kWp" value={fmtBRL(ticketKwp)} />
          <KpiSmall icon={TrendingUp} label="Crescimento mensal" value={`${cresMensal>=0?"+":""}${cresMensal.toFixed(1)}%`} positive={cresMensal>=0} />
          <KpiSmall icon={TrendingUp} label="Crescimento anual" value={`${cresAnual>=0?"+":""}${cresAnual.toFixed(1)}%`} positive={cresAnual>=0} />
          <KpiSmall icon={Activity} label="Vendido 2026 (real)" value={fmtBRL(ult2026Real)} />
          <KpiSmall icon={Sun} label="kWh médio (mensal)" value={`${kwhMedio.toFixed(0)} kWh`} />
          <KpiSmall icon={Gauge} label="Parâmetro médio (R$/kWp)" value={fmtBRL(parametroMedio)} />
          <KpiSmall icon={DollarSign} label="Valor médio de venda" value={fmtBRL(valorMedioVenda)} />
          <KpiSmall icon={Clock} label="Tempo médio p/ assinatura" value={`${tempoMedioAssinatura.toFixed(1)} dias`} />
          <KpiSmall icon={Clock} label="Tempo médio pendente" value={`${tempoMedioPendente.toFixed(1)} dias`} />
        </div>
      </div>

      {/* === FUNIL + PIZZA === */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4 text-primary" /> Funil Comercial</div>
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Funnel dataKey="value" data={funil} isAnimationActive>
                <LabelList position="right" fill="var(--foreground)" stroke="none" dataKey="name" fontSize={12} />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={13} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Percent className="h-4 w-4 text-primary" /> Distribuição por Status</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} label={(e: { name: string; percent: number }) => `${e.name} ${(e.percent*100).toFixed(0)}%`}>
                {pizza.map((p, i) => <Cell key={i} fill={p.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* === EVOLUÇÃO MULTI-ANO === */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal — 2024 · 2025 · 2026 (com projeção)</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={SERIE_ANOS}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="2024" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="2025" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="2026" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="projecao" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Projeção 2026" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* === SAZONALIDADE === */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Sazonalidade — média mensal (2024-2025)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sazonalidade}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="media" fill="var(--chart-3)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* === BARRAS POR VENDEDOR (valor / contratos / kWp) === */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Performance por Vendedor</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={porVendedor}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="primeiro" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="valor" fill="var(--chart-1)" name="Valor R$" radius={[4,4,0,0]} />
            <Bar yAxisId="right" dataKey="qtd" fill="var(--chart-2)" name="Contratos" radius={[4,4,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="kwp" stroke="var(--chart-4)" strokeWidth={2.5} name="kWp" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* === TABELA DETALHADA POR VENDEDOR === */}
      <Card>
        <div className="border-b border-border p-4 text-sm font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Indicadores por Vendedor</div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">kWp</TableHead>
            <TableHead className="text-right">Ticket médio</TableHead>
            <TableHead className="text-right">Conversão</TableHead>
            <TableHead className="text-right">Maior venda</TableHead>
            <TableHead className="text-right">Menor venda</TableHead>
            <TableHead className="text-right">Tempo médio</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {porVendedor.map((v) => (
              <TableRow key={v.nome}>
                <TableCell className="font-medium">{v.nome}</TableCell>
                <TableCell className="text-center">{v.qtd}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{fmtBRL(v.valor)}</TableCell>
                <TableCell className="text-right">{v.kwp.toFixed(1)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.ticket)}</TableCell>
                <TableCell className="text-right text-info">{v.conv.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-success">{fmtBRL(v.maior)}</TableCell>
                <TableCell className="text-right">{fmtBRL(v.menor)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{v.tempoMedio} dias</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function KpiBlock({
  tone, icon: Icon, label, main, sub, extra, onView,
}: { tone: "primary"|"success"|"warning"|"destructive"|"info"; icon: React.ComponentType<{ className?: string }>; label: string; main: React.ReactNode; sub?: string; extra?: string; onView?: () => void }) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          {onView && <EyeButton onClick={onView} />}
        </div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneClass}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-2 text-2xl font-bold leading-tight">{main}</div>
      {sub && <div className="mt-0.5 text-sm font-medium text-muted-foreground">{sub}</div>}
      {extra && <div className="mt-1 text-[11px] text-muted-foreground">{extra}</div>}
    </Card>
  );
}

function KpiSmall({
  icon: Icon, label, value, positive,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; positive?: boolean }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 text-base font-bold ${positive===undefined?"":positive?"text-success":"text-destructive"}`}>{value}</div>
    </Card>
  );
}

// ============================================================
// Pedidos de venda — financeiro de cada projeto liberado
// ============================================================
function PedidosVendaTab({ contratos }: { contratos: Contrato[] }) {
  const aprovados = contratos.filter((c) => c.status === "Aprovado" && (c.projetos ?? []).length > 0);
  const [filtro, setFiltro] = useState("");

  const filtrados = aprovados.filter((c) => {
    const q = filtro.toLowerCase();
    if (!q) return true;
    return (
      c.id.toLowerCase().includes(q) ||
      c.cliente.toLowerCase().includes(q) ||
      (c.projetos ?? []).some((p) => p.id.toLowerCase().includes(q) || (p.tipo ?? "").toLowerCase().includes(q))
    );
  });

  const totalProjetos = aprovados.reduce((s, c) => s + (c.projetos ?? []).length, 0);
  const totalLiberados = aprovados.reduce(
    (s, c) => s + (c.projetos ?? []).filter((p) => p.aprovado).length, 0,
  );
  const totalPendentes = aprovados.reduce(
    (s, c) => s + (c.projetos ?? []).filter((p) => !p.aprovado).length, 0,
  );

  const liberarProjeto = (contrato: Contrato, projeto: ProjetoVinculado) => {
    if (contrato.status !== "Aprovado") { toast.error("Contrato não está aprovado."); return; }
    const valorProj = Number(projeto.valor) || 0;
    if (valorProj <= 0) { toast.error("Defina o valor do projeto."); return; }
    if (!projeto.endereco?.trim() || !projeto.cidade?.trim()) { toast.error("Endereço/cidade do projeto obrigatórios."); return; }
    if (!(Number(projeto.modulos) > 0)) { toast.error("Informe a quantidade de módulos."); return; }
    const hasInvP = (x?: string) => { const t=(x??"").trim(); return t!=="" && t!=="0" && Number(t)!==0; };
    if (![projeto.inversor, projeto.inv2, projeto.inv3, projeto.inv4, projeto.inv5, projeto.inv6].some(hasInvP)) {
      toast.error("Informe ao menos 1 inversor."); return;
    }
    if (!projeto.aprovado) {
      updateProjeto(contrato.id, projeto.id, {
        aprovado: true,
        dataAprovacao: new Date().toISOString(),
        usuarioAprovacao: "Operador",
        enviadoEngenharia: true,
      });
      toast.success(`Projeto ${projeto.id} liberado · enviado à Engenharia`);
    } else {
      updateProjeto(contrato.id, projeto.id, { enviadoEngenharia: true });
      toast.success(`Projeto ${projeto.id} reenviado à Engenharia`);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold">Pedidos de venda</div>
            <div className="text-xs text-muted-foreground">Camada operacional/comercial. Aprove/libere projetos e envie para a Engenharia. O controle financeiro (contas a pagar/receber) é feito no módulo Financeiro.</div>
          </div>
          <Input className="max-w-xs" placeholder="Buscar por contrato, cliente ou projeto…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 text-xs">
          <KpiSmall icon={FileText} label="Contratos aprovados" value={String(aprovados.length)} />
          <KpiSmall icon={Layers} label="Projetos" value={String(totalProjetos)} />
          <KpiSmall icon={CheckCircle2} label="Liberados/Engenharia" value={String(totalLiberados)} positive />
          <KpiSmall icon={Clock} label="Pendentes de liberação" value={String(totalPendentes)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum contrato aprovado com projetos. Aprove um contrato e cadastre projetos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Nº pedido</TableHead>
                  <TableHead className="text-xs">Contrato</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Vendedor</TableHead>
                  <TableHead className="text-xs">Endereço</TableHead>
                  <TableHead className="text-xs text-right">Módulos</TableHead>
                  <TableHead className="text-xs text-right">kWp</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs">Status pedido</TableHead>
                  <TableHead className="text-xs">Engenharia</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.flatMap((contrato) =>
                  (contrato.projetos ?? []).map((projeto) => {
                    const valorProj = Number(projeto.valor) || 0;
                    return (
                      <TableRow key={projeto.id}>
                        <TableCell className="font-mono text-[11px] text-primary font-bold">{projeto.id}</TableCell>
                        <TableCell className="font-mono text-[11px]">{contrato.id}</TableCell>
                        <TableCell className="text-xs truncate max-w-[180px]">{contrato.cliente}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{contrato.vendedor}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {projeto.endereco}{projeto.numero ? `, ${projeto.numero}` : ""} · {projeto.cidade}/{projeto.uf}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">{projeto.modulos ?? 0}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{(projeto.kwp ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs font-mono font-semibold">{fmtBRL(valorProj)}</TableCell>
                        <TableCell>
                          {projeto.aprovado
                            ? <span className="text-[10px] rounded bg-success/15 px-2 py-0.5 text-success font-bold">LIBERADO</span>
                            : <span className="text-[10px] rounded bg-warning/15 px-2 py-0.5 text-warning font-bold">PENDENTE</span>}
                        </TableCell>
                        <TableCell>
                          {projeto.enviadoEngenharia
                            ? <span className="text-[10px] rounded bg-primary/15 px-2 py-0.5 text-primary font-bold">ENVIADO</span>
                            : <span className="text-[10px] rounded bg-muted px-2 py-0.5 text-muted-foreground font-bold">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px] bg-primary text-primary-foreground"
                            onClick={() => liberarProjeto(contrato, projeto)}
                            disabled={projeto.aprovado && projeto.enviadoEngenharia}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {projeto.aprovado ? (projeto.enviadoEngenharia ? "Liberado" : "Reenviar") : "Aprovar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
