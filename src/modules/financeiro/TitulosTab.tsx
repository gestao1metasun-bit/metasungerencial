// UI dos novos módulos de Títulos Financeiros (AP / AR).
// Consome FinanceiroRepository via useRepoTitulos/useFinanceiroRepo (Onda 2).
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadAnexo, signedUrlAnexo, deleteAnexo } from "@/lib/anexos.functions";
import { Plus, SquarePen, CheckCircle2, XCircle, Undo2, Eye, Lock, Paperclip, Download, Trash2, Upload, ArrowDownCircle, ArrowUpCircle, Link2, Sparkles, Split, MoreHorizontal, ChevronDown, FileSignature, Hammer, History, Wallet, CreditCard, AlertTriangle, CalendarDays, CheckCheck, Hash, Copy, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ContraparteCombo } from "@/components/app/financeiro/ContraparteCombo";
import { PeriodoFechadoBanner } from "@/components/app/financeiro/PeriodoFechadoBanner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EnterpriseRecordToolbar, ENTERPRISE_PROCESS_ICON_HINT } from "@/components/app/enterprise/EnterpriseRecordToolbar";
import type { EnterpriseProcessItem } from "@/components/app/enterprise/EnterpriseRecordToolbar";
import { AttachmentDialog } from "@/components/app/enterprise/AttachmentDialog";

import { toast } from "sonner";
import {
  useRepoTitulos, useFinanceiroRepo,
} from "@/hooks/useRepoFinanceiro";
import type {
  Titulo, TituloTipo, TituloStatus, Anexo,
} from "@/lib/repositories/financeiro-repository";
import { useFornecedores, upsertFornecedor, newFornecedorId } from "@/lib/fin-fornecedores-store";
import { useContasFinanceiras } from "@/lib/fin-contas-store";
import { useNaturezasFin } from "@/lib/fin-naturezas-store";
import { useGrupos, useSubgrupos } from "@/lib/fin-grupos-store";
import { useCentrosCustoFin } from "@/lib/fin-centros-custo-store";
import { useTiposAplicacao } from "@/lib/fin-tipos-aplicacao-store";
import { useMeiosPagamento } from "@/lib/fin-meios-pagamento-store";
import { useClientesFull, addClienteFull, DuplicateClienteError } from "@/lib/clientes-store";
import { readLancamentos, fmtBRLPrecise } from "@/lib/financeiro-store";
import { calcularEncargos } from "@/lib/fin-calculo-encargos";
import { useParametrosFinanceiros } from "@/lib/fin-parametros-financeiros-store";

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

const ORIGEM_LABEL: Record<string, string> = {
  manual: "Manual",
  contrato: "Contrato",
  financiamento: "Financiamento",
  compra: "Compra",
  comissao: "Comissão",
  mao_obra: "Mão de obra",
  frete: "Frete",
  manutencao: "Manutenção",
  rescisao: "Rescisão",
  adiantamento: "Adiantamento",
  renegociacao: "Renegociação",
};

const ORIGEM_TONE: Record<string, string> = {
  manual:        "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
  contrato:      "bg-sky-500/15 text-sky-600 border-sky-500/30",
  financiamento: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  compra:        "bg-amber-500/15 text-amber-600 border-amber-500/30",
  comissao:      "bg-pink-500/15 text-pink-600 border-pink-500/30",
  mao_obra:      "bg-orange-500/15 text-orange-600 border-orange-500/30",
  frete:         "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  manutencao:    "bg-teal-500/15 text-teal-600 border-teal-500/30",
  rescisao:      "bg-red-500/15 text-red-600 border-red-500/30",
  adiantamento:  "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  renegociacao:  "bg-violet-500/15 text-violet-700 border-violet-500/30",
};

function fmtCompetenciaBR(c?: string) {
  if (!c) return "—";
  const [y, m] = c.split("-");
  if (!y || !m) return c;
  return `${m}/${y}`;
}

function StatusPill({ s, renegociado }: { s: TituloStatus; renegociado?: boolean }) {
  if (renegociado) {
    return (
      <Badge
        variant="outline"
        className="bg-violet-500/15 text-violet-700 border-violet-500/30 border text-[10px] font-semibold"
        title="Título encerrado por renegociação — sem movimento de caixa. Saldo zero."
      >
        Renegociado
      </Badge>
    );
  }
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

/* ContraparteCombo importado de @/components/app/financeiro/ContraparteCombo */

/* ============================================================
 * Tabela principal (AP ou AR)
 * ============================================================ */

export function TitulosTab({ tipo }: { tipo: TituloTipo }) {
  const todos = useRepoTitulos();
  const repo = useFinanceiroRepo();
  const naturezas = useNaturezasFin();
  const grupos = useGrupos();
  const subgrupos = useSubgrupos();
  const centros = useCentrosCustoFin();
  const tiposAplic = useTiposAplicacao();
  const meios = useMeiosPagamento();
  const fornecedores = useFornecedores();
  const contas = useContasFinanceiras();
  const cadastros = { naturezas, grupos, subgrupos, centros, tiposAplic, meios, fornecedores, contas };
  const parametrosFin = useParametrosFinanceiros();
  const hojeISO = new Date().toISOString().slice(0, 10);
  const contratosAll = useContratos();
  const obrasAll = useObrasSnapshot();
  const uploadAnexoFn = useServerFn(uploadAnexo);
  const [fStatus, setFStatus] = useState<TituloStatus | "todos">("todos");
  const [busca, setBusca] = useState("");
  type PresetView = "operacional" | "cobranca" | "diretoria" | "fiscal" | "auditoria";
  const [preset, setPreset] = useState<PresetView>("operacional");
  type ChipKey =
    | "aberto" | "vence_hoje" | "vence_semana" | "vence_mes" | "vencidos"
    | "baixado_hoje" | "baixado_semana" | "baixado_mes"
    | "conciliado_hoje" | "conciliado_semana" | "conciliado_mes"
    | "conciliados" | "nao_conciliados"
    | "com_encargos" | "com_desconto" | "renegociados" | "com_obra" | "rateados";
  const [chips, setChips] = useState<Set<ChipKey>>(new Set());
  const toggleChip = (k: ChipKey) => setChips((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const showEncargos = preset !== "diretoria";
  const showFiscal = preset === "fiscal";
  const showAuditoria = preset === "auditoria";
  const [criarOpen, setCriarOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [editar, setEditar] = useState<Titulo | null>(null);
  const [baixar, setBaixar] = useState<Titulo | null>(null);
  const [estornar, setEstornar] = useState<{ titulo: Titulo; movId: string } | null>(null);
  const [verHist, setVerHist] = useState<Titulo | null>(null);
  const [renegociar, setRenegociar] = useState<Titulo | null>(null);
  const [anexosTitulo, setAnexosTitulo] = useState<Titulo | null>(null);

  const [ratear, setRatear] = useState<Titulo | null>(null);

  // D6.13.3 piloto — seleção múltipla para EnterpriseRecordToolbar (RM-style).
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) =>
    setSelecionados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const limparSel = () => setSelecionados(new Set());

  const dateHelpers = useMemo(() => {
    const today = hojeISO;
    const d = new Date(today + "T00:00:00");
    const dow = d.getDay(); // 0=dom
    const monday = new Date(d); monday.setDate(d.getDate() - ((dow + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const inicioSemana = monday.toISOString().slice(0, 10);
    const fimSemana = sunday.toISOString().slice(0, 10);
    const inicioMes = today.slice(0, 7) + "-01";
    const fimMes = (() => {
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return end.toISOString().slice(0, 10);
    })();
    return { today, inicioSemana, fimSemana, inicioMes, fimMes };
  }, [hojeISO]);

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
    if (chips.size > 0) {
      const { today, inicioSemana, fimSemana, inicioMes, fimMes } = dateHelpers;
      const inRange = (iso: string | undefined, a: string, b: string) => !!iso && iso >= a && iso <= b;
      arr = arr.filter((t) => {
        const aberto = t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado";
        const venc = t.vencimentoReal ?? t.vencimento;
        const movs = (t.movimentos ?? []).filter((m) => !m.estornado);
        const ultMov = movs.length > 0 ? movs[movs.length - 1] : null;
        const baixadoData = ultMov?.data;
        const conciliado = movs.length > 0 && movs.some((m) => !!m.contaFinanceira);
        const pagoOuRecebido = t.status === "pago" || t.status === "recebido";
        const rateios = t.rateios ?? [];
        const renegociado = t.statusRenegociacao === "renegociado" || !!t.renegociacaoId;
        const enc = aberto ? calcularEncargos(t, today, parametrosFin) : { jurosSugerido: 0, multaSugerida: 0, diasAtraso: 0, valorComEncargos: t.saldo };
        const temEncargos = enc.jurosSugerido > 0 || enc.multaSugerida > 0;
        for (const c of chips) {
          let ok = false;
          switch (c) {
            case "aberto": ok = aberto; break;
            case "vence_hoje": ok = aberto && venc === today; break;
            case "vence_semana": ok = aberto && inRange(venc, inicioSemana, fimSemana); break;
            case "vence_mes": ok = aberto && inRange(venc, inicioMes, fimMes); break;
            case "vencidos": ok = aberto && venc < today; break;
            case "baixado_hoje": ok = pagoOuRecebido && baixadoData === today; break;
            case "baixado_semana": ok = pagoOuRecebido && inRange(baixadoData, inicioSemana, fimSemana); break;
            case "baixado_mes": ok = pagoOuRecebido && inRange(baixadoData, inicioMes, fimMes); break;
            case "conciliado_hoje": ok = conciliado && baixadoData === today; break;
            case "conciliado_semana": ok = conciliado && inRange(baixadoData, inicioSemana, fimSemana); break;
            case "conciliado_mes": ok = conciliado && inRange(baixadoData, inicioMes, fimMes); break;
            case "conciliados": ok = conciliado; break;
            case "nao_conciliados": ok = pagoOuRecebido && !conciliado; break;
            case "com_encargos": ok = temEncargos; break;
            case "com_desconto": ok = (t.desconto ?? 0) > 0; break;
            case "renegociados": ok = renegociado; break;
            case "com_obra": ok = !!t.obraId; break;
            case "rateados": ok = rateios.length > 0; break;
          }
          if (!ok) return false;
        }
        return true;
      });
    }
    if (preset === "cobranca") {
      // Cobrança: apenas títulos em aberto, priorizando vencidos
      arr = arr.filter((t) => t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado");
      const hoje = hojeISO;
      return arr.sort((a, b) => {
        const va = a.vencimentoReal ?? a.vencimento;
        const vb = b.vencimentoReal ?? b.vencimento;
        const aAtraso = va < hoje;
        const bAtraso = vb < hoje;
        if (aAtraso !== bAtraso) return aAtraso ? -1 : 1;
        return va.localeCompare(vb);
      });
    }
    return arr.sort((a, b) => (a.vencimentoReal ?? a.vencimento).localeCompare(b.vencimentoReal ?? b.vencimento));
  }, [todos, tipo, fStatus, busca, preset, hojeISO, chips, dateHelpers, parametrosFin]);

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
      <PeriodoFechadoBanner />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar descrição, fornecedor, cliente, contrato…"
          className="h-9 w-72"
        />
        <div className="inline-flex h-9 items-center rounded-md border bg-background p-0.5 text-xs">
          {([
            { k: "operacional", label: "Operacional", hint: "Dia a dia financeiro" },
            { k: "cobranca",    label: "Cobrança",    hint: "Apenas em aberto, vencidos primeiro" },
            { k: "diretoria",   label: "Diretoria",   hint: "Foco em totais e previsão (sem encargos detalhados)" },
            { k: "fiscal",      label: "Fiscal",      hint: "Documento (NF/Boleto), competência" },
            { k: "auditoria",   label: "Auditoria",   hint: "ID visível, criador, histórico detalhado" },
          ] as { k: PresetView; label: string; hint: string }[]).map((p) => (
            <button
              key={p.k}
              type="button"
              onClick={() => setPreset(p.k)}
              title={p.hint}
              className={`rounded px-2 py-1 transition ${preset === p.k ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <FiltrosSheet chips={chips} toggleChip={toggleChip} clearChips={() => setChips(new Set())} tipo={tipo} />
        <div className="ml-auto flex items-center gap-2">
          <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
            <TituloDialog
              tipo={tipo}
              cadastros={cadastros}
              onSave={async (input, pendingFiles) => {
                const parcelas: ParcelaPlano[] | undefined = input._parcelas;
                delete input._parcelas;
                const criados: Titulo[] = [];
                try {
                  if (parcelas && parcelas.length > 1) {
                    for (let idx = 0; idx < parcelas.length; idx++) {
                      const p = parcelas[idx];
                      const label = `${idx + 1}/${parcelas.length}`;
                      criados.push(await repo.criarTitulo({
                        ...input,
                        tipo, origem: input.origem ?? "manual",
                        descricao: `${input.descricao} (${label})`,
                        valorOriginal: p.valor,
                        vencimento: p.vencimento,
                        competencia: p.competencia,
                        parcelaLabel: label,
                      }));
                    }
                    toast.success(`${parcelas.length} parcelas criadas.`);
                  } else {
                    criados.push(await repo.criarTitulo({ ...input, tipo, origem: input.origem ?? "manual" }));
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
                    await repo.anexar(alvo.id, {
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
                if (alvo) setEditar(alvo);
              }}
              onCancel={() => setCriarOpen(false)}
            />
          </Dialog>
        </div>
      </div>

      {/* Chips de filtros ativos (apenas os selecionados) */}
      {chips.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {chips.size} filtro{chips.size > 1 ? "s" : ""} ativo{chips.size > 1 ? "s" : ""}
          </span>
          {Array.from(chips).map((k) => {
            const label = CHIP_LABEL(k, tipo);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleChip(k)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                title="Remover filtro"
              >
                {label}
                <X className="h-3 w-3" />
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setChips(new Set())}
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {/* KPIs removidos (D6.13.3 — alinhamento RM): toolbar operacional assume a parte superior. */}


      {/* D6.13.3 piloto vivo — Barra Operacional de Registro estilo TOTVS RM. */}
      {(() => {
        const selRows = lista.filter((t) => selecionados.has(t.id));
        const singleSel = selRows.length === 1 ? selRows[0] : null;
        const isAR = tipo === "AR";
        const entityType = isAR ? "contas_receber" : "contas_pagar";
        const statusRenegociavel = new Set<TituloStatus>(["a_receber", "a_pagar", "parcial", "previsto", "comprometido"]);
        const podeRenegociarLote = selRows.length > 0 &&
          selRows.every((t) => statusRenegociavel.has(t.status)) &&
          (isAR
            ? new Set(selRows.map((t) => t.cliente ?? "__")).size === 1
            : new Set(selRows.map((t) => t.fornecedor ?? "__")).size === 1);
        const podeBaixar = selRows.length > 0 &&
          selRows.every((t) => t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado");

        const availableProcesses: EnterpriseProcessItem[] = [
          { key: "baixar",       label: isAR ? "Receber título"  : "Baixar título",
            icon: ENTERPRISE_PROCESS_ICON_HINT.baixar,    requerSelecao: 1, permiteLote: false },
          { key: "renegociar",   label: "Renegociar",
            icon: ENTERPRISE_PROCESS_ICON_HINT.renegociar, requerSelecao: 1, permiteLote: true, requerMotivo: true },
          { key: "consolidar",   label: "Consolidar em um título",
            icon: ENTERPRISE_PROCESS_ICON_HINT.consolidar, requerSelecao: 2, permiteLote: true, requerMotivo: true },
          { key: "alterar_vencimento", label: "Alterar vencimento",
            requerSelecao: 1, permiteLote: true, requerMotivo: true },
          { key: "enviar_cobranca", label: isAR ? "Enviar cobrança" : "Enviar lembrete",
            icon: ENTERPRISE_PROCESS_ICON_HINT.enviar,    requerSelecao: 1, permiteLote: true },
          { key: "estornar",     label: "Estornar baixa",
            icon: ENTERPRISE_PROCESS_ICON_HINT.estornar,  requerSelecao: 1, permiteLote: false, destructive: true, requerMotivo: true },
        ];

        const handleAction = (a: string) => {
          switch (a) {
            case "novo":       return setCriarOpen(true);
            case "atualizar":  return toast.info("Lista atualizada.");
            case "editar":     return singleSel && setEditar(singleSel);
            case "anexos":     return singleSel && setAnexosTitulo(singleSel);
            case "historico":
            case "comentarios":
            case "auditoria":  return singleSel && setVerHist(singleSel);

            case "cancelar": {
              if (selRows.length === 0) return;
              const motivo = window.prompt(`Motivo do cancelamento (${selRows.length} título(s), mín. 3 caracteres):`, "");
              if (!motivo || motivo.trim().length < 3) return;
              (async () => {
                let ok = 0, fail = 0;
                for (const t of selRows) {
                  try { await repo.cancelarTitulo(t.id, motivo.trim()); ok++; } catch { fail++; }
                }
                toast[fail ? "warning" : "success"](`Cancelamento: ${ok} ok${fail ? `, ${fail} falha(s)` : ""}`);
                limparSel();
              })();
              return;
            }
            case "exportar":   return toast.info("Exportação CSV será habilitada via Process Engine (D6.13.3).");
            case "imprimir":   return window.print();
            default:           return;
          }
        };

        const handleProcess = (key: string) => {
          switch (key) {
            case "baixar":
              if (!podeBaixar)  return toast.warning("Seleção contém título já baixado/cancelado.");
              if (singleSel)    return setBaixar(singleSel);
              return toast.warning("Baixa em lote ainda não disponível — selecione 1 título.");
            case "renegociar":
              if (!podeRenegociarLote) return toast.warning("Renegociação exige mesmo cliente/fornecedor e status em aberto.");
              if (singleSel)    return setRenegociar(singleSel);
              return toast.info("Renegociação em lote será migrada ao Process Engine.");
            case "consolidar":
              return toast.info("Consolidação em lote: aguardando Process Engine (D6.13.3).");
            case "alterar_vencimento":
              return toast.info("Alterar vencimento: aguardando Process Engine (D6.13.3).");
            case "enviar_cobranca":
              return toast.info("Cobrança/lembrete: aguardando integração com canal (D6.13.3).");
            case "estornar":
              return toast.info("Estorno: usar histórico do título (será migrado ao Process Engine).");
            default: return;
          }
        };

        return (
          <EnterpriseRecordToolbar
            entityType={entityType}
            selectedIds={Array.from(selecionados)}
            availableActions={[
              "novo", "editar", "cancelar", "atualizar",
              "anexos", "historico", "comentarios", "auditoria",
              "exportar", "imprimir",
              "filtroRapido", "filtroAvancado", "visoes", "colunas",
            ]}
            availableProcesses={availableProcesses}
            onAction={(a) => handleAction(a)}
            onProcess={(k) => handleProcess(k)}
            onFilter={() => toast.info("Filtros avançados disponíveis no painel lateral.")}
            extraRight={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm p-0 text-slate-700 hover:bg-slate-100" title="Mais opções">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const n = await repo.importarPrevisoesDoLegado(readLancamentos());
                        toast.success(n > 0 ? `${n} previsões importadas como títulos.` : "Nada novo para importar.");
                      } catch (e: any) { toast.error(e?.message ?? "Falha ao importar previsões."); }
                    }}
                  >
                    Importar previsões do fluxo de caixa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        );
      })()}

      <Card className="bg-[image:var(--gradient-card)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[32px]">
                <Checkbox
                  checked={lista.length > 0 && selecionados.size === lista.length}
                  onCheckedChange={(v) =>
                    setSelecionados(v ? new Set(lista.map((t) => t.id)) : new Set())
                  }
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="w-[90px]">Ações</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>{tipo === "AP" ? "Fornecedor / Vínculos" : "Cliente / Vínculos"}</TableHead>
              <TableHead className="w-[100px]">Venc. Nominal</TableHead>
              <TableHead className="w-[100px]">Venc. Real</TableHead>
              <TableHead className="w-[110px] text-right">Valor</TableHead>
              {showEncargos && <TableHead className="w-[90px] text-right">Juros</TableHead>}
              {showEncargos && <TableHead className="w-[90px] text-right">Multa</TableHead>}
              {showEncargos && <TableHead className="w-[90px] text-right">Desconto</TableHead>}
              <TableHead className="w-[130px] text-right">Total</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={showEncargos ? 12 : 9} className="py-10 text-center text-sm text-muted-foreground">
                Nenhum título. Crie manualmente ou importe previsões.
              </TableCell></TableRow>
            )}
            {lista.map((t) => {
              const aberto = t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado";
              const enc = aberto
                ? calcularEncargos(t, hojeISO, parametrosFin)
                : { jurosSugerido: 0, multaSugerida: 0, diasAtraso: 0, valorComEncargos: t.saldo };
              const desconto = t.desconto ?? 0;
              const total = aberto ? round2(enc.valorComEncargos - desconto) : t.saldo;
              const emAtraso = aberto && enc.diasAtraso > 0;
              const contrato = t.contratoId ? contratosAll.find((c) => c.id === t.contratoId) : null;
              const obra = t.obraId ? obrasAll.find((o: any) => o.id === t.obraId) : null;
              const rateios = t.rateios ?? [];
              const movs = (t.movimentos ?? []).filter((m) => !m.estornado);
              const hasEstorno = (t.movimentos ?? []).some((m) => m.estornado);
              const baixaConta = movs.find((m) => m.contaFinanceira)?.contaFinanceira;
              const baixaMeio = movs.find((m) => m.meioPagamento)?.meioPagamento;
              const contaShow = baixaConta ?? t.contaFinanceira;
              const meioShow = baixaMeio ?? t.meioPagamento;
              const conciliado = movs.length > 0 && !!baixaConta;
              const ultimoMov = movs.length > 0 ? movs[movs.length - 1] : null;
              const dataBaixa = ultimoMov?.data;
              const pagoOuRecebidoRow = t.status === "pago" || t.status === "recebido";
              const pendenteConciliacao = pagoOuRecebidoRow && !conciliado;
              const temAnexos = (t.anexos?.length ?? 0) > 0;
              const temHistorico = movs.length > 0 || hasEstorno || !!t.statusRenegociacao || !!t.renegociacaoId;
              const origemKey = (t.statusRenegociacao === "renegociado" || t.renegociacaoId) ? "renegociacao" : (t.origem ?? "manual");
              const origemLabel = ORIGEM_LABEL[origemKey] ?? origemKey;
              const origemTone = ORIGEM_TONE[origemKey] ?? ORIGEM_TONE.manual;
              const contraparte = tipo === "AP" ? (t.fornecedor ?? "—") : (t.cliente ?? "—");
              const rateioTooltip = rateios.length > 0
                ? `Rateado em ${rateios.length} centro(s):\n` + rateios.map((r) => {
                    const cc = r.centroCusto ?? r.centroCustoId ?? "—";
                    const pct = t.valorOriginal > 0 ? ((r.valor / t.valorOriginal) * 100).toFixed(1) + "%" : "";
                    return `• ${cc} ${pct} · ${fmtBRLPrecise(r.valor)}`;
                  }).join("\n")
                : "";
              return (
              <TableRow key={t.id} className="group" data-state={selecionados.has(t.id) ? "selected" : undefined}>
                <TableCell className="w-[32px]">
                  <Checkbox
                    checked={selecionados.has(t.id)}
                    onCheckedChange={() => toggleSel(t.id)}
                    aria-label={`Selecionar ${t.descricao}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
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
                    {t.bloqueadoFechamento && (
                      <span title="Período fechado — somente leitura" className="inline-flex"><Lock className="h-3 w-3 text-muted-foreground" /></span>
                    )}
                  </div>
                </TableCell>

                {/* Título: descrição + parcela + ID copiável */}
                <TableCell className="max-w-[260px]">
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {t.descricao}
                        {t.parcelaLabel && <span className="ml-1 text-[11px] font-normal text-muted-foreground">({t.parcelaLabel})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard?.writeText(t.id).then(() => toast.success("ID copiado")).catch(() => {}); }}
                        className={`mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/70 transition-opacity hover:text-primary ${showAuditoria ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        title={`ID: ${t.id} (clique para copiar)`}
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {t.id}
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </TableCell>

                {/* Contraparte + linha secundária com vínculos */}
                <TableCell className="max-w-[320px]">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{contraparte}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
                      <Badge variant="outline" className={`${origemTone} border px-1.5 py-0 text-[9px] font-semibold`} title={`Origem: ${origemLabel}`}>
                        {origemLabel}
                      </Badge>
                      {contrato && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-700"
                          title={`Contrato ${contrato.id}${contrato.cliente ? " · " + contrato.cliente : ""}`}
                        >
                          <FileSignature className="h-2.5 w-2.5" />
                          {contrato.id}
                        </span>
                      )}
                      {!contrato && t.contratoId && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-700" title={`Contrato ${t.contratoId}`}>
                          <FileSignature className="h-2.5 w-2.5" />
                          {t.contratoId}
                        </span>
                      )}
                      {obra && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-orange-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orange-700"
                          title={`Obra ${(obra as any).codigo ?? obra.id}`}
                        >
                          <Hammer className="h-2.5 w-2.5" />
                          {(obra as any).codigo ?? obra.id.slice(0, 8)}
                        </span>
                      )}
                      {!obra && t.obraId && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-orange-500/10 px-1.5 py-0.5 font-mono text-[10px] text-orange-700" title={`Obra ${t.obraId}`}>
                          <Hammer className="h-2.5 w-2.5" />
                          {t.obraId.slice(0, 8)}
                        </span>
                      )}
                      {rateios.length > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
                          title={rateioTooltip}
                        >
                          <Split className="h-2.5 w-2.5" />
                          RATEADO · {rateios.length}
                        </span>
                      )}
                      {meioShow && (
                        <span className="inline-flex items-center gap-0.5 text-muted-foreground" title={`Meio: ${meioShow}${contaShow ? " · Conta: " + contaShow : ""}`}>
                          <CreditCard className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[80px]">{meioShow}</span>
                        </span>
                      )}
                      {emAtraso && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-700"
                          title={`${enc.diasAtraso} dia(s) em atraso`}
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {enc.diasAtraso}d
                        </span>
                      )}
                      {temAnexos && (
                        <span title={`${t.anexos!.length} anexo(s)`} className="inline-flex text-sky-600">
                          <Paperclip className="h-3 w-3" />
                        </span>
                      )}
                      {temHistorico && (
                        <span
                          title={`Histórico: ${movs.length} baixa(s)${hasEstorno ? " · com estorno" : ""}${t.statusRenegociacao ? " · renegociado" : ""}`}
                          className="inline-flex"
                        >
                          <History className={`h-3 w-3 ${hasEstorno ? "text-rose-600" : t.statusRenegociacao ? "text-violet-600" : "text-muted-foreground"}`} />
                        </span>
                      )}
                      {conciliado && (
                        <span
                          title={dataBaixa ? `Conciliado em ${fmtDateBR(dataBaixa)}${baixaConta ? " · " + baixaConta : ""}` : "Conciliado"}
                          className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                        >
                          <CheckCheck className="h-2.5 w-2.5" />
                          Conciliado{dataBaixa ? ` ${fmtDateBR(dataBaixa).slice(0, 5)}` : ""}
                        </span>
                      )}
                      {pendenteConciliacao && (
                        <span
                          title={dataBaixa ? `${tipo === "AP" ? "Pago" : "Recebido"} em ${fmtDateBR(dataBaixa)} · aguarda conciliação` : "Aguarda conciliação"}
                          className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Pendente conciliação
                        </span>
                      )}
                      {t.competencia && (
                        <span className="inline-flex items-center gap-0.5 text-muted-foreground" title={`Competência ${fmtCompetenciaBR(t.competencia)}`}>
                          <CalendarDays className="h-2.5 w-2.5" />
                          {fmtCompetenciaBR(t.competencia)}
                        </span>
                      )}
                      {showFiscal && t.documentoTipo && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700"
                          title={`Documento: ${t.documentoTipo}${t.documentoNumero ? " · " + t.documentoNumero : ""}`}
                        >
                          {t.documentoTipo}{t.documentoNumero ? ` ${t.documentoNumero}` : ""}
                        </span>
                      )}
                      {showAuditoria && t.criadoPor && (
                        <span className="inline-flex items-center gap-0.5 text-muted-foreground" title={`Criado por ${t.criadoPor} em ${t.criadoEm?.slice(0, 10)}`}>
                          por {t.criadoPor}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="tabular-nums">
                  <span className={`font-mono text-xs ${t.vencimentoReal && t.vencimentoReal !== t.vencimento ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {fmtDateBR(t.vencimento)}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">
                  {t.vencimentoReal && t.vencimentoReal !== t.vencimento ? (
                    <span className="font-mono text-xs font-semibold text-foreground" title="Vencimento ajustado (dia útil/renegociação)">
                      {fmtDateBR(t.vencimentoReal)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{fmtBRLPrecise(t.saldo)}</TableCell>
                {showEncargos && (
                  <TableCell
                    className={`text-right text-sm tabular-nums ${enc.jurosSugerido > 0 ? "text-amber-600 font-medium" : "text-muted-foreground/60"}`}
                    title={emAtraso ? `${enc.diasAtraso} dia(s) de atraso · ${parametrosFin.jurosValor}% ${parametrosFin.jurosModo === "mensal" ? "a.m." : "a.d."}` : "Sem atraso"}
                  >
                    {enc.jurosSugerido > 0 ? fmtBRLPrecise(enc.jurosSugerido) : "—"}
                  </TableCell>
                )}
                {showEncargos && (
                  <TableCell
                    className={`text-right text-sm tabular-nums ${enc.multaSugerida > 0 ? "text-rose-600 font-medium" : "text-muted-foreground/60"}`}
                    title={emAtraso ? `Multa ${parametrosFin.multaTipo === "percentual" ? parametrosFin.multaValor + "%" : "R$ " + parametrosFin.multaValor} sobre o saldo` : "Sem multa"}
                  >
                    {enc.multaSugerida > 0 ? fmtBRLPrecise(enc.multaSugerida) : "—"}
                  </TableCell>
                )}
                {showEncargos && (
                  <TableCell
                    className={`text-right text-sm tabular-nums ${desconto > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground/60"}`}
                    title={desconto > 0 ? `Desconto concedido: ${fmtBRLPrecise(desconto)}` : "Sem desconto"}
                  >
                    {desconto > 0 ? fmtBRLPrecise(desconto) : "—"}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className={`text-base font-bold tabular-nums ${aberto ? "text-foreground" : "text-emerald-700"}`}>
                    {fmtBRLPrecise(total)}
                  </div>
                  {aberto && (enc.jurosSugerido > 0 || enc.multaSugerida > 0 || desconto > 0) && (
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      base {fmtBRLPrecise(t.saldo)}
                    </div>
                  )}
                </TableCell>

                <TableCell><StatusPill s={t.status} renegociado={t.statusRenegociacao === "renegociado"} /></TableCell>
              </TableRow>
              );
            })}
          </TableBody>
          <TableFooter className="bg-gradient-to-b from-slate-50 to-slate-100 border-t-2 border-slate-300">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-2 text-[12px] font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-sm bg-sky-100 px-1.5 py-0.5 font-mono text-[11px] text-sky-800">{lista.length}</span>
                  {lista.length === 1 ? "registro" : "registros"}
                  {selecionados.size > 0 && (
                    <span className="text-emerald-700">· {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}</span>
                  )}
                </span>
              </TableCell>
              <TableCell colSpan={2} className="text-right text-[11px] uppercase tracking-wider text-slate-500">
                Totais →
              </TableCell>
              <TableCell className="text-right font-mono text-[13px] font-bold tabular-nums text-slate-800">
                {fmtBRLPrecise(lista.reduce((s, t) => s + (t.valorOriginal ?? 0), 0))}
              </TableCell>
              {showEncargos && (
                <TableCell className="text-right font-mono text-[12px] tabular-nums text-amber-700">
                  {fmtBRLPrecise(lista.reduce((s, t) => s + (t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado" ? calcularEncargos(t, hojeISO, parametrosFin).jurosSugerido : 0), 0))}
                </TableCell>
              )}
              {showEncargos && (
                <TableCell className="text-right font-mono text-[12px] tabular-nums text-rose-700">
                  {fmtBRLPrecise(lista.reduce((s, t) => s + (t.status !== "pago" && t.status !== "recebido" && t.status !== "cancelado" ? calcularEncargos(t, hojeISO, parametrosFin).multaSugerida : 0), 0))}
                </TableCell>
              )}
              {showEncargos && (
                <TableCell className="text-right font-mono text-[12px] tabular-nums text-emerald-700">
                  {fmtBRLPrecise(lista.reduce((s, t) => s + (t.desconto ?? 0), 0))}
                </TableCell>
              )}
              <TableCell className="text-right font-mono text-[14px] font-bold tabular-nums text-emerald-800">
                {fmtBRLPrecise(lista.reduce((s, t) => s + (t.saldo ?? 0), 0))}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Anexos polimórficos (D6.13.4) */}
      <AttachmentDialog
        open={!!anexosTitulo}
        onOpenChange={(o) => !o && setAnexosTitulo(null)}
        entidade="titulos_financeiros"
        entidadeId={anexosTitulo?.id ?? null}
        titulo={anexosTitulo ? `Anexos · ${anexosTitulo.documentoTipo ?? "Título"} ${anexosTitulo.documentoNumero ?? ""}`.trim() : "Anexos"}
        descricao={anexosTitulo ? `Vencimento ${fmtDateBR(anexosTitulo.vencimento)} · Saldo ${fmtBRLPrecise(anexosTitulo.saldo)}` : undefined}
        categoriaPadrao="boleto"
      />

      {/* Editar */}
      <Dialog open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        {editar && (
          <TituloDialog
            tipo={tipo}
            initial={editar}
            cadastros={cadastros}
            onSave={async (patch) => {
              try {
                await repo.atualizarTitulo(editar.id, patch, "Edição manual");
                toast.success("Título atualizado.");
                setEditar(null);
              } catch (e: any) { toast.error(e.message); }
            }}
            onCancel={() => setEditar(null)}
            onCancelarTitulo={async (motivo) => {
              try { await repo.cancelarTitulo(editar.id, motivo); toast.success("Título cancelado."); setEditar(null); }
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
            meios={meios}
            onSave={async (b) => {
              try { await repo.registrarBaixa({ ...b, tituloId: baixar.id }); toast.success(tipo === "AP" ? "Pagamento registrado." : "Recebimento registrado."); setBaixar(null); }
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
            onSave={async (motivo) => {
              try { await repo.estornarBaixa(estornar.titulo.id, estornar.movId, motivo); toast.success("Movimento estornado."); setEstornar(null); setVerHist(null); }
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
  fornecedores: ReturnType<typeof useFornecedores>;
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
  const [maisOpcoes, setMaisOpcoes] = useState<boolean>(!!(initial?.dataEmissao || initial?.tipoAplicacaoId));

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
      vencimentoReal: proximoDiaUtilISO(vencimento),
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

      {/* Passo 1 — Contraparte (buscável + cadastro inline) */}
      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          1 · {tipo === "AP" ? "Fornecedor" : "Cliente"}
        </div>
        {tipo === "AP" ? (
          <ContraparteCombo
            value={fornecedor}
            onChange={setFornecedor}
            options={fornecedores.filter((f) => f.ativo).map((f) => ({ id: f.id, nome: f.nome, sub: f.documento }))}
            placeholder="Buscar fornecedor…"
            onAdd={adicionarFornecedorInline}
            addLabel="+ Cadastrar fornecedor"
          />
        ) : (
          <ContraparteCombo
            value={cliente}
            onChange={setCliente}
            options={clientesAll.map((c) => ({ id: c.id, nome: c.nome, sub: [c.doc, c.cidade && `${c.cidade}/${c.uf}`].filter(Boolean).join(" · ") }))}
            placeholder="Buscar cliente…"
            onAdd={adicionarClienteInline}
            addLabel="+ Cadastrar cliente"
          />
        )}
      </div>

      {/* Passo 2 — Valor, emissão, vencimento + descrição */}
      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          2 · Valor e datas
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Valor *</Label><Input type="number" step="0.01" value={valorOriginal} onChange={(e) => setValor(Number(e.target.value))} onWheel={(e) => e.currentTarget.blur()} /></div>
          <div>
            <Label title="Se cair em fim de semana, o vencimento real é ajustado automaticamente para o próximo dia útil.">
              Vencimento *
            </Label>
            <Input type="date" value={vencimento} onChange={(e) => setVenc(e.target.value)} />
          </div>
          {vencimento && proximoDiaUtilISO(vencimento) !== vencimento && (
            <div className="col-span-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700">
              Cai em fim de semana — será ajustado automaticamente para <strong>{fmtDateBR(proximoDiaUtilISO(vencimento))}</strong> (próximo dia útil).
            </div>
          )}
          <div className="col-span-2"><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          {maisOpcoes && (
            <div className="col-span-2"><Label>Data de emissão</Label><Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} /></div>
          )}
        </div>
        <div className="mt-2 text-right">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setMaisOpcoes((v) => !v)}>
            {maisOpcoes ? "Ocultar opções avançadas" : "+ Mais opções (data de emissão, tipo de aplicação)"}
          </Button>
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

      {/* Passo 4 — Contrato primeiro, depois Obra (filtrada pelo contrato) */}
      <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground/80">
          <Link2 className="h-3.5 w-3.5" /> 4 · Contrato / Obra vinculados
        </div>
        <div className="grid grid-cols-2 gap-3">
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
            <Label>
              Obra / Projeto
              {contratoId && <span className="ml-1 text-[10px] text-muted-foreground">({obrasDoContrato.length} no contrato)</span>}
            </Label>
            <Select value={obraId || "__none__"} onValueChange={(v) => aoEscolherObra(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={contratoId ? "— escolher obra do contrato —" : "— sem obra —"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem obra —</SelectItem>
                {obrasDoContrato.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="font-mono text-xs text-muted-foreground">{o.id}</span> · {o.cliente} <span className="text-muted-foreground">({o.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {origensDisp.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {maisOpcoes && (
            <div>
              <Label>Tipo de aplicação</Label>
              <Select value={tipoAplicacaoId} onValueChange={setTipoAplicacaoId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{tiposAplic.filter((t) => t.ativo).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}{t.posVenda ? " (pós-venda)" : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
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
  const repo = useFinanceiroRepo();
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
        await repo.anexar(titulo.id, {
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
      await repo.removerAnexo(titulo.id, a.id, "Exclusão pelo usuário");
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
  titulo, contas, meios, onSave, onCancel,
}: {
  titulo: Titulo;
  contas: { id: string; nome: string }[];
  meios: ReturnType<typeof useMeiosPagamento>;
  onSave: (b: any) => void;
  onCancel: () => void;
}) {
  const repo = useFinanceiroRepo();
  const [valor, setValor] = useState<number>(titulo.saldo);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [juros, setJuros] = useState<number>(0);
  const [multa, setMulta] = useState<number>(0);
  const [desconto, setDesconto] = useState<number>(0);
  const [meioPagamento, setMeio] = useState(titulo.meioPagamento ?? "");
  const [contaFinanceira, setConta] = useState(titulo.contaFinanceira ?? "");
  const [observacao, setObs] = useState("");
  const [sugestao, setSugestao] = useState<{ jurosSugerido: number; multaSugerida: number; diasAtraso: number; diasCobraveis: number } | null>(null);
  const [encargosTocados, setEncargosTocados] = useState(false);

  // Pré-preenche juros/multa via repo.calcularEncargos (sugestão editável).
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await repo.calcularEncargos({
          saldo: titulo.saldo,
          vencimento: titulo.vencimentoReal ?? titulo.vencimento,
          dataRef: data,
        });
        if (cancel) return;
        setSugestao({
          jurosSugerido: r.jurosSugerido,
          multaSugerida: r.multaSugerida,
          diasAtraso: r.diasAtraso,
          diasCobraveis: r.diasCobraveis,
        });
        if (!encargosTocados) {
          setJuros(r.jurosSugerido);
          setMulta(r.multaSugerida);
        }
      } catch { /* silencioso — campos ficam zerados */ }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const meiosAtivos = meios.filter((m) => m.ativo);
  const meioInicialAtivo = meiosAtivos.some((m) => m.nome === meioPagamento);
  const podeConfirmar = valor > 0 && !!contaFinanceira;

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
      {sugestao && sugestao.diasAtraso > 0 && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700">
          <span>
            Título com <strong>{sugestao.diasAtraso} dia(s)</strong> de atraso ({sugestao.diasCobraveis} cobráveis).
            Juros e multa calculados pelos parâmetros financeiros (R$, % já aplicado).
          </span>
          <div className="flex gap-1">
            <Button
              size="sm" variant="outline" className="h-6 text-[10px] px-2"
              onClick={() => { setEncargosTocados(true); setJuros(0); setMulta(0); }}
              title="Zera juros e multa para negociação amigável"
            >Zerar juros + multa</Button>
            <Button
              size="sm" variant="ghost" className="h-6 text-[10px] px-2"
              onClick={() => { setEncargosTocados(false); setJuros(sugestao.jurosSugerido); setMulta(sugestao.multaSugerida); }}
              title="Recalcula encargos a partir dos parâmetros"
            >Restaurar sugestão</Button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor (principal)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
        <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        <div>
          <Label>Juros (R$) {sugestao && sugestao.jurosSugerido > 0 && <span className="text-[10px] text-muted-foreground">— sugerido {fmtBRLPrecise(sugestao.jurosSugerido)}</span>}</Label>
          <Input type="number" step="0.01" value={juros} onChange={(e) => { setEncargosTocados(true); setJuros(Number(e.target.value)); }} />
          <div className="text-[10px] text-muted-foreground mt-0.5">Valor em reais já calculado a partir do % configurado.</div>
        </div>
        <div>
          <Label>Multa (R$) {sugestao && sugestao.multaSugerida > 0 && <span className="text-[10px] text-muted-foreground">— sugerida {fmtBRLPrecise(sugestao.multaSugerida)}</span>}</Label>
          <Input type="number" step="0.01" value={multa} onChange={(e) => { setEncargosTocados(true); setMulta(Number(e.target.value)); }} />
          <div className="text-[10px] text-muted-foreground mt-0.5">Valor em reais já calculado a partir do % configurado.</div>
        </div>
        <div><Label>Desconto</Label><Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} /></div>
        <div>
          <Label>Meio de pagamento</Label>
          <Select value={meioPagamento} onValueChange={setMeio}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {!meioInicialAtivo && meioPagamento && (
                <SelectItem value={meioPagamento}>{meioPagamento} (legado)</SelectItem>
              )}
              {meiosAtivos.map((m) => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Conta financeira <span className="text-destructive">*</span></Label>
          <Select value={contaFinanceira} onValueChange={setConta}>
            <SelectTrigger><SelectValue placeholder="Selecione a conta de origem/destino…" /></SelectTrigger>
            <SelectContent>{contas.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
          {!contaFinanceira && (
            <div className="mt-1 text-[11px] text-rose-600">Obrigatório: selecione a conta financeira da baixa.</div>
          )}
        </div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={observacao} onChange={(e) => setObs(e.target.value)} /></div>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        Total da baixa: <strong>{fmtBRLPrecise(valor + juros + multa - desconto)}</strong>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button
          disabled={!podeConfirmar}
          onClick={() => {
            if (!contaFinanceira) { toast.error("Selecione a conta financeira."); return; }
            onSave({ valor, data, juros, multa, desconto, meioPagamento, contaFinanceira, observacao });
          }}
        >
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

// ───────────────────────── Filtros (drawer) ─────────────────────────
type ChipKeyExt =
  | "aberto" | "vence_hoje" | "vence_semana" | "vence_mes" | "vencidos"
  | "baixado_hoje" | "baixado_semana" | "baixado_mes"
  | "conciliado_hoje" | "conciliado_semana" | "conciliado_mes"
  | "conciliados" | "nao_conciliados"
  | "com_encargos" | "com_desconto" | "renegociados" | "com_obra" | "rateados";

function CHIP_LABEL(k: ChipKeyExt, tipo: TituloTipo): string {
  switch (k) {
    case "aberto": return "Em aberto";
    case "vence_hoje": return "Vence hoje";
    case "vence_semana": return "Vence esta semana";
    case "vence_mes": return "Vence este mês";
    case "vencidos": return "Vencidos";
    case "baixado_hoje": return tipo === "AP" ? "Pago hoje" : "Recebido hoje";
    case "baixado_semana": return tipo === "AP" ? "Pago esta semana" : "Recebido esta semana";
    case "baixado_mes": return tipo === "AP" ? "Pago este mês" : "Recebido este mês";
    case "conciliado_hoje": return "Conciliado hoje";
    case "conciliado_semana": return "Conciliado esta semana";
    case "conciliado_mes": return "Conciliado este mês";
    case "conciliados": return "Conciliados";
    case "nao_conciliados": return "Pendente conciliação";
    case "com_encargos": return "Com juros/multa";
    case "com_desconto": return "Com desconto";
    case "renegociados": return "Renegociados";
    case "com_obra": return "Com obra";
    case "rateados": return "Rateados";
  }
}

type FiltrosSheetProps = {
  chips: Set<ChipKeyExt>;
  toggleChip: (k: ChipKeyExt) => void;
  clearChips: () => void;
  tipo: TituloTipo;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
};

function FiltrosSheet({ chips, toggleChip, clearChips, tipo, open, onOpenChange, hideTrigger }: FiltrosSheetProps) {
  const groups: { title: string; items: ChipKeyExt[] }[] = [
    { title: "Vencimento", items: ["vence_hoje", "vence_semana", "vence_mes", "vencidos", "aberto"] },
    { title: tipo === "AP" ? "Pagamento" : "Recebimento", items: ["baixado_hoje", "baixado_semana", "baixado_mes"] },
    { title: "Conciliação", items: ["conciliados", "nao_conciliados", "conciliado_hoje", "conciliado_semana", "conciliado_mes"] },
    { title: "Operacional", items: ["com_encargos", "com_desconto", "renegociados", "com_obra", "rateados"] },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {chips.size > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {chips.size}
              </span>
            )}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            Selecione um ou mais filtros para refinar a listagem.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {groups.map((g) => (
            <div key={g.title} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.title}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((k) => {
                  const active = chips.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleChip(k)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      {CHIP_LABEL(k, tipo)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-8 flex-row justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChips}
            disabled={chips.size === 0}
          >
            Limpar tudo
          </Button>
          <span className="self-center text-xs text-muted-foreground">
            {chips.size} ativo{chips.size === 1 ? "" : "s"}
          </span>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
