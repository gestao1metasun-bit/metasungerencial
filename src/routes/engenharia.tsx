import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useContratos, retornarProjetoComercial, updateProjeto, addProjeto, removeProjeto, reativarContrato, type ProjetoVinculado, type ContratoFull } from "@/lib/contratos-store";
import {
  HardHat, Wrench, Clock, CheckCircle2, AlertTriangle, SquarePen, Users,
  ChevronUp, ChevronDown, RotateCcw, Eye, Plus, Lock, Unlock, ShieldCheck, History,
} from "lucide-react";
import { AnexosButton } from "@/components/app/enterprise/AnexosButton";
import {
  aprovarFinalizacao, revogarAprovacao, useAprovacoes, temAmbasAprovacoes,
  aguardandoAprovacao, useObrasAguardandoIds, liberarEdicao, usePodeEditarFinalizada,
  getLiberacao, registrarAlteracaoFinalizada,
} from "@/lib/obras-finalizacao-store";
import { garantirAtendimentosPorEncerramento } from "@/lib/posvenda-store";
import { useHistorico } from "@/lib/audit-store";
import { useIsAdmin } from "@/lib/auth-store";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { PageHeader } from "@/components/app/PageHeader";
import { EnterpriseRecordToolbar, RowActions, ModuloHistoricoDrawer } from "@/components/app/enterprise";
import { exportToCSV } from "@/components/app/grid/EnterpriseDataGrid";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionsMenu } from "@/components/app/ActionsMenu";
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import {
  obras as obrasSeed, pendencias as pendenciasSeed, equipes as equipesSeed,
  produtividadeEquipe, diasPrevistos, registrarHistoricoExec,
} from "@/lib/mock-data";
import { toast } from "sonner";
import { useTabFromHash } from "@/lib/route-tabs";
import { setObrasSnapshot, type ObraSnapshot } from "@/lib/obras-snapshot-store";
import { ObraCustosCard } from "@/components/app/engenharia/ObraCustosCard";
import { ObraMateriaisCard } from "@/components/app/engenharia/ObraMateriaisCard";
import { RastreabilidadeObraCard } from "@/components/app/rastreabilidade/RastreabilidadeObraCard";
import {
  garantirNecessidadeObra,
  recalcularNecessidade,
  arquivarNecessidade,
  useEstoqueState,
  isMaterialEntregueTotal,
} from "@/lib/estoque-store";
import { addCliente, useClientesAll } from "@/lib/clientes-store";
import { fmtInversorNumero } from "@/lib/inversor-fmt";
import { useEquipes, setEquipes as setEquipesStore } from "@/lib/equipes-store";
import { useAuth } from "@/lib/auth-store";
import { useObrasReais } from "@/lib/repositories/use-obras-reais";
import { type ObraRow, projetoContratoIdOf } from "@/lib/repositories/obras-repo";
import { featureFlags } from "@/lib/feature-flags";

import { ColunasManager, ColunasButton, KanbanGeneric, useKanbanColumns, type KCol, type KItem } from "@/components/app/KanbanColumns";

export const Route = createFileRoute("/engenharia")({
  head: () => ({ meta: [{ title: "Engenharia — Meta Sun Gerencial" }] }),
  component: EngenhariaPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const TELHADOS = ["Fibrocimento", "Cerâmica", "Metálico", "Solo", "Laje", "Outro"];
const STATUS = ["Executando instalação", "Aguardando instalação", "Em projeto/aprovação", "Standby", "Finalizado"];
const STATUS_EDITAVEL = ["Executando instalação", "Aguardando instalação", "Em projeto/aprovação", "Standby"];
const STATUS_RANK: Record<string, number> = {
  "Executando instalação": 0,
  "Aguardando instalação": 1,
  "Em projeto/aprovação": 2,
  "Standby": 3,
  "Finalizado": 4,
};
const STATUS_ROW_BG: Record<string, string> = {
  "Executando instalação": "bg-success/5 hover:bg-success/10",
  "Aguardando instalação": "bg-warning/5 hover:bg-warning/10",
  "Em projeto/aprovação": "bg-info/5 hover:bg-info/10",
  "Standby": "bg-muted/40 hover:bg-muted/60",
  "Finalizado": "",
};

/** Status do Kanban que ainda NÃO entram no Cronograma (fase pré-elaboração). */
const STATUS_PRE_CRONOGRAMA = new Set<string>([
  "Novo projeto", "Novo projeto - PF", "Novo projeto - PJ",
  "Stand-by", "Standby",
  "Vistoria pós contrato", "Vistoria pré contrato",
  "Estudos",
]);
/** Uma obra só aparece no Cronograma a partir de "Elaboração de projeto". */
function elegivelCronograma(status: string): boolean {
  return !STATUS_PRE_CRONOGRAMA.has(status) && status !== "Finalizado" && status !== "Contrato cancelado";
}

function fmtBR(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
function fmtContrato(id?: string): string {
  if (!id) return "";
  const m = id.match(/(\d{1,4})\s*$/);
  if (!m) return id;
  return `${String(parseInt(m[1], 10)).padStart(3, "0")}/2026`;
}
function addDaysISO(iso: string, days: number): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Obra = (typeof obrasSeed)[number] & {
  ordem: number; inv2: string; inv3: string; telhadoTipo: string;
  painelW: number;
  tipo?: string;
  inicioReal?: string; fimReal?: string;
  aguardandoLiberacaoFin?: boolean;
};


const PAINEL_W_DEFAULT = 550;
const PAINEIS_W_OPCOES = [450, 500, 540, 550, 565, 575, 585, 600, 610, 620, 630, 650, 665, 700];

function calcKwp(modulos: number, painelW: number): number {
  return Math.round(((modulos || 0) * (painelW || 0)) / 1000 * 100) / 100;
}

function enrichObras(): Obra[] {
  return obrasSeed.map((o, i) => {
    const painelW = o.modulos > 0 ? Math.round((o.potencia * 1000) / o.modulos / 5) * 5 : PAINEL_W_DEFAULT;
    return {
      ...o,
      ordem: i + 1,
      inv2: "",
      inv3: "",
      painelW: painelW || PAINEL_W_DEFAULT,
      telhadoTipo: o.telhado === "Cerâmico" ? "Cerâmica" : o.telhado === "Metálico" ? "Metálico" : o.telhado === "Fibrocimento" ? "Fibrocimento" : "Outro",
      inicioReal: o.status === "Finalizado" ? o.inicio : undefined,
      fimReal: o.status === "Finalizado" ? (o.finalizacao ?? undefined) : undefined,
    };
  });
}

/** Converte um projeto aprovado do Comercial em uma "Obra" da Engenharia. */
function projetoToObra(p: ProjetoVinculado, c: ContratoFull, ordem: number): Obra {
  // Regra de nascimento na Engenharia:
  // - Contrato com financiamento ainda NÃO liberado pelo setor de Financiamentos → "Stand-by"
  //   (badge "AGUARDANDO LIBERAÇÃO DO FINANCIAMENTO" — não inicia execução / não libera obra).
  // - Após o Financiamentos marcar "Pode liberar Engenharia" (ou aditivo trocar a forma
  //   de pagamento), promove automaticamente para "Novo projeto".
  // - Qualquer outra forma de pagamento → "Novo projeto" desde o início.
  const temFinanciamento = c.possuiFinanciamento === true
    || c.pagamentoTipo === "Financiamento"
    || /financiamento/i.test(c.pagamento ?? "");
  const financiamentoLiberado = !!c.financiamentoLiberadoEng;
  const aguardandoLiberacaoFin = temFinanciamento && !financiamentoLiberado;
  const statusInicial = aguardandoLiberacaoFin ? "Stand-by" : "Novo projeto";

  let status = p.status || statusInicial;
  // Trava operacional: enquanto o financiamento não liberar, força Stand-by.
  if (aguardandoLiberacaoFin) status = "Stand-by";
  // Promoção automática: liberou financiamento e estava parado em Stand-by → Novo projeto.
  else if (temFinanciamento && financiamentoLiberado && (status === "Stand-by" || status === "Standby")) {
    status = "Novo projeto";
  }

  return {
    id: p.id,
    contrato: c.id,
    cliente: c.cliente,
    equipe: "",
    modulos: p.modulos,
    potencia: p.kwp,
    inversor: p.inversor || "",
    inicio: p.inicio || "",
    previsto: p.previsto || "",
    finalizacao: null,
    status,
    telhado: "Outro",
    obs: p.obs || "",
    ordem,
    inv2: p.inv2 || "",
    inv3: p.inv3 || "",
    painelW: p.potenciaModuloW || PAINEL_W_DEFAULT,
    telhadoTipo: "Outro",
    tipo: p.tipo || "",
    aguardandoLiberacaoFin,
  } as Obra;

}

function EngenhariaPage() {
  const contratos = useContratos();
  const [obras, setObras] = useState<Obra[]>(() => enrichObras());
  const [pends, setPends] = useState(pendenciasSeed);
  const equipes = useEquipes();
  const setEquipes = setEquipesStore;
  const [tab, setTab] = useTabFromHash("/engenharia");
  const clientesAll = useClientesAll();
  const [histOpen, setHistOpen] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // ONDA B — Engenharia Real (leitura Supabase + dedup com seed/mock)
  // ────────────────────────────────────────────────────────────────
  const flagObrasSupabase = featureFlags.ENG_OBRAS_SUPABASE;
  const { obras: obrasReais, error: obrasReaisError, reload: reloadObrasReais } = useObrasReais(flagObrasSupabase);
  const [sessionInfo, setSessionInfo] = useState<{ userId: string | null; email: string | null }>({ userId: null, email: null });
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSessionInfo({
        userId: data.session?.user?.id ?? null,
        email: data.session?.user?.email ?? null,
      });
    };
    sync();
    return () => { alive = false; };
  }, [obrasReais]);
  useEffect(() => {
    if (obrasReaisError) {
      console.warn("[engenharia] obras-repo erro (mantendo seed):", obrasReaisError);
    }
  }, [obrasReaisError]);


  useEffect(() => {
    console.info("[engenharia] hook final", {
      flagObrasSupabase,
      total: obrasReais.length,
      rows: obrasReais.map((row) => debugRowPipeline(row)),
      target: obrasReais.find((row) => row.codigo === DEBUG_OBRA_CODIGO)
        ? obrasReais.filter((row) => row.codigo === DEBUG_OBRA_CODIGO).map((row) => debugRowPipeline(row))
        : null,
    });
  }, [flagObrasSupabase, obrasReais]);

  useEffect(() => {
    if (!flagObrasSupabase) return;
    console.info("[engenharia] obras reais recebidas:", obrasReais.length, obrasReais.map(o => ({ id: o.id, codigo: o.codigo, status: o.status })));
    setObras((cur) => {
      // Dedup: por ID direto OU por bridge dados.projeto_contrato_id ↔ obra mock
      // que herdou o id do projeto (caso projetoToObra).
      const curById = new Map(cur.map((o) => [o.id, o]));
      let mudou = false;
      const merged: Obra[] = [...cur];
      console.info("[engenharia] merge:start", {
        mockCount: cur.length,
        realCount: obrasReais.length,
        mockRows: cur.map((o) => debugObraPipeline(o)),
        realRows: obrasReais.map((row) => debugRowPipeline(row)),
      });
      for (const r of obrasReais) {
        const projetoId = projetoContratoIdOf(r);
        // Já presente como obra-real?
        if (curById.has(r.id)) {
          console.info("[engenharia] descarte:dedup:id", debugRowPipeline(r));
          continue;
        }
        // Já presente como obra-mock vinda do Comercial (mesmo projeto)?
        if (projetoId && curById.has(projetoId)) {
          console.info("[engenharia] descarte:dedup:projeto", debugRowPipeline(r));
          continue;
        }
        // Normaliza status para uma coluna válida do Kanban da Engenharia.
        // O banco usa default 'Planejada' (genérico); mapeamos para 'Novo projeto'
        // que é a etapa inicial canônica do fluxo de engenharia.
        const STATUS_DB_MAP: Record<string, string> = {
          "Planejada": "Novo projeto",
          "planejada": "Novo projeto",
        };
        const dbStatus = r.status ?? "Novo projeto";
        const statusNorm = STATUS_DB_MAP[dbStatus] ?? (ETAPA_KEYS.includes(dbStatus) ? dbStatus : "Novo projeto");
        // Inserir adaptada
        const clienteNome = clientesAll.find((c) => c.id === r.cliente_id)?.nome
          ?? (r.cliente_id ? `Cliente ${String(r.cliente_id).slice(0, 8)}` : "—");
        const contratoLabel = r.contrato_id ?? r.codigo ?? "";
        const adapted: Obra = {
          id: r.id,
          contrato: contratoLabel,
          cliente: clienteNome,
          equipe: r.equipe ?? "",
          modulos: r.modulos_qtde ?? 0,
          potencia: Number(r.potencia_kwp ?? 0),
          inversor: r.inversor ?? "",
          inicio: r.data_inicio ?? "",
          previsto: "",
          finalizacao: r.data_finalizacao ?? null,
          status: statusNorm,
          telhado: r.telhado_tipo ?? "Outro",
          obs: [r.observacoes, `Código: ${r.codigo ?? "—"}`, `Obra: ${r.id}`, projetoId ? `Projeto: ${projetoId}` : null]
            .filter(Boolean).join(" · "),
          ordem: merged.length + 1,
          inv2: r.inv2 ?? "",
          inv3: r.inv3 ?? "",
          painelW: PAINEL_W_DEFAULT,
          telhadoTipo: r.telhado_tipo ?? "Outro",
          tipo: r.tipo ?? "",
        } as Obra;
        console.info("[engenharia] merge:add", debugRowPipeline(r, { cliente: clienteNome, contrato: contratoLabel, etapa: statusNorm }));
        merged.push(adapted);
        mudou = true;
      }
      console.info("[engenharia] merge:result", {
        mudou,
        total: merged.length,
        rows: merged.map((o) => debugObraPipeline(o)),
        target: merged.find((o) => o.obs?.includes(DEBUG_OBRA_CODIGO))
          ? merged.filter((o) => o.obs?.includes(DEBUG_OBRA_CODIGO)).map((o) => debugObraPipeline(o))
          : null,
      });
      return mudou ? merged : cur;
    });
  }, [flagObrasSupabase, obrasReais, clientesAll]);

  useEffect(() => {
    console.info("[engenharia] obras state final", {
      total: obras.length,
      rows: obras.map((o) => debugObraPipeline(o)),
      target: obras.find((o) => o.obs?.includes(DEBUG_OBRA_CODIGO))
        ? obras.filter((o) => o.obs?.includes(DEBUG_OBRA_CODIGO)).map((o) => debugObraPipeline(o))
        : null,
    });
  }, [obras]);


  // Auto-incorpora projetos aprovados no Comercial em Gestão de projetos
  useEffect(() => {
    const aprovados: { p: ProjetoVinculado; c: ContratoFull }[] = [];
    contratos.forEach((c) => {
      if (c.cancelado) return;
      (c.projetos ?? []).forEach((p) => {
        if (p.aprovado && p.enviadoEngenharia) aprovados.push({ p, c });
      });
    });
    setObras((cur) => {
      const ids = new Set(cur.map((o) => o.id));
      const news = aprovados.filter(({ p }) => !ids.has(p.id))
        .map(({ p, c }, i) => projetoToObra(p, c, cur.length + i + 1));
      // Remove obras cujo projeto foi retornado ao Comercial OU cujo contrato foi cancelado
      const validIds = new Set(aprovados.map(({ p }) => p.id));
      const filtered = cur.filter((o) => {
        const fromComercial = contratos.some((c) => (c.projetos ?? []).some((p) => p.id === o.id));
        return !fromComercial || validIds.has(o.id);
      });
      return news.length === 0 && filtered.length === cur.length ? cur : [...filtered, ...news];
    });
  }, [contratos]);

  // Auto-finalização: assim que houver as DUAS aprovações (engenharia + financeiro)
  // o sistema marca a obra como Finalizado automaticamente.
  const aguardandoIds = useObrasAguardandoIds();
  useEffect(() => {
    setObras((cur) => {
      let mudou = false;
      const finalizadosAgora: { id: string; cliente: string; contratoId?: string; data: string }[] = [];
      const next = cur.map((o) => {
        if (o.status !== "Finalizado" && temAmbasAprovacoes(o.id)) {
          mudou = true;
          const hoje = new Date().toISOString().slice(0, 10);
          finalizadosAgora.push({ id: o.id, cliente: o.cliente, contratoId: (o as any).contratoId, data: o.finalizacao ?? hoje });
          return {
            ...o,
            status: "Finalizado",
            finalizacao: o.finalizacao ?? hoje,
            fimReal: o.fimReal ?? hoje,
            inicioReal: o.inicioReal ?? o.inicio ?? hoje,
          };
        }
        return o;
      });
      // Gatilho de pós-venda — idempotente
      for (const f of finalizadosAgora) {
        try {
          garantirAtendimentosPorEncerramento({
            obraId: f.id, cliente: f.cliente, contratoId: f.contratoId,
            dataFinalizacaoISO: f.data,
          });
        } catch {}
      }
      return mudou ? next : cur;
    });
    // depende da lista de aguardando (proxy do estado de aprovações)
  }, [aguardandoIds.join(",")]);

  // ───────── Integração com Estoque ─────────
  // 1) Publica snapshot público das obras (consumido pelo módulo Estoque).
  // 2) Para obras ELEGÍVEIS ao Cronograma, garante uma "necessidade" e recalcula
  //    sempre que dados técnicos relevantes mudarem (módulos, inversores, telhado).
  // 3) Obras Finalizadas / removidas → arquiva a necessidade.
  useEffect(() => {
    const snap: ObraSnapshot[] = obras.map((o) => ({
      id: o.id, contrato: o.contrato, cliente: o.cliente, status: o.status,
      modulos: o.modulos, potencia: o.potencia,
      inversor: o.inversor, inv2: o.inv2, inv3: o.inv3,
      telhadoTipo: o.telhadoTipo, equipe: o.equipe, tipo: o.tipo,
      finalizacao: o.finalizacao,
    }));
    setObrasSnapshot(snap);
    for (const o of snap) {
      if (o.status === "Finalizado" || o.status === "Contrato cancelado") {
        arquivarNecessidade(o.id);
      } else if (elegivelCronograma(o.status)) {
        garantirNecessidadeObra(o);
        recalcularNecessidade(o);
      }
    }
    // dep simples baseada em uma assinatura serializada das obras
  }, [obras.map((o) => `${o.id}:${o.status}:${o.modulos}:${o.inversor}:${o.inv2}:${o.inv3}:${o.telhadoTipo}`).join("|")]);

  // ── D6.8 Onda 4: strip operacional + EnterpriseToolbar ──
  const totalObras = obras.length;
  const ativas = obras.filter((o) => o.status !== "Finalizado" && o.status !== "Contrato cancelado").length;
  const finalizadas = obras.filter((o) => o.status === "Finalizado").length;
  const standby = obras.filter((o) => o.status === "Stand-by" || o.status === "Standby").length;
  const executando = obras.filter((o) => o.status === "Executando instalação").length;
  const pendsAbertas = pends.filter((p: any) => !p.resolvida && p.status !== "Resolvida").length;
  const kwpAtivo = obras
    .filter((o) => o.status !== "Finalizado" && o.status !== "Contrato cancelado")
    .reduce((s, o) => s + (Number(o.potencia) || 0), 0);

  return (
    <>
      <PageHeader title="Engenharia" subtitle="Obras, equipes, cronograma e produtividade." />

      {/* Strip operacional denso (substitui DashboardReaisOverview que poluía a operação) */}
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-border/80 bg-muted/40 px-2.5 py-1.5 text-[11px]">
        <StripChip label="Obras" value={totalObras} tone="muted" />
        <StripChip label="Ativas" value={ativas} tone="info" />
        <StripChip label="Executando" value={executando} tone="success" />
        <StripChip label="Stand-by" value={standby} tone="warning" />
        <StripChip label="Finalizadas" value={finalizadas} tone="muted" />
        <span className="h-3.5 w-px bg-border/80" />
        <StripChip label="Pend. abertas" value={pendsAbertas} tone={pendsAbertas > 0 ? "danger" : "muted"} />
        <StripChip label="kWp ativo" value={`${kwpAtivo.toFixed(1)}`} tone="primary" />
        <StripChip label="Equipes" value={equipes.length} tone="muted" />
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/80">Engenharia · operação</span>
      </div>

      {/* D17.UI Fase 4 — Engenharia: barra Enterprise RM/TOTVS oficial */}
      <div className="mb-2">
        <EnterpriseRecordToolbar
          entityType="engenharia"
          selectedIds={[]}
          availableActions={["novo", "atualizar", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
          searchPlaceholder="Buscar obra, contrato, cliente, equipe…"
          onAction={(a) => {
            if (a === "atualizar") reloadObrasReais();
            else if (a === "novo") setTab("ativas");
            else if (a === "historico") setHistOpen(true);
            else if (a === "imprimir") window.print();
            else if (a === "exportar") {
              exportToCSV("obras-engenharia.csv", obras as any[], [
                { key: "id", label: "ID" },
                { key: "contrato", label: "Contrato" },
                { key: "cliente", label: "Cliente" },
                { key: "status", label: "Status" },
                { key: "equipe", label: "Equipe" },
                { key: "modulos", label: "Módulos" },
                { key: "potencia", label: "kWp" },
                { key: "inicio", label: "Início" },
                { key: "previsto", label: "Previsto" },
                { key: "finalizacao", label: "Finalização" },
              ]);
            }
            else if (a === "colunas") toast.info("Gestor de colunas chega em D17.UI.4.");
            else if (a === "filtroAvancado") toast.info("Use os filtros internos das abas — filtros avançados em D17.UI.4.");
          }}
        />
      </div>
      {(() => {
        const targetReal = obrasReais.find((r) => r.codigo === DEBUG_OBRA_CODIGO);
        const targetMerged = obras.find((o) => o.obs?.includes(DEBUG_OBRA_CODIGO));
        const sessionOk = !!sessionInfo.userId;
        const tone = !sessionOk
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : targetMerged
            ? "border-emerald-400/40 bg-emerald-50 text-emerald-900"
            : "border-amber-400/40 bg-amber-50 text-amber-900";
        return (
          <div className={`mb-3 rounded-md border p-2 text-[11px] font-mono ${tone}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><b>ONDA B · diag</b></span>
              <span>sessão: {sessionOk ? `OK (${sessionInfo.email ?? sessionInfo.userId})` : "AUSENTE — faça login"}</span>
              <span>flag: {String(flagObrasSupabase)}</span>
              <span>obras reais (RLS): <b>{obrasReais.length}</b></span>
              <span>OBR-…710ec4 no fetch: <b>{targetReal ? "SIM" : "NÃO"}</b></span>
              <span>OBR-…710ec4 no merge: <b>{targetMerged ? `SIM (col=${targetMerged.status})` : "NÃO"}</b></span>
              {obrasReaisError ? <span className="text-destructive">erro: {obrasReaisError}</span> : null}
              <button
                type="button"
                className="ml-auto rounded border px-2 py-0.5 text-[10px] hover:bg-background"
                onClick={() => reloadObrasReais()}
              >
                Recarregar obras
              </button>
            </div>
            {!sessionOk ? (
              <div className="mt-1">
                Sem sessão autenticada, o RLS de <code>public.obras</code> retorna 0 linhas.
                Abra <code>/auth</code> ou <code>/login</code>, autentique e volte para esta tela.
              </div>
            ) : null}
          </div>
        );
      })()}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>

          <TabsTrigger value="ativas">Gestão de projetos</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="produtividade">Produtividade</TabsTrigger>
          <TabsTrigger value="finalizados">Finalizados</TabsTrigger>
          <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5"><DashboardEng obras={obras} pends={pends} equipes={equipes} setObras={setObras} /></TabsContent>
        <TabsContent value="ativas" className="mt-5">
          <Tabs defaultValue="gestao">
            <TabsList>
              <TabsTrigger value="gestao">Gestão cronograma</TabsTrigger>
              <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            </TabsList>
            <TabsContent value="gestao" className="mt-4">
              <ObrasAtivasTab obras={obras} setObras={setObras} equipes={equipes} contratos={contratos} />
            </TabsContent>
            <TabsContent value="cronograma" className="mt-4">
              <CronogramaTab obras={obras} setObras={setObras} pends={pends} equipes={equipes} />
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="kanban" className="mt-5"><KanbanTab obras={obras} setObras={setObras} /></TabsContent>
        <TabsContent value="pendencias" className="mt-5"><PendenciasTab pends={pends} setPends={setPends} equipes={equipes} obras={obras} /></TabsContent>
        <TabsContent value="equipes" className="mt-5"><EquipesTab equipes={equipes} setEquipes={setEquipes} obras={obras} pends={pends} /></TabsContent>
        <TabsContent value="produtividade" className="mt-5"><ProdutividadeTab obras={obras} pends={pends} equipes={equipes} /></TabsContent>
        <TabsContent value="finalizados" className="mt-5"><FinalizadosTab obras={obras} setObras={setObras} /></TabsContent>
        <TabsContent value="cancelados" className="mt-5"><CanceladosEngTab contratos={contratos} /></TabsContent>

      </Tabs>

      <ModuloHistoricoDrawer
        open={histOpen}
        onOpenChange={setHistOpen}
        titulo="Engenharia"
        modulos={["comercial"]}
        entidades={["obra", "projeto"]}
      />
    </>
  );
}

/* ---------------- DASHBOARD ---------------- */

function DashboardEng({
  obras, pends, equipes, setObras,
}: { obras: Obra[]; pends: typeof pendenciasSeed; equipes: typeof equipesSeed; setObras: (v: Obra[]) => void }) {
  const ativas = obras.filter((o) => o.status !== "Finalizado");
  const exec = obras.filter((o) => o.status === "Executando instalação");
  const aguard = obras.filter((o) => o.status === "Aguardando instalação");
  const projeto = obras.filter((o) => o.status === "Em projeto/aprovação");
  const standby = obras.filter((o) => o.status === "Standby");
  const fin = obras.filter((o) => o.status === "Finalizado");
  const pendsAbertas = pends.filter((p) => p.status === "Aguardando resolução");

  const [openModal, setOpenModal] = useState<null | string>(null);

  const sets: Record<string, Obra[]> = {
    ativas, exec, aguard, projeto, standby, fin,
  };
  const titles: Record<string, string> = {
    ativas: "Gestão de projetos", exec: "Executando instalação", aguard: "Aguardando instalação",
    projeto: "Em projeto/elaboração", standby: "Standby", fin: "Finalizadas",
  };

  const updateStatus = (id: string, status: string) => {
    setObras(obras.map((o) => o.id === id ? { ...o, status, finalizacao: status === "Finalizado" ? new Date().toISOString().slice(0,10) : null } : o));
    toast.success(`${id} → ${status}`);
  };

  const porStatus = STATUS.map((s) => ({ name: s, qtd: obras.filter((o) => o.status === s).length }));
  const totalStatus = porStatus.reduce((s, x) => s + x.qtd, 0) || 1;
  const ATIVOS_STATUS = ["Executando instalação", "Aguardando instalação", "Em projeto/aprovação", "Standby"];
  const porEquipe = equipes.map((e) => {
    const obs = obras.filter((o) => o.equipe === e.nome && ATIVOS_STATUS.includes(o.status));
    return {
      nome: e.nome,
      obras: obs.length,
      modulos: obs.reduce((s,o)=>s+o.modulos, 0),
      kwp: Math.round(obs.reduce((s,o)=>s+(o.potencia||0), 0) * 10) / 10,
    };
  });
  const finalizadosPorEquipe = equipes.map((e) => {
    const obs = obras.filter((o) => o.equipe === e.nome && o.status === "Finalizado");
    return {
      nome: e.nome,
      obras: obs.length,
      modulos: obs.reduce((s,o)=>s+o.modulos, 0),
      kwp: Math.round(obs.reduce((s,o)=>s+(o.potencia||0), 0) * 10) / 10,
    };
  }).sort((a,b)=>b.obras-a.obras);
  const pendPorEquipe = equipes.map((e) => ({ nome: e.nome, qtd: pends.filter((p) => p.equipe === e.nome && p.status === "Aguardando resolução").length }));

  const renderPieLabel = (entry: any) => {
    const pct = ((entry.qtd / totalStatus) * 100).toFixed(0);
    return `${entry.qtd} (${pct}%)`;
  };

  const aguardandoIds = useObrasAguardandoIds();
  const aguardando = obras.filter((o) => aguardandoIds.includes(o.id));

  return (
    <>
      {aguardando.length > 0 && (
        <Card className="mb-4 border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-warning">
                {aguardando.length} obra(s) aguardando aprovação de finalização
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {aguardando.slice(0, 5).map((o) => o.cliente).join(" · ")}
                {aguardando.length > 5 ? " · …" : ""}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Necessário aprovação da Engenharia <strong>e</strong> do Financeiro/Diretoria. Quando ambas existirem, a obra é finalizada automaticamente.
              </div>
            </div>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard label="Gestão de projetos" value={ativas.length} hint={`${ativas.reduce((s,o)=>s+o.modulos,0)} módulos · ${ativas.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp`} icon={HardHat} tone="primary" onView={() => setOpenModal("ativas")} />
        <StatCard label="Executando" value={exec.length} hint={`${exec.reduce((s,o)=>s+o.modulos,0)} módulos · ${exec.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp`} icon={Wrench} tone="success" onView={() => setOpenModal("exec")} />
        <StatCard label="Aguardando" value={aguard.length} hint={`${aguard.reduce((s,o)=>s+o.modulos,0)} módulos · ${aguard.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp`} icon={Clock} tone="warning" onView={() => setOpenModal("aguard")} />
        <StatCard label="Em projeto" value={projeto.length} hint={`${projeto.reduce((s,o)=>s+o.modulos,0)} módulos · ${projeto.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp`} icon={Wrench} tone="info" onView={() => setOpenModal("projeto")} />
        <StatCard label="Standby" value={standby.length} hint={`${standby.reduce((s,o)=>s+o.modulos,0)} módulos · ${standby.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp`} icon={Clock} tone="muted" onView={() => setOpenModal("standby")} />
        <StatCard label="Finalizadas" value={fin.length} hint={`${fin.reduce((s,o)=>s+o.modulos,0)} módulos · ${fin.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp`} icon={CheckCircle2} tone="success" onView={() => setOpenModal("fin")} />
        <StatCard label="Pendências abertas" value={pendsAbertas.length} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Equipes" value={equipes.length} icon={Users} tone="info" />
      </div>

      <ObrasModal open={openModal !== null} onClose={() => setOpenModal(null)} title={openModal ? titles[openModal] : ""} obras={openModal ? sets[openModal] : []} onUpdateStatus={updateStatus} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Obras por status</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porStatus} dataKey="qtd" nameKey="name" innerRadius={50} outerRadius={95} label={renderPieLabel} labelLine={true}>
                {porStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(value: any, name: any) => [`${value} (${((Number(value)/totalStatus)*100).toFixed(0)}%)`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">Obras × módulos × kWp por equipe</div>
          <div className="mb-3 text-[11px] text-muted-foreground">Operação atual — exclui obras finalizadas</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porEquipe}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="obras" name="Obras" fill="var(--chart-1)" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="modulos" name="Módulos" fill="var(--chart-2)" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="kwp" name="kWp" fill="var(--chart-3)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Histórico de finalizados por equipe</div>
            <div className="text-[11px] text-muted-foreground">
              Total: {finalizadosPorEquipe.reduce((s,x)=>s+x.obras,0)} obras · {finalizadosPorEquipe.reduce((s,x)=>s+x.modulos,0)} módulos · {finalizadosPorEquipe.reduce((s,x)=>s+x.kwp,0).toFixed(1)} kWp
            </div>
          </div>
          <div className="mb-3 text-[11px] text-muted-foreground">Capacidade entregue acumulada — base: Engenharia &gt; Finalizados</div>
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={finalizadosPorEquipe}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="obras" name="Obras" fill="var(--chart-4)" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="modulos" name="Módulos" fill="var(--chart-2)" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="kwp" name="kWp" fill="var(--chart-3)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Ranking por equipe</div>
              <div className="space-y-1.5">
                {finalizadosPorEquipe.map((e, i) => (
                  <div key={e.nome} className="flex items-center gap-2 rounded bg-background/60 px-2 py-1.5 text-xs">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i+1}</span>
                    <span className="flex-1 truncate font-medium">{e.nome}</span>
                    <span className="text-muted-foreground">{e.obras} obras</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{e.modulos} mód</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-semibold">{e.kwp.toFixed(1)} kWp</span>
                  </div>
                ))}
                {finalizadosPorEquipe.every(e=>e.obras===0) && (
                  <div className="py-4 text-center text-[11px] text-muted-foreground">Nenhuma obra finalizada ainda.</div>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Pendências por equipe</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pendPorEquipe}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="qtd" fill="var(--chart-5)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Produtividade média por equipe (módulos/dia)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={produtividadeEquipe.map(p => ({ equipe: p.equipe, media: p.mediaDia }))}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="equipe" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="media" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function ObrasModal({
  open, onClose, title, obras, onUpdateStatus,
}: { open: boolean; onClose: () => void; title: string; obras: Obra[]; onUpdateStatus: (id: string, status: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-[1400px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{obras.length} obra(s) · {obras.reduce((s,o)=>s+o.modulos,0)} módulos · {obras.reduce((s,o)=>s+o.potencia,0).toFixed(1)} kWp</DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Obra</TableHead><TableHead>Cliente</TableHead><TableHead>Equipe</TableHead>
            <TableHead className="text-center">Mód.</TableHead><TableHead className="text-right">kWp</TableHead>
            <TableHead>Início</TableHead><TableHead>Previsto</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {obras.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
                <TableCell className="font-medium">{o.cliente}</TableCell>
                <TableCell>{o.equipe}</TableCell>
                <TableCell className="text-center">{o.modulos}</TableCell>
                <TableCell className="text-right">{o.potencia.toFixed(1)}</TableCell>
                <TableCell className="text-muted-foreground">{o.inicio}</TableCell>
                <TableCell className="text-muted-foreground">{o.previsto}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => onUpdateStatus(o.id, v)}>
                    <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {obras.length===0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma obra</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- OBRAS ATIVAS ---------------- */

function ObrasAtivasTab({
  obras, setObras, equipes, contratos,
}: { obras: Obra[]; setObras: (v: Obra[]) => void; equipes: typeof equipesSeed; contratos: ContratoFull[] }) {
  const [equipe, setEquipe] = useState("todas");
  const [editing, setEditing] = useState<Obra | null>(null);

  const list = obras
    .filter((o) => elegivelCronograma(o.status))
    .filter((o) => equipe === "todas" || o.equipe === equipe)
    .sort((a, b) => {
      const r = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
      return r !== 0 ? r : a.ordem - b.ordem;
    });

  const save = (id: string, patch: Partial<Obra>) => {
    const next = obras.map((o) => o.id === id ? { ...o, ...patch } : o);
    const target = next.find((o) => o.id === id)!;
    setObras(chainSchedule(next, target.equipe, target.status));
    // Sincroniza com o projeto do Comercial (se aplicável)
    const link = findProjetoLink(id, contratos);
    if (link) {
      updateProjeto(link.contratoId, id, {
        modulos: target.modulos,
        kwp: target.potencia,
        potenciaModuloW: target.painelW,
        inversor: target.inversor,
        inv2: target.inv2,
        inv3: target.inv3,
        equipe: target.equipe,
        inicio: target.inicio,
        previsto: target.previsto,
        status: target.status,
        obs: target.obs,
      });
    }
    setEditing(null);
    toast.success("Obra atualizada");
  };

  const retornar = (id: string) => {
    const link = findProjetoLink(id, contratos);
    if (!link) {
      toast.error("Esta obra não está vinculada a um projeto do Comercial");
      return;
    }
    retornarProjetoComercial(link.contratoId, id);
    setObras(obras.filter((o) => o.id !== id));
    setEditing(null);
    toast.success("Obra retornada ao Comercial para edição");
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <Select value={equipe} onValueChange={setEquipe}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as equipes</SelectItem>
            {equipes.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          Toda obra é gerada automaticamente pelo Comercial após aprovação.
        </div>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="w-[80px]">Opções</TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Contrato</TableHead>
            <TableHead>Projeto</TableHead>
            <TableHead className="text-center">Mód.</TableHead>
            <TableHead>INV</TableHead><TableHead>INV2</TableHead><TableHead>INV3</TableHead>
            <TableHead>Telhado</TableHead><TableHead>Equipe</TableHead>
            <TableHead>Início</TableHead><TableHead>Finalização</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {list.map((o, idx) => {
              const link = findProjetoLink(o.id, contratos);
              return (
              <TableRow key={o.id} className={STATUS_ROW_BG[o.status] || ""}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <ActionsMenu>
                      <DropdownMenuItem onSelect={() => setEditing(o)}>
                        <SquarePen className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      {link && (
                        <DropdownMenuItem
                          onSelect={() => {
                            if (window.confirm(`Retornar o projeto de ${o.cliente} para o Comercial? Ele sairá da Engenharia e poderá ser editado e ter aprovação revogada no Comercial.`)) {
                              retornar(o.id);
                            }
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4 text-warning" />
                          <span className="text-warning">Retornar ao Comercial</span>
                        </DropdownMenuItem>
                      )}
                    </ActionsMenu>
                    <AnexosButton
                      entidade="obras"
                      entidadeId={o.id}
                      titulo={`Anexos · Obra ${o.id.slice(0, 8)}`}
                      descricao={o.cliente ? `Cliente: ${o.cliente}` : undefined}
                      categoriaPadrao="foto_obra"
                    />
                  </div>
                </TableCell>
                <TableCell className="font-bold text-primary">{idx + 1}</TableCell>
                <TableCell className="font-medium">{o.cliente}</TableCell>
                <TableCell className="text-xs">{o.tipo || <span className="font-mono text-muted-foreground">{o.id}</span>}</TableCell>
                <TableCell className="text-center">{o.modulos}</TableCell>
                <TableCell className="text-xs">{fmtInversorNumero(o.inversor)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{o.inv2 ? fmtInversorNumero(o.inv2) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{o.inv3 ? fmtInversorNumero(o.inv3) : "—"}</TableCell>
                <TableCell className="text-xs">{o.telhadoTipo}</TableCell>
                <TableCell className="text-xs">{o.equipe || "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{o.inicioReal ? fmtBR(o.inicioReal) : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{o.fimReal ? fmtBR(o.fimReal) : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
              </TableRow>
              );
            })}
            {list.length === 0 && <TableRow><TableCell colSpan={13} className="py-10 text-center text-muted-foreground">Nenhuma obra ativa</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
        Para alterar qualquer campo (módulos, inversores, status, finalizar), use o lápis <SquarePen className="inline h-3 w-3" /> editar.
      </div>
      <EditObraDialog
        obra={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        onRetornar={retornar}
        equipes={equipes}
        fromComercial={!!editing && !!findProjetoLink(editing.id, contratos)}
      />
    </Card>
  );
}

function findProjetoLink(obraId: string, contratos: ContratoFull[]): { contratoId: string } | null {
  for (const c of contratos) {
    if ((c.projetos ?? []).some((p) => p.id === obraId)) return { contratoId: c.id };
  }
  return null;
}

function EditObraDialog({
  obra, onClose, onSave, onRetornar, equipes, fromComercial,
}: { obra: Obra | null; onClose: () => void; onSave: (id: string, patch: Partial<Obra>) => void; onRetornar?: (id: string) => void; equipes: typeof equipesSeed; fromComercial?: boolean }) {
  const [form, setForm] = useState<Partial<Obra>>({});
  const [confirming, setConfirming] = useState(false);
  const [confirmRet, setConfirmRet] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const { role, user } = useAuth();
  const isAdminMaster = role === "admin_master";
  const isAdmin = useIsAdmin();
  const usuario = user?.email ?? "usuário";

  // Hooks reativos — sempre executam, mesmo quando obra é null (usam id seguro)
  const obraId = obra?.id ?? "__none__";
  const aprov = useAprovacoes(obraId);
  const edicaoLiberada = usePodeEditarFinalizada(obraId);
  const liberacao = obra ? getLiberacao(obraId) : undefined;

  // re-init when obra changes
  if (obra && form.id !== obra.id) {
    setTimeout(() => { setForm({ ...obra }); setAdminMode(false); }, 0);
  }
  if (!obra) return null;

  const f = { ...obra, ...form };
  const modulos = Number(f.modulos ?? 0);
  const painelW = Number(f.painelW ?? PAINEL_W_DEFAULT);
  const kwpAuto = calcKwp(modulos, painelW);
  const previsaoInicio = f.inicio || "";
  const previsaoFim = recalcPrevisto(previsaoInicio, f.equipe || "", modulos);

  const isFinalizado = obra.status === "Finalizado";
  const isExecutando = f.status === "Executando instalação";
  const isAguardando = f.status === "Aguardando instalação";
  const equipeAllowed = (isExecutando || isAguardando) && (!isFinalizado || edicaoLiberada);
  const equipeRequired = isExecutando;
  const equipeMissing = equipeRequired && !(f.equipe ?? "").trim();
  const realDatesEditable = adminMode && isAdminMaster && (!isFinalizado || edicaoLiberada);

  // Edição bloqueada quando obra finalizada e sem liberação ativa
  const camposBloqueados = isFinalizado && !edicaoLiberada;

  const aguardandoFinalizacao = aguardandoAprovacao(obraId);

  const trySave = () => {
    if (camposBloqueados) {
      toast.error("Obra finalizada. Solicite liberação de edição para alterar.");
      return;
    }
    if (isExecutando || isAguardando) {
      const faltam: string[] = [];
      if (!(modulos > 0)) faltam.push("quantidade de módulos");
      if (!(painelW > 0)) faltam.push("potência do painel");
      if (!(f.telhadoTipo ?? "").trim() || f.telhadoTipo === "Outro") faltam.push("telhado");
      const hasInv = [f.inversor, f.inv2, f.inv3].some((x) => (x ?? "").trim() !== "");
      if (!hasInv) faltam.push("ao menos 1 inversor");
      if (faltam.length) {
        toast.error(`Para enviar para "${f.status}" preencha: ${faltam.join(", ")}`);
        return;
      }
    }
    if (equipeMissing) {
      toast.error("Equipe é obrigatória quando o status é Executando instalação");
      return;
    }
    setConfirming(true);
  };

  const confirm = () => {
    // Para obras finalizadas: manter status FINALIZADO e datas históricas
    const patch: Partial<Obra> = isFinalizado ? {
      modulos, painelW, potencia: kwpAuto,
      inversor: f.inversor, inv2: f.inv2, inv3: f.inv3, telhadoTipo: f.telhadoTipo,
      equipe: f.equipe, obs: f.obs,
      // status, inicio, finalizacao, fimReal, inicioReal NÃO mudam
    } : {
      modulos, painelW, potencia: kwpAuto,
      inversor: f.inversor, inv2: f.inv2, inv3: f.inv3, telhadoTipo: f.telhadoTipo,
      equipe: f.equipe, inicio: f.inicio, status: f.status, obs: f.obs,
      inicioReal: f.inicioReal, fimReal: f.fimReal,
      previsto: previsaoFim,
    };
    // Histórico de produtividade — apenas quando datas reais completas (modo normal)
    if (!isFinalizado && f.inicioReal && f.fimReal && f.equipe && modulos > 0) {
      const ini = new Date(f.inicioReal + "T00:00:00");
      const fim = new Date(f.fimReal + "T00:00:00");
      const dias = Math.max(1, Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1);
      registrarHistoricoExec(f.equipe, { fimReal: f.fimReal, modulos, dias });
    }
    // Registrar diff em obras finalizadas (histórico automático)
    if (isFinalizado) {
      const diffs: Array<{ campo: string; antes?: string; depois?: string }> = [];
      const check = (campo: string, antes: any, depois: any) => {
        if (String(antes ?? "") !== String(depois ?? "")) {
          diffs.push({ campo, antes: String(antes ?? "—"), depois: String(depois ?? "—") });
        }
      };
      check("Módulos", obra.modulos, modulos);
      check("Painel (W)", obra.painelW, painelW);
      check("Potência (kWp)", obra.potencia, kwpAuto);
      check("Inversor 1", obra.inversor, f.inversor);
      check("Inversor 2", obra.inv2, f.inv2);
      check("Inversor 3", obra.inv3, f.inv3);
      check("Telhado", obra.telhadoTipo, f.telhadoTipo);
      check("Equipe", obra.equipe, f.equipe);
      check("Observações", obra.obs, f.obs);
      if (diffs.length > 0) {
        registrarAlteracaoFinalizada(obra.id, usuario, diffs, { cliente: obra.cliente });
      }
    }
    onSave(obra.id, patch);
    setConfirming(false);
    setForm({});
  };

  const handleAprovar = (setor: "engenharia" | "financeiro") => {
    aprovarFinalizacao(obra.id, setor, usuario, { cliente: obra.cliente });
    toast.success(`Aprovação ${setor === "engenharia" ? "Engenharia" : "Financeiro/Diretoria"} registrada`);
  };

  const handleRevogar = (setor: "engenharia" | "financeiro") => {
    revogarAprovacao(obra.id, setor, usuario);
    toast.info("Aprovação revogada");
  };

  const handleLiberarEdicao = () => {
    liberarEdicao(obra.id, usuario);
    toast.success("Edição liberada até o fim do dia");
  };

  return (
    <Dialog open={!!obra} onOpenChange={(v) => { if (!v) { onClose(); setForm({}); setConfirming(false); } }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar obra · {obra.cliente}</DialogTitle>
          <DialogDescription>Contrato {fmtContrato(obra.contrato)} · #{obra.ordem}</DialogDescription>
        </DialogHeader>

        {/* Alerta visual quando obra finalizada */}
        {isFinalizado && (
          <div className={`rounded-md border p-3 text-xs ${edicaoLiberada ? "border-success/40 bg-success/10" : "border-muted bg-muted/30"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {edicaoLiberada ? <Unlock className="h-4 w-4 text-success" /> : <Lock className="h-4 w-4" />}
              {edicaoLiberada
                ? `Edição liberada até ${liberacao ? new Date(liberacao.validoAteISO).toLocaleString("pt-BR") : "fim do dia"}`
                : "Obra FINALIZADA — campos bloqueados"}
            </div>
            <div className="mt-1 text-muted-foreground">
              Obras finalizadas não voltam etapa nem saem dos Finalizados. Para ajustar, libere a edição (válida até o fim do dia). Toda alteração gera registro automático no histórico.
            </div>
            {!edicaoLiberada && (
              <Button size="sm" variant="outline" className="mt-2" onClick={handleLiberarEdicao}>
                <Unlock className="mr-2 h-3.5 w-3.5" /> Liberar edição (até o fim do dia)
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div><Label>Qtd módulos</Label><Input type="number" value={f.modulos ?? ""} disabled={camposBloqueados} onChange={(e) => setForm({ ...form, modulos: Number(e.target.value) })} /></div>
          <div>
            <Label>Potência do painel (W)</Label>
            <Select value={String(painelW)} onValueChange={(v) => setForm({ ...form, painelW: Number(v) })} disabled={camposBloqueados}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAINEIS_W_OPCOES.map((w) => <SelectItem key={w} value={String(w)}>{w}W</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-1">Potência (kWp) <span className="text-[10px] text-muted-foreground">(auto)</span></Label>
            <Input type="number" value={kwpAuto} disabled readOnly className="bg-muted/40" />
            <div className="mt-1 text-[10px] text-muted-foreground">{modulos} × {painelW}W ÷ 1000</div>
          </div>
          <div><Label>Telhado</Label>
            <Select value={f.telhadoTipo} onValueChange={(v) => setForm({ ...form, telhadoTipo: v })} disabled={camposBloqueados}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TELHADOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Inversor 1</Label><Input value={f.inversor ?? ""} disabled={camposBloqueados} onChange={(e) => setForm({ ...form, inversor: e.target.value })} /></div>
          <div><Label>Inversor 2</Label><Input value={f.inv2 ?? ""} disabled={camposBloqueados} onChange={(e) => setForm({ ...form, inv2: e.target.value })} /></div>
          <div><Label>Inversor 3</Label><Input value={f.inv3 ?? ""} disabled={camposBloqueados} onChange={(e) => setForm({ ...form, inv3: e.target.value })} /></div>
          <div>
            <Label>Equipe / Instalador {equipeRequired && <span className="text-destructive">*</span>}</Label>
            <Select value={f.equipe} onValueChange={(v) => setForm({ ...form, equipe: v })} disabled={!equipeAllowed && !isFinalizado || camposBloqueados}>
              <SelectTrigger className={equipeMissing ? "border-destructive" : ""}>
                <SelectValue placeholder={isFinalizado ? "Equipe atual" : (equipeAllowed ? (equipeRequired ? "Obrigatória" : "Selecione") : "Bloqueado para este status")} />
              </SelectTrigger>
              <SelectContent>{equipes.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {isFinalizado
                ? "Equipe pode ser substituída livremente — sem aprovação ou motivo."
                : <>Troca de equipe é livre — sem aprovação. Liberado em <strong>Aguardando</strong> e <strong>Executando instalação</strong>.</>}
            </div>
          </div>
          {!isFinalizado && (
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => {
                const allowed = v === "Executando instalação" || v === "Aguardando instalação";
                setForm({ ...form, status: v, ...(allowed ? {} : { equipe: "" }) });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_EDITAVEL.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Finalização é automática quando houver as duas aprovações.
              </div>
            </div>
          )}

          {/* Datas reais — somente ADMIN MASTER e fora de finalizado bloqueado */}
          {!isFinalizado && (
            <div className="col-span-2 md:col-span-3 mt-2 rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Datas reais (operacionais)</div>
                {isAdminMaster ? (
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input type="checkbox" checked={adminMode} onChange={(e) => setAdminMode(e.target.checked)} />
                    Modo ADMIN MASTER
                  </label>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">Bloqueado — somente ADMIN MASTER</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-success">Início real</Label>
                  <Input type="date" value={f.inicioReal ?? ""} disabled={!realDatesEditable}
                    onChange={(e) => setForm({ ...form, inicioReal: e.target.value })}
                    className={!realDatesEditable ? "bg-muted/40" : ""} />
                </div>
                <div>
                  <Label className="text-success">Finalização real</Label>
                  <Input type="date" value={f.fimReal ?? ""} disabled={!realDatesEditable}
                    onChange={(e) => setForm({ ...form, fimReal: e.target.value })}
                    className={!realDatesEditable ? "bg-muted/40" : ""} />
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Editáveis somente pelo ADMIN MASTER. Alimentam produtividade, histórico, KPIs e cronograma.
              </div>
            </div>
          )}

          <div className="col-span-2 md:col-span-3"><Label>Observações</Label><Textarea rows={2} value={f.obs ?? ""} disabled={camposBloqueados} onChange={(e) => setForm({ ...form, obs: e.target.value })} /></div>
        </div>

        {/* Bloco de FINALIZAÇÃO — dupla aprovação */}
        {!isFinalizado && (
          <div className={`rounded-md border p-3 ${aguardandoFinalizacao ? "border-warning/40 bg-warning/10" : "border-border bg-muted/20"}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                <ShieldCheck className="h-4 w-4" /> Finalização — dupla aprovação
              </div>
              {aguardandoFinalizacao && (
                <span className="rounded-full bg-warning/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                  Aguardando aprovação
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <AprovacaoCell
                titulo="Engenharia"
                aprov={aprov.engenharia}
                podeAprovar={true}
                onAprovar={() => handleAprovar("engenharia")}
                onRevogar={() => handleRevogar("engenharia")}
              />
              <AprovacaoCell
                titulo="Financeiro / Diretoria"
                aprov={aprov.financeiro}
                podeAprovar={isAdmin}
                impedido={!isAdmin ? "Restrito ao Financeiro/Diretoria" : undefined}
                onAprovar={() => handleAprovar("financeiro")}
                onRevogar={() => handleRevogar("financeiro")}
              />
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Quando as duas aprovações existirem, a obra é finalizada automaticamente. A ordem não importa. Não há reprovação — enquanto faltar aprovação a obra continua operacional.
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ObraCustosCard obraId={obra.id} />
          <ObraMateriaisCard obraId={obra.id} />
          <RastreabilidadeObraCard obraId={obra.id} />
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {fromComercial && onRetornar && !isFinalizado && (
            <Button variant="outline" className="mr-auto border-warning/50 text-warning hover:bg-warning/10" onClick={() => setConfirmRet(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retornar para Comercial
            </Button>
          )}
          <Button variant="outline" onClick={() => { onClose(); setForm({}); }}>Cancelar</Button>
          <Button
            className="bg-primary text-primary-foreground"
            onClick={trySave}
            disabled={camposBloqueados}
            title={camposBloqueados ? "Libere a edição para alterar" : undefined}
          >
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={confirmRet} onOpenChange={setConfirmRet}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Retornar obra para o Comercial</DialogTitle>
            <DialogDescription>
              A obra de <strong>{obra.cliente}</strong> será removida da Engenharia e o projeto reabrirá no Comercial para edição.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRet(false)}>Cancelar</Button>
            <Button className="bg-warning text-warning-foreground" onClick={() => { setConfirmRet(false); onRetornar?.(obra.id); }}>Sim, retornar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar alteração</DialogTitle>
            <DialogDescription>
              {isFinalizado
                ? `Confirmar alterações na obra finalizada de ${obra.cliente}? O registro vai para o histórico automático.`
                : `Tem certeza que deseja salvar as alterações da obra de ${obra.cliente}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground" onClick={confirm}>Sim, confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function AprovacaoCell({
  titulo, aprov, podeAprovar, impedido, onAprovar, onRevogar,
}: {
  titulo: string;
  aprov?: { usuario: string; data: string };
  podeAprovar: boolean;
  impedido?: string;
  onAprovar: () => void;
  onRevogar: () => void;
}) {
  const aprovado = !!aprov;
  return (
    <div className={`rounded border p-2 text-xs ${aprovado ? "border-success/40 bg-success/10" : "border-border bg-background"}`}>
      <div className="flex items-center justify-between">
        <div className="font-semibold">{titulo}</div>
        {aprovado ? (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovado
          </span>
        ) : (
          <span className="text-muted-foreground">Pendente</span>
        )}
      </div>
      {aprovado && aprov && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {aprov.usuario} · {new Date(aprov.data).toLocaleString("pt-BR")}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        {!aprovado ? (
          <Button size="sm" variant="default" className="h-7 text-[11px]" onClick={onAprovar} disabled={!podeAprovar} title={impedido}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Aprovar
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onRevogar}>
            Revogar
          </Button>
        )}
      </div>
      {impedido && !podeAprovar && !aprovado && (
        <div className="mt-1 text-[10px] italic text-muted-foreground">{impedido}</div>
      )}
    </div>
  );
}


function recalcPrevisto(inicio: string, equipe: string, modulos: number): string {
  if (!inicio) return "";
  const dias = diasPrevistos(equipe, modulos);
  const d = new Date(inicio + "T00:00:00");
  // Início conta como dia 1: finalização = início + (dias - 1)
  d.setDate(d.getDate() + Math.max(0, dias - 1));
  return d.toISOString().slice(0,10);
}

/**
 * Recalcula a agenda da equipe em sequência:
 * - EXECUTANDO: a primeira mantém seu início; as demais começam em (previsto da anterior + 1).
 * - AGUARDANDO: continua a fila a partir do último previsto de EXECUTANDO (+1),
 *   ou mantém o próprio início da primeira se não houver EXECUTANDO.
 */
function chainSchedule(obras: Obra[], equipe: string, anchorId?: string): Obra[] {
  if (!equipe) return obras;
  const patches = new Map<string, Partial<Obra>>();
  const exec = obras.filter((o) => o.equipe === equipe && o.status === "Executando instalação").sort((a, b) => a.ordem - b.ordem);
  const aguard = obras.filter((o) => o.equipe === equipe && o.status === "Aguardando instalação").sort((a, b) => a.ordem - b.ordem);
  const seq = [...exec, ...aguard];
  if (seq.length === 0) return obras;

  // Item-âncora: seu início é preservado; itens abaixo re-encadeiam a partir dele.
  // Sem âncora explícita, o primeiro da fila é a âncora natural.
  const anchorIdx = anchorId ? Math.max(0, seq.findIndex((o) => o.id === anchorId)) : 0;

  let prevPrev = "";
  for (let i = 0; i < seq.length; i++) {
    const cur = seq[i];
    let newInicio = cur.inicio;
    if (i > anchorIdx && prevPrev) {
      newInicio = addDaysISO(prevPrev, 1);
    }
    const newPrev = recalcPrevisto(newInicio, cur.equipe, cur.modulos);
    if (newInicio !== cur.inicio || newPrev !== cur.previsto) {
      patches.set(cur.id, { inicio: newInicio, previsto: newPrev });
    }
    prevPrev = newPrev;
  }

  if (patches.size === 0) return obras;
  return obras.map((o) => patches.has(o.id) ? { ...o, ...patches.get(o.id)! } : o);
}

/* ---------------- CRONOGRAMA ---------------- */

function CronogramaTab({
  obras, setObras, pends, equipes,
}: { obras: Obra[]; setObras: (v: Obra[]) => void; pends: typeof pendenciasSeed; equipes: typeof equipesSeed }) {
  const move = (id: string, dir: -1 | 1) => {
    const target = obras.find((o) => o.id === id);
    if (!target) return;
    const same = obras
      .filter((o) => o.equipe === target.equipe && o.status === target.status)
      .sort((a,b)=>a.ordem-b.ordem);
    const idx = same.findIndex((o) => o.id === id);
    const swapWith = same[idx + dir];
    if (!swapWith) return;
    const swapped = obras.map((o) => {
      if (o.id === target.id) return { ...o, ordem: swapWith.ordem };
      if (o.id === swapWith.id) return { ...o, ordem: target.ordem };
      return o;
    });
    setObras(chainSchedule(swapped, target.equipe));
  };

  const updateInicio = (id: string, novoInicio: string) => {
    const next = obras.map((o) => {
      if (o.id !== id) return o;
      const previsto = recalcPrevisto(novoInicio, o.equipe || "", o.modulos);
      return { ...o, inicio: novoInicio, previsto };
    });
    const target = next.find((o) => o.id === id);
    if (!target?.equipe) { setObras(next); return; }
    // Âncora = item editado; itens abaixo re-encadeiam a partir dele.
    setObras(chainSchedule(next, target.equipe, id));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {equipes.map((eq) => {
        const exec = obras.filter((o) => o.equipe === eq.nome && o.status === "Executando instalação").sort((a,b)=>a.ordem-b.ordem);
        const aguard = obras.filter((o) => o.equipe === eq.nome && o.status === "Aguardando instalação").sort((a,b)=>a.ordem-b.ordem);
        const pendQtd = pends.filter((p) => p.equipe === eq.nome && p.status === "Aguardando resolução").length;
        return (
          <Card key={eq.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">{eq.nome}</div>
              {pendQtd > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive"><AlertTriangle className="h-3 w-3" /> {pendQtd} pend.</span>}
            </div>
            {exec.length === 0 && aguard.length === 0 && <div className="rounded border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Sem gestão de projetos</div>}
            {exec.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-[10px] font-semibold uppercase text-success">Executando</div>
                <div className="space-y-2">
                  {exec.map((o, i) => <CronogramaCard key={o.id} o={o} tone="success" first={i===0} last={i===exec.length-1} onMove={move} onChangeInicio={updateInicio} />)}
                </div>
              </div>
            )}
            {aguard.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase text-warning">Aguardando</div>
                <div className="space-y-2">
                  {aguard.map((o, i) => <CronogramaCard key={o.id} o={o} tone="warning" first={i===0} last={i===aguard.length-1} onMove={move} onChangeInicio={updateInicio} />)}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function CronogramaCard({ o, tone, first, last, onMove, onChangeInicio }: { o: Obra; tone: "success" | "warning"; first: boolean; last: boolean; onMove: (id: string, dir: -1 | 1) => void; onChangeInicio: (id: string, novoInicio: string) => void }) {
  const bg = tone === "success" ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30";
  const prazo = diasPrevistos(o.equipe || "", o.modulos);
  return (
    <div className={`rounded-lg border ${bg} p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] font-bold">#{o.ordem}</span>
            <div className="font-medium text-sm truncate">{o.cliente}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{o.modulos} mód · {o.potencia.toFixed(1)} kWp · {o.telhadoTipo}</div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">{fmtInversorNumero(o.inversor)}</div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-background/50 p-2 text-[11px] items-center">
            <div className="text-muted-foreground">Previsão início</div>
            <Input type="date" value={o.inicio || ""} onChange={(e) => onChangeInicio(o.id, e.target.value)} className="h-7 text-[11px] py-0" />
            <div className="text-muted-foreground">Previsão finalização</div>
            <Input type="date" value={o.previsto || ""} readOnly disabled className="h-7 text-[11px] py-0 disabled:opacity-100 disabled:cursor-not-allowed font-semibold" title="Calculada automaticamente a partir do início e do prazo estimado" />
            <div className="text-muted-foreground">Prazo estimado</div>
            <div className="text-right">{prazo} {prazo === 1 ? "dia" : "dias"}</div>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground/70">Início conta como dia 1. Finalização calculada automaticamente.</div>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="outline" size="icon" className="h-6 w-6" disabled={first} onClick={() => onMove(o.id, -1)}><ChevronUp className="h-3 w-3" /></Button>
          <Button variant="outline" size="icon" className="h-6 w-6" disabled={last} onClick={() => onMove(o.id, 1)}><ChevronDown className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PENDÊNCIAS ---------------- */

function PendenciasTab({
  pends, setPends, equipes,
}: { pends: typeof pendenciasSeed; setPends: (v: typeof pendenciasSeed) => void; equipes: typeof equipesSeed; obras: Obra[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof pendenciasSeed)[number] | null>(null);
  const [novoCli, setNovoCli] = useState("");
  const clientes = useClientesAll();
  const [form, setForm] = useState({ equipe: "", cliente: "", problema: "", solucao: "" });

  const submit = () => {
    if (!form.equipe || !form.cliente || !form.problema) { toast.error("Preencha equipe, cliente e problema"); return; }
    setPends([{
      id: `PD-${String(pends.length+15).padStart(3,"0")}`,
      equipe: form.equipe, cliente: form.cliente, obra: "",
      problema: form.problema, solucao: form.solucao,
      status: "Aguardando resolução", abertura: new Date().toISOString().slice(0,10), resolucao: null,
    }, ...pends]);
    toast.success("Pendência criada");
    setForm({ equipe: "", cliente: "", problema: "", solucao: "" });
    setOpen(false);
  };

  const cadastrarCliente = () => {
    const nome = novoCli.trim();
    if (!nome) return;
    const c = addCliente(nome);
    setForm((f) => ({ ...f, cliente: c.nome }));
    setNovoCli("");
    toast.success(`Cliente "${nome}" cadastrado`);
  };

  const saveEdit = (patch: Partial<(typeof pendenciasSeed)[number]>) => {
    if (!editing) return;
    setPends(pends.map((p) => p.id === editing.id ? { ...p, ...patch } : p));
    setEditing(null);
    toast.success("Pendência atualizada");
  };

  const abertas = pends.filter((p) => p.status !== "Problema resolvido");
  const resolvidas = pends.filter((p) => p.status === "Problema resolvido");

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Pendências de obra</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova pendência</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova pendência</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Equipe</Label>
                <Select value={form.equipe} onValueChange={(v)=>setForm({...form, equipe: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{equipes.map(e=><SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Cliente</Label>
                <Select value={form.cliente} onValueChange={(v)=>setForm({...form, cliente: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>{clientes.map(c=><SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
                <div className="mt-2 flex gap-2">
                  <Input placeholder="Cadastrar cliente antigo (sem obra)" value={novoCli} onChange={(e)=>setNovoCli(e.target.value)} className="h-8 text-xs" />
                  <Button type="button" size="sm" variant="outline" onClick={cadastrarCliente}>Cadastrar</Button>
                </div>
              </div>
              <div><Label>Problema</Label><Textarea rows={3} value={form.problema} onChange={(e)=>setForm({...form, problema: e.target.value})} /></div>
              <div><Label>Solução proposta</Label><Textarea rows={2} value={form.solucao} onChange={(e)=>setForm({...form, solucao: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
              <Button className="bg-primary text-primary-foreground" onClick={submit}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="abertas" className="p-4">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="abertas">Em aberto ({abertas.length})</TabsTrigger>
          <TabsTrigger value="resolvidas">Pendências Resolvidas ({resolvidas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="abertas" className="mt-3">
          <PendTable rows={abertas} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="resolvidas" className="mt-3">
          <PendTable rows={resolvidas} onEdit={setEditing} />
        </TabsContent>
      </Tabs>

      <EditPendenciaDialog pend={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
    </Card>
  );
}

function PendTable({ rows, onEdit }: { rows: typeof pendenciasSeed; onEdit: (p: (typeof pendenciasSeed)[number]) => void }) {
  if (rows.length === 0) {
    return <div className="rounded border border-dashed border-border p-8 text-center text-xs text-muted-foreground">Nenhuma pendência nesta lista.</div>;
  }
  return (
    <Table>
      <TableHeader><TableRow className="hover:bg-transparent">
        <TableHead className="w-[80px]">Opções</TableHead>
        <TableHead>Pendência</TableHead><TableHead>Equipe</TableHead><TableHead>Cliente</TableHead>
        <TableHead>Problema</TableHead><TableHead>Solução</TableHead>
        <TableHead>Status</TableHead><TableHead>Abertura</TableHead><TableHead>Resolução</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <RowActions
                rowId={p.id}
                actions={[{ kind: "editar" }]}
                onAction={(k) => { if (k === "editar") onEdit(p); }}
              />
            </TableCell>
            <TableCell className="font-mono text-xs text-primary">{p.id}</TableCell>
            <TableCell>{p.equipe}</TableCell>
            <TableCell className="font-medium">{p.cliente}</TableCell>
            <TableCell className="max-w-xs truncate">{p.problema}</TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">{p.solucao}</TableCell>
            <TableCell><StatusBadge status={p.status} /></TableCell>
            <TableCell className="text-muted-foreground">{p.abertura}</TableCell>
            <TableCell className="text-muted-foreground">{p.resolucao ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EditPendenciaDialog({
  pend, onClose, onSave,
}: { pend: (typeof pendenciasSeed)[number] | null; onClose: () => void; onSave: (patch: Partial<(typeof pendenciasSeed)[number]>) => void }) {
  const [form, setForm] = useState<Partial<(typeof pendenciasSeed)[number]>>({});
  const [confirming, setConfirming] = useState(false);
  if (pend && form.id !== pend.id) setTimeout(() => setForm({ ...pend }), 0);
  if (!pend) return null;
  const f = { ...pend, ...form };
  const finalizing = f.status === "Problema resolvido";

  const trySave = () => setConfirming(true);
  const confirm = () => {
    const patch: Partial<(typeof pendenciasSeed)[number]> = {
      status: f.status, problema: f.problema, solucao: f.solucao,
      resolucao: finalizing ? (f.resolucao || new Date().toISOString().slice(0,10)) : null,
    };
    onSave(patch);
    setConfirming(false);
    setForm({});
  };

  return (
    <Dialog open={!!pend} onOpenChange={(v) => { if (!v) { onClose(); setForm({}); setConfirming(false); } }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pendência</DialogTitle>
          <DialogDescription>{pend.cliente} · {pend.equipe}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div><Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Aguardando resolução">Aguardando resolução</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Problema resolvido">Problema resolvido (finalizar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Problema</Label><Textarea rows={2} value={f.problema ?? ""} onChange={(e) => setForm({ ...form, problema: e.target.value })} /></div>
          <div><Label>Solução</Label><Textarea rows={2} value={f.solucao ?? ""} onChange={(e) => setForm({ ...form, solucao: e.target.value })} /></div>
          {finalizing && (
            <div><Label>Data resolução</Label>
              <Input type="date" value={f.resolucao ?? new Date().toISOString().slice(0,10)} onChange={(e) => setForm({ ...form, resolucao: e.target.value })} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setForm({}); }}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={trySave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar alteração</DialogTitle>
            <DialogDescription>Tem certeza que deseja salvar esta alteração?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground" onClick={confirm}>Sim, confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

/* ---------------- EQUIPES ---------------- */

const FAIXAS = ["0-20", "21-50", "51-100", "101-200", "201-300", "301-500", "500+"] as const;

function EquipesTab({
  equipes, obras, pends,
}: { equipes: typeof equipesSeed; setEquipes: (v: typeof equipesSeed) => void; obras: Obra[]; pends: typeof pendenciasSeed }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {equipes.map((e) => {
        const exec = obras.filter((o) => o.equipe === e.nome && o.status === "Executando instalação").length;
        const aguard = obras.filter((o) => o.equipe === e.nome && o.status === "Aguardando instalação").length;
        const totalMod = obras.filter((o) => o.equipe === e.nome).reduce((s,o)=>s+o.modulos, 0);
        const pendAb = pends.filter((p) => p.equipe === e.nome && p.status === "Aguardando resolução").length;
        const prod = produtividadeEquipe.find((p)=>p.equipe===e.nome);
        return (
          <Card key={e.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Users className="h-5 w-5" /></div>
                <div>
                  <div className="text-lg font-semibold">{e.nome}</div>
                  <div className="text-xs text-muted-foreground">Líder: {e.lider} · {e.membros} membros</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={e.status} />
                <RowActions
                  rowId={String(e.id)}
                  actions={[{ kind: "visualizar" }, { kind: "historico" }]}
                  onAction={(kind) => {
                    if (kind === "visualizar") toast.info(`Detalhe da equipe ${e.nome}`);
                    else if (kind === "historico") toast.info(`Histórico da equipe ${e.nome}`);
                  }}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-md bg-success/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Exec.</div><div className="font-bold text-success">{exec}</div></div>
              <div className="rounded-md bg-warning/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Aguard.</div><div className="font-bold text-warning">{aguard}</div></div>
              <div className="rounded-md bg-primary/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Módulos</div><div className="font-bold text-primary">{totalMod}</div></div>
              <div className="rounded-md bg-info/10 p-2"><div className="text-[10px] uppercase text-muted-foreground">Mód./dia</div><div className="font-bold text-info">{prod?.mediaDia ?? "—"}</div></div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Faixas de produtividade (dias por módulo)</div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {FAIXAS.map((fx) => {
                  const v = prod?.faixas?.[fx];
                  return (
                    <div key={fx} className="rounded-md border border-border bg-muted/30 p-1.5">
                      <div className="text-[9px] font-semibold text-muted-foreground">{fx}</div>
                      <div className="text-[11px] font-bold text-primary">{v != null ? `${v}d` : "—"}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/80">
                Média geral: <span className="font-semibold text-foreground">{prod?.mediaDia ?? "—"} mód/dia</span>
                {prod && (
                  <> · Média por faixa: <span className="font-semibold text-foreground">
                    {(Object.values(prod.faixas).reduce((s, n) => s + n, 0) / Math.max(Object.keys(prod.faixas).length, 1)).toFixed(2)}d
                  </span></>
                )}
              </div>
            </div>
            {pendAb > 0 && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3 w-3" /> {pendAb} pendência(s)
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- PRODUTIVIDADE ---------------- */

function ProdutividadeTab({ obras, pends, equipes }: { obras: Obra[]; pends: typeof pendenciasSeed; equipes: typeof equipesSeed }) {
  const data = equipes.map((e) => {
    const finalizadas = obras.filter((o) => o.equipe === e.nome && o.status === "Finalizado");
    const ativas = obras.filter((o) => o.equipe === e.nome && o.status !== "Finalizado").length;
    const modInst = finalizadas.reduce((s,o)=>s+o.modulos, 0);
    const prod = produtividadeEquipe.find((p)=>p.equipe===e.nome);
    const pend = pends.filter((p) => p.equipe === e.nome && p.status === "Aguardando resolução").length;
    return { nome: e.nome, finalizadas: finalizadas.length, ativas, modInst, mediaDia: prod?.mediaDia ?? 0, pend };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Módulos instalados por equipe</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="modInst" fill="var(--chart-1)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Ranking — média módulos/dia</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[...data].sort((a,b)=>b.mediaDia-a.mediaDia)} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis dataKey="nome" type="category" stroke="var(--muted-foreground)" fontSize={11} width={80} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="mediaDia" fill="var(--chart-2)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Detalhe por equipe</div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Equipe</TableHead>
            <TableHead className="text-center">Finalizadas</TableHead>
            <TableHead className="text-center">Ativas</TableHead>
            <TableHead className="text-center">Módulos instalados</TableHead>
            <TableHead className="text-center">Média mód./dia</TableHead>
            <TableHead className="text-center">Pendências</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.nome}>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell className="text-center font-semibold text-success">{d.finalizadas}</TableCell>
                <TableCell className="text-center">{d.ativas}</TableCell>
                <TableCell className="text-center">{d.modInst}</TableCell>
                <TableCell className="text-center font-bold text-primary">{d.mediaDia}</TableCell>
                <TableCell className="text-center"><span className={d.pend>0?"text-destructive font-semibold":""}>{d.pend}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------------- FINALIZADOS ---------------- */

function FinalizadosTab({ obras, setObras: _setObras }: { obras: Obra[]; setObras: (v: Obra[]) => void }) {
  const list = obras.filter((o) => o.status === "Finalizado");
  const [detail, setDetail] = useState<Obra | null>(null);
  const [historico, setHistorico] = useState<Obra | null>(null);
  const [editing, setEditing] = useState<Obra | null>(null);
  const { user } = useAuth();
  const usuario = user?.email ?? "usuário";
  const equipes = useEquipes();

  const handleLiberar = (o: Obra) => {
    liberarEdicao(o.id, usuario);
    toast.success(`Edição liberada para ${o.cliente} — válida até o fim do dia`);
  };

  return (
    <Card>
      <div className="border-b border-border p-3 text-[11px] text-muted-foreground">
        Obras finalizadas permanecem aqui mesmo após ajustes. Para alterar campos da obra, libere a edição (válida até o fim do dia). Toda alteração gera registro automático no histórico.
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead className="w-[80px]">Opções</TableHead>
          <TableHead>Obra</TableHead><TableHead>Cliente</TableHead><TableHead>Equipe</TableHead>
          <TableHead className="text-center">Mód.</TableHead><TableHead className="text-right">kWp</TableHead>
          <TableHead>Início</TableHead><TableHead>Finalização</TableHead>
          <TableHead>Edição</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.map((o) => {
            const lib = getLiberacao(o.id);
            const liberada = !!lib && new Date(lib.validoAteISO).getTime() > Date.now();
            return (
              <TableRow key={o.id}>
                <TableCell>
                  <ActionsMenu label={o.id}>
                    <DropdownMenuItem onSelect={() => setDetail(o)}>
                      <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setHistorico(o)}>
                      <History className="mr-2 h-4 w-4" /> Histórico de alterações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!liberada && (
                      <DropdownMenuItem onSelect={() => handleLiberar(o)}>
                        <Unlock className="mr-2 h-4 w-4 text-success" />
                        <span className="text-success">Liberar edição (até fim do dia)</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => setEditing(o)}>
                      <SquarePen className="mr-2 h-4 w-4" /> Editar obra
                    </DropdownMenuItem>
                  </ActionsMenu>
                </TableCell>
                <TableCell className="font-mono text-xs text-primary">{o.id}</TableCell>
                <TableCell className="font-medium">{o.cliente}</TableCell>
                <TableCell>{o.equipe}</TableCell>
                <TableCell className="text-center">{o.modulos}</TableCell>
                <TableCell className="text-right">{o.potencia.toFixed(1)}</TableCell>
                <TableCell className="text-muted-foreground">{o.inicio}</TableCell>
                <TableCell className="text-muted-foreground">{o.finalizacao ?? "—"}</TableCell>
                <TableCell className="text-[11px]">
                  {liberada
                    ? <span className="flex items-center gap-1 text-success"><Unlock className="h-3 w-3" /> liberada</span>
                    : <span className="flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> travada</span>}
                </TableCell>
              </TableRow>
            );
          })}
          {list.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Nenhuma obra finalizada</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Dialog open={!!detail} onOpenChange={(v)=>!v && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.id} — {detail?.cliente}</DialogTitle><DialogDescription>Detalhes da obra finalizada</DialogDescription></DialogHeader>
          {detail && (
            <div className="grid gap-3 text-sm">
              <Row k="Equipe" v={detail.equipe} />
              <Row k="Módulos" v={`${detail.modulos}`} />
              <Row k="Potência" v={`${detail.potencia.toFixed(1)} kWp`} />
              <Row k="Inversor" v={fmtInversorNumero(detail.inversor)} />
              <Row k="Telhado" v={detail.telhadoTipo} />
              <Row k="Início" v={detail.inicio} />
              <Row k="Finalização" v={detail.finalizacao ?? "—"} />
              <Row k="Contrato" v={detail.contrato} />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <HistoricoObraDialog obra={historico} onClose={() => setHistorico(null)} />
      <EditObraDialog
        obra={editing}
        onClose={() => setEditing(null)}
        onSave={(id, patch) => {
          _setObras(obras.map((o) => o.id === id ? { ...o, ...patch } : o));
          setEditing(null);
          toast.success("Obra atualizada");
        }}
        equipes={equipes}
      />
    </Card>
  );
}

function HistoricoObraDialog({ obra, onClose }: { obra: Obra | null; onClose: () => void }) {
  const historico = useHistorico("obra", obra?.id ?? "__none__");
  if (!obra) return null;
  return (
    <Dialog open={!!obra} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico — {obra.cliente}</DialogTitle>
          <DialogDescription>{obra.id} · {historico.length} registro(s)</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          {historico.length === 0 && (
            <div className="rounded border border-dashed border-border p-6 text-center text-muted-foreground">
              Nenhum registro de histórico para esta obra.
            </div>
          )}
          {historico.map((h) => (
            <div key={h.id} className="rounded border border-border bg-muted/20 p-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{h.acao.replace(/_/g, " ")}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(h.data).toLocaleString("pt-BR")}</div>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {h.usuario && <span>por <strong>{h.usuario}</strong></span>}
              </div>
              {h.campo && (
                <div className="mt-1">
                  <strong>{h.campo}:</strong>{" "}
                  {h.valorAnterior !== undefined && <span className="text-muted-foreground line-through">{h.valorAnterior}</span>}
                  {h.valorAnterior !== undefined && h.valorNovo !== undefined && " → "}
                  {h.valorNovo !== undefined && <span className="text-foreground">{h.valorNovo}</span>}
                </div>
              )}
              {h.detalhe && <div className="mt-1 text-[10px] text-muted-foreground">{h.detalhe}</div>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}


function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

/* ---------------- GESTÃO DE PROJETOS ---------------- */
function GestaoProjetosTab({ contratos }: { contratos: ContratoFull[] }) {
  const liberados = contratos.filter((c) => c.assinadoAprovado === true);
  const [novoFor, setNovoFor] = useState<ContratoFull | null>(null);
  const [editing, setEditing] = useState<{ c: ContratoFull; p: ProjetoVinculado } | null>(null);
  const [view, setView] = useState<"contrato" | "kanban" | "tabela">("contrato");

  if (liberados.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Nenhum contrato liberado para gestão de projetos. Após aprovar o contrato assinado no Comercial, ele aparecerá aqui para o cadastramento técnico da Engenharia.
      </Card>
    );
  }

  // Apenas projetos pendentes na Engenharia (não aprovados ainda).
  // Ao aprovar, o projeto sai daqui e aparece em Gestão de projetos.
  const flat: { p: ProjetoVinculado; c: ContratoFull }[] = [];
  liberados.forEach((c) => (c.projetos ?? []).forEach((p) => {
    if (p.enviadoEngenharia && !p.aprovado) flat.push({ p, c });
  }));
  const pendentesGlob = flat;
  const enviadosGlob: typeof flat = [];

  const aprovarProjetoEng = (c: ContratoFull, p: ProjetoVinculado) => {
    updateProjeto(c.id, p.id, {
      aprovado: true,
      dataAprovacao: new Date().toISOString(),
      usuarioAprovacao: "Engenharia",
    });
    toast.success(`Projeto ${p.id} aprovado pela Engenharia. Movido para Gestão de projetos.`);
  };
  const enviarUm = aprovarProjetoEng;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2"><HardHat className="h-4 w-4 text-primary" /> Gestão de Projetos</div>
            <div className="text-xs text-muted-foreground mt-1">
              Cadastramento técnico da Engenharia. Ao aprovar um projeto, ele é movido para Gestão de projetos.
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-600 tabular-nums">
                <Clock className="h-3 w-3" /> {pendentesGlob.length} pendente{pendentesGlob.length !== 1 ? "s" : ""} de aprovação
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant={view === "contrato" ? "default" : "outline"} onClick={() => setView("contrato")}>Por contrato</Button>
            <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>Kanban</Button>
            <Button size="sm" variant={view === "tabela" ? "default" : "outline"} onClick={() => setView("tabela")}>Tabela</Button>
          </div>
        </div>
      </Card>

      {view === "kanban" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[
            { key: "pend", label: "Pendentes para Engenharia", items: pendentesGlob, tone: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
            { key: "env", label: "Enviados para Engenharia", items: enviadosGlob, tone: "bg-success/15 text-success border-success/30" },
          ].map((col) => (
            <Card key={col.key} className="p-3 bg-muted/30">
              <div className={`mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${col.tone}`}>
                {col.label} <span className="tabular-nums">· {col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">—</div>
                ) : col.items.map(({ p, c }) => (
                  <Card key={p.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono text-muted-foreground">{p.id} · {c.id}</div>
                        <div className="text-sm font-semibold leading-tight truncate">{c.cliente}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{p.tipo}</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0" onClick={() => setEditing({ c, p })} title="Editar projeto">
                        <SquarePen className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 text-[11px] text-foreground/80 line-clamp-2">
                      <b>Endereço:</b> {[p.endereco, p.numero, p.bairro, p.cidade, p.uf].filter(Boolean).join(", ") || "—"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 tabular-nums font-semibold">{(p.kwp ?? 0).toFixed(2)} kWp</span>
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 tabular-nums">{p.modulos || 0} mód</span>
                      {p.potenciaModuloW ? <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 tabular-nums">{p.potenciaModuloW}W</span> : null}
                      {p.inversor ? <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 truncate max-w-[180px]" title={p.inversor}>Inv: {fmtInversorNumero(p.inversor)}</span> : null}
                    </div>
                    {!p.enviadoEngenharia && (
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" className="gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => enviarUm(c, p)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Enviar p/ Engenharia
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {view === "tabela" && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px]">Opções</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Sistema</TableHead>
              <TableHead>Inversor</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {flat.map(({ p, c }) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <ActionsMenu label={p.id}>
                      <DropdownMenuItem onSelect={() => setEditing({ c, p })}>
                        <SquarePen className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      {!p.enviadoEngenharia && (
                        <DropdownMenuItem onSelect={() => enviarUm(c, p)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Enviar
                        </DropdownMenuItem>
                      )}
                    </ActionsMenu>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="text-xs font-medium">{c.cliente}</TableCell>
                  <TableCell className="text-xs">{[p.endereco, p.numero, p.bairro, p.cidade, p.uf].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{(p.kwp ?? 0).toFixed(2)} kWp · {p.modulos || 0} mód{p.potenciaModuloW ? ` · ${p.potenciaModuloW}W` : ""}</TableCell>
                  <TableCell className="text-xs truncate max-w-[160px]">{fmtInversorNumero(p.inversor) || "—"}</TableCell>
                  <TableCell>
                    {p.enviadoEngenharia ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                        <CheckCircle2 className="h-3 w-3" /> Enviado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                        <Clock className="h-3 w-3" /> Pendente
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {view === "contrato" && <>


      {liberados.map((c) => {
        const projetos = (c.projetos ?? []).filter((p) => p.enviadoEngenharia && !p.aprovado);
        const total = projetos.length;
        if (total === 0) return null;
        const pendentes = 0;
        const enviados = total;
        return (
        <Card key={c.id} className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-primary">{c.id} — {c.cliente}</div>
              <div className="text-xs text-muted-foreground">
                {c.vendedor || "—"} · {(c.kwp ?? 0).toFixed(2)} kWp · Assinado em {c.dataAssinatura ?? "—"}
              </div>
              {c.clienteFull && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Endereço do contrato: {[c.clienteFull.rua, c.clienteFull.numero, c.clienteFull.bairro, c.clienteFull.cidade, c.clienteFull.uf].filter(Boolean).join(", ") || "—"}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-semibold tabular-nums">
                  Projetos: {enviados}/{total}
                </span>
                {pendentes > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-bold text-amber-600 tabular-nums">
                    <Clock className="h-3 w-3" /> {pendentes} pendente{pendentes > 1 ? "s" : ""} para Engenharia
                  </span>
                ) : total > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 font-semibold text-success">
                    <CheckCircle2 className="h-3 w-3" /> Todos enviados
                  </span>
                ) : null}
              </div>
            </div>
            <Button size="default" className="gap-1.5" onClick={() => setNovoFor(c)}>
              <Plus className="h-4 w-4" /> Adicionar projeto
            </Button>
          </div>

          {projetos.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Nenhum projeto definido. Clique em "Adicionar projeto" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px]">Opções</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-right">Módulos</TableHead>
                <TableHead className="text-right">kWp</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {projetos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <ActionsMenu label={p.id}>
                        <DropdownMenuItem onSelect={() => setEditing({ c, p })}>
                          <SquarePen className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        {!p.enviadoEngenharia && (
                          <DropdownMenuItem onSelect={() => {
                            updateProjeto(c.id, p.id, {
                              enviadoEngenharia: true,
                              aprovado: true,
                              dataAprovacao: new Date().toISOString(),
                              usuarioAprovacao: "Engenharia",
                            });
                            toast.success(`Projeto ${p.id} enviado para Engenharia (Gestão de projetos).`);
                          }}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Enviar p/ Engenharia
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => {
                          if (!confirm(`Remover projeto ${p.id}?`)) return;
                          removeProjeto(c.id, p.id);
                          toast.success("Projeto removido");
                        }}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Remover projeto
                        </DropdownMenuItem>
                      </ActionsMenu>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell className="text-xs">{p.tipo}</TableCell>
                    <TableCell className="text-xs">{p.endereco || "—"}</TableCell>
                    <TableCell className="text-xs">{p.cidade}/{p.uf}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{p.modulos || 0}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{(p.kwp ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {p.enviadoEngenharia ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <CheckCircle2 className="h-3 w-3" /> Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                          <Clock className="h-3 w-3" /> Pendente
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
        );
      })}
      </>}



      {novoFor && (
        <NovoProjetoDialog contrato={novoFor} onClose={() => setNovoFor(null)} />
      )}
      {editing && (
        <EditProjetoDialog contrato={editing.c} projeto={editing.p} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/* ---------------- PROJETOS (Kanban + Tabela) ---------------- */
const KANBAN_PROJ_COLS: { key: string; label: string; tone: string }[] = [
  { key: "Em projeto/aprovação", label: "Em projeto / aprovação", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { key: "Aguardando instalação", label: "Aguardando instalação", tone: "bg-info/15 text-info border-info/30" },
  { key: "Em instalação", label: "Em instalação", tone: "bg-primary/15 text-primary border-primary/30" },
  { key: "Concluído", label: "Concluído", tone: "bg-success/15 text-success border-success/30" },
];

function bucketDe(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("conclu") || s.includes("finaliz")) return "Concluído";
  if (s.includes("instal") && s.includes("agu")) return "Aguardando instalação";
  if (s.includes("instal")) return "Em instalação";
  return "Em projeto/aprovação";
}

function ProjetosTab({ contratos }: { contratos: ContratoFull[] }) {
  const [view, setView] = useState<"kanban" | "tabela">("kanban");
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<{ c: ContratoFull; p: ProjetoVinculado } | null>(null);

  const cards = (() => {
    const out: { p: ProjetoVinculado; c: ContratoFull }[] = [];
    contratos.forEach((c) => (c.projetos ?? []).forEach((p) => {
      if (p.enviadoEngenharia && p.aprovado) out.push({ p, c });
    }));
    const q = busca.trim().toLowerCase();
    return q
      ? out.filter(({ p, c }) =>
          p.id.toLowerCase().includes(q) ||
          c.cliente.toLowerCase().includes(q) ||
          (p.endereco || "").toLowerCase().includes(q) ||
          (p.cidade || "").toLowerCase().includes(q),
        )
      : out;
  })();

  if (cards.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Nenhum projeto aprovado ainda. Quando um projeto for aprovado em <b>Gestão de Projetos</b>, ele aparece aqui como card.
      </Card>
    );
  }

  // Resumo por bucket
  const totalKwp = cards.reduce((s, { p }) => s + (p.kwp || 0), 0);
  const totalModulos = cards.reduce((s, { p }) => s + (p.modulos || 0), 0);
  const resumo = KANBAN_PROJ_COLS.map((col) => ({
    ...col,
    qtd: cards.filter(({ p }) => bucketDe(p.status) === col.key).length,
  }));

  return (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <Card className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Projetos</div>
          <div className="text-lg font-bold tabular-nums">{cards.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Módulos</div>
          <div className="text-lg font-bold tabular-nums">{totalModulos}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">kWp total</div>
          <div className="text-lg font-bold tabular-nums">{totalKwp.toFixed(2)}</div>
        </Card>
        {resumo.slice(0, 3).map((r) => (
          <Card key={r.key} className="p-3">
            <div className="text-[10px] uppercase text-muted-foreground truncate">{r.label}</div>
            <div className="text-lg font-bold tabular-nums">{r.qtd}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>Kanban</Button>
          <Button size="sm" variant={view === "tabela" ? "default" : "outline"} onClick={() => setView("tabela")}>Tabela</Button>
        </div>
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, projeto, endereço…" className="h-8 w-72" />
      </div>

      {view === "kanban" ? (
        <ProjetosKanbanBlock cards={cards} onEdit={setEditing} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px]">Opções</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead className="text-right">Módulos</TableHead>
              <TableHead className="text-right">kWp</TableHead>
              <TableHead>Inversor</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Previsto</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {cards.map(({ p, c }) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <RowActions
                      rowId={p.id}
                      actions={[{ kind: "editar" }]}
                      onAction={(k) => { if (k === "editar") setEditing({ c, p }); }}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="font-medium text-xs">{c.cliente}</TableCell>
                  <TableCell className="text-xs">{p.tipo}</TableCell>
                  <TableCell className="text-xs">{p.endereco || "—"}</TableCell>
                  <TableCell className="text-xs">{p.cidade}/{p.uf}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{p.modulos || 0}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{(p.kwp ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs truncate max-w-[160px]">{fmtInversorNumero(p.inversor) || "—"}</TableCell>
                  <TableCell className="text-xs">{p.equipe || "—"}</TableCell>
                  <TableCell><span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold">{bucketDe(p.status)}</span></TableCell>
                  <TableCell className="text-xs">{fmtBR(p.inicio)}</TableCell>
                  <TableCell className="text-xs">{fmtBR(p.previsto)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}


      {editing && (
        <EditProjetoDialog contrato={editing.c} projeto={editing.p} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/* ---------- Bloco Kanban editável de Projetos ---------- */
const PROJETOS_KANBAN_DEFAULTS: KCol[] = KANBAN_PROJ_COLS.map((c, i) => ({
  id: `col-proj-${i}`,
  titulo: c.label,
  ativo: true,
  tone: c.tone,
}));
const PROJETO_KEY_TO_COL: Record<string, string> = KANBAN_PROJ_COLS.reduce(
  (acc, c, i) => { acc[c.key] = `col-proj-${i}`; return acc; },
  {} as Record<string, string>,
);

function ProjetosKanbanBlock({
  cards, onEdit,
}: {
  cards: { p: ProjetoVinculado; c: ContratoFull }[];
  onEdit: (v: { c: ContratoFull; p: ProjetoVinculado }) => void;
}) {
  const [manage, setManage] = useState(false);
  const { cols, setCols, assign, setAssign } = useKanbanColumns(
    "ms.engenharia.projetos.kanban",
    PROJETOS_KANBAN_DEFAULTS,
  );
  const items: KItem<{ p: ProjetoVinculado; c: ContratoFull }>[] = cards.map(({ p, c }) => ({
    key: p.id,
    data: { p, c },
    defaultColId: PROJETO_KEY_TO_COL[bucketDe(p.status)] ?? PROJETOS_KANBAN_DEFAULTS[0].id,
  }));

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColunasButton onClick={() => setManage(true)} />
      </div>
      <KanbanGeneric
        cols={cols}
        items={items}
        assign={assign}
        setAssign={setAssign}
        columnMinWidth={260}
        renderCard={({ p, c }) => (
          <Card className="p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-muted-foreground">{p.id}</div>
                <div className="text-sm font-semibold leading-tight truncate">{c.cliente}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{p.tipo}</div>
              </div>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0" onClick={() => onEdit({ c, p })} title="Editar projeto">
                <SquarePen className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 tabular-nums font-semibold">{(p.kwp ?? 0).toFixed(2)} kWp</span>
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 tabular-nums">{p.modulos || 0} mód</span>
              {p.equipe ? <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 font-semibold">{p.equipe}</span> : null}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{[p.endereco, p.cidade, p.uf].filter(Boolean).join(", ") || "—"}</div>
            {p.previsto && <div className="mt-1 text-[10px] text-muted-foreground">Previsto: {fmtBR(p.previsto)}</div>}
          </Card>
        )}
      />
      <ColunasManager open={manage} onOpenChange={setManage} cols={cols} setCols={setCols} />
    </div>
  );
}





function NovoProjetoDialog({ contrato, onClose }: { contrato: ContratoFull; onClose: () => void }) {
  const cf = contrato.clienteFull;
  const [form, setForm] = useState({
    tipo: `Projeto ${(contrato.projetos?.length ?? 0) + 1}`,
    endereco: "",
    numero: "",
    bairro: "",
    cep: "",
    cidade: cf?.cidade ?? "",
    uf: cf?.uf ?? "",
    modulos: 0,
    potenciaModuloW: contrato.potencia ?? 0,
    kwp: 0,
    inversor: contrato.inv1 ?? "",
    obs: "",
  });

  function salvar() {
    if (!form.endereco.trim()) { toast.error("Endereço é obrigatório"); return; }
    if (!form.cidade.trim() || !form.uf.trim()) { toast.error("Cidade e UF são obrigatórios"); return; }
    addProjeto(contrato.id, {
      tipo: form.tipo.trim() || "Projeto",
      endereco: form.endereco,
      numero: form.numero,
      bairro: form.bairro,
      cep: form.cep,
      cidade: form.cidade,
      uf: form.uf,
      modulos: Number(form.modulos) || 0,
      potenciaModuloW: Number(form.potenciaModuloW) || 0,
      kwp: Number(form.kwp) || 0,
      inversor: form.inversor,
      equipe: "",
      status: "Em projeto/aprovação",
      inicio: new Date().toISOString().slice(0, 10),
      previsto: new Date().toISOString().slice(0, 10),
      obs: form.obs,
      cronograma: "",
      enviadoEngenharia: false,
      aprovado: false,
    });
    toast.success(`Projeto adicionado ao contrato ${contrato.id}`);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo projeto — {contrato.id}</DialogTitle>
          <DialogDescription>
            Cada projeto vira uma obra independente em "Gestão de projetos". Use endereços distintos quando o contrato cobre instalações em locais diferentes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Tipo / nome</Label><Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></div>
          <div className="col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua/Av., logradouro" /></div>
          <div><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
          <div><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
          <div><Label>CEP</Label><Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
          <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
          <div><Label>UF</Label><Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0,2) })} /></div>
          <div><Label>Módulos</Label><Input type="number" value={form.modulos} onChange={(e) => setForm({ ...form, modulos: Number(e.target.value) })} /></div>
          <div><Label>Potência módulo (W)</Label><Input type="number" value={form.potenciaModuloW} onChange={(e) => setForm({ ...form, potenciaModuloW: Number(e.target.value) })} /></div>
          <div><Label>kWp</Label><Input type="number" step="0.01" value={form.kwp} onChange={(e) => setForm({ ...form, kwp: Number(e.target.value) })} /></div>
          <div className="col-span-2"><Label>Inversor</Label><Input value={form.inversor} onChange={(e) => setForm({ ...form, inversor: e.target.value })} /></div>
          <div className="col-span-2"><Label>Observações</Label><Textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- EDIT PROJETO ---------------- */
function EditProjetoDialog({ contrato, projeto, onClose }: { contrato: ContratoFull; projeto: ProjetoVinculado; onClose: () => void }) {
  const [form, setForm] = useState({
    tipo: projeto.tipo || "",
    endereco: projeto.endereco || "",
    numero: projeto.numero || "",
    bairro: projeto.bairro || "",
    cep: projeto.cep || "",
    cidade: projeto.cidade || "",
    uf: projeto.uf || "",
    modulos: projeto.modulos || 0,
    potenciaModuloW: projeto.potenciaModuloW || 0,
    kwp: projeto.kwp || 0,
    inversor: projeto.inversor || "",
    equipe: projeto.equipe || "",
    status: projeto.status || "Em projeto/aprovação",
    inicio: projeto.inicio || "",
    previsto: projeto.previsto || "",
    obs: projeto.obs || "",
  });

  function salvar() {
    if (!form.endereco.trim()) { toast.error("Endereço é obrigatório"); return; }
    updateProjeto(contrato.id, projeto.id, {
      tipo: form.tipo.trim() || "Projeto",
      endereco: form.endereco,
      numero: form.numero,
      bairro: form.bairro,
      cep: form.cep,
      cidade: form.cidade,
      uf: form.uf,
      modulos: Number(form.modulos) || 0,
      potenciaModuloW: Number(form.potenciaModuloW) || 0,
      kwp: Number(form.kwp) || 0,
      inversor: form.inversor,
      equipe: form.equipe,
      status: form.status,
      inicio: form.inicio,
      previsto: form.previsto,
      obs: form.obs,
    });
    toast.success(`Projeto ${projeto.id} atualizado`);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar projeto — {projeto.id}</DialogTitle>
          <DialogDescription>
            Contrato {contrato.id} — {contrato.cliente}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="col-span-2"><Label>Tipo / nome</Label><Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></div>
          <div className="col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
          <div><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
          <div><Label>CEP</Label><Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
          <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
          <div><Label>UF</Label><Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0,2) })} /></div>
          <div><Label>Módulos</Label><Input type="number" value={form.modulos} onChange={(e) => setForm({ ...form, modulos: Number(e.target.value) })} /></div>
          <div><Label>Potência módulo (W)</Label><Input type="number" value={form.potenciaModuloW} onChange={(e) => setForm({ ...form, potenciaModuloW: Number(e.target.value) })} /></div>
          <div><Label>kWp</Label><Input type="number" step="0.01" value={form.kwp} onChange={(e) => setForm({ ...form, kwp: Number(e.target.value) })} /></div>
          <div className="col-span-2"><Label>Inversor</Label><Input value={form.inversor} onChange={(e) => setForm({ ...form, inversor: e.target.value })} /></div>
          <div><Label>Equipe</Label><Input value={form.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Início</Label><Input type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
          <div><Label>Previsto</Label><Input type="date" value={form.previsto} onChange={(e) => setForm({ ...form, previsto: e.target.value })} /></div>
          <div className="col-span-2"><Label>Observações</Label><Textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="gap-1.5"><CheckCircle2 className="h-4 w-4" /> Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- KANBAN (etapas dos projetos aprovados) ---------------- */
const ETAPA_COLS: { key: string; label: string; tone: string }[] = [
  { key: "Stand-by",                       label: "Stand-by",                       tone: "border-t-red-400" },
  { key: "Novo projeto",                   label: "Novo projeto",                   tone: "border-t-indigo-400" },
  { key: "Vistoria pós contrato",          label: "Vistoria pós contrato",          tone: "border-t-emerald-400" },
  { key: "Novo projeto - PF",              label: "Novo projeto - Pessoa física",   tone: "border-t-yellow-400" },
  { key: "Novo projeto - PJ",              label: "Novo projeto - Pessoa jurídica", tone: "border-t-amber-500" },
  { key: "Elaboração de projeto",          label: "Elaboração de projeto",          tone: "border-t-blue-400" },
  { key: "Projeto em análise",             label: "Projeto em análise 3/6",         tone: "border-t-rose-400" },
  { key: "Parecer de acesso em aberto",    label: "Parecer de acesso em aberto",    tone: "border-t-emerald-500" },
  { key: "Etapa de obra",                  label: "Etapa de obra (Energisa x Terceiros)", tone: "border-t-red-500" },
  { key: "Projeto aprovado",               label: "Projeto aprovado",               tone: "border-t-slate-400" },
  { key: "Projeto executivo",              label: "Projeto executivo",              tone: "border-t-violet-400" },
  { key: "Vistoria pré-Energisa",          label: "Vistoria pré-Energisa",          tone: "border-t-orange-400" },
  { key: "Vistoria Energisa",              label: "Vistoria Energisa 4/6",          tone: "border-t-cyan-400" },
  { key: "Monitoramento",                  label: "Monitoramento",                  tone: "border-t-pink-400" },
  { key: "Compensação",                    label: "Compensação",                    tone: "border-t-teal-400" },
  { key: "Finalizado",                     label: "Finalizado",                     tone: "border-t-green-500" },
  { key: "Manutenção",                     label: "Manutenção",                     tone: "border-t-red-400" },
  { key: "Administrativo",                 label: "Administrativo",                 tone: "border-t-stone-400" },
  { key: "Administrativo concluído",       label: "Administrativo concluído",       tone: "border-t-emerald-300" },
  { key: "Vistoria pré contrato",          label: "Vistoria pré contrato",          tone: "border-t-emerald-400" },
  { key: "Estudos",                        label: "Estudos",                        tone: "border-t-slate-500" },
  { key: "Contrato cancelado",             label: "Contrato cancelado",             tone: "border-t-red-600" },
];

const ETAPA_KEYS = ETAPA_COLS.map((c) => c.key);
const DEBUG_OBRA_CODIGO = "OBR-20260526-710ec4";

function debugObraPipeline(o: Obra | null | undefined) {
  if (!o) return null;
  return {
    obra_id: o.id ?? null,
    codigo: o.obs?.match(/Código: ([^·]+)/)?.[1]?.trim() ?? null,
    status: o.status ?? null,
    etapa: o.status ?? null,
    projeto_contrato_id: o.obs?.match(/Projeto: ([0-9a-f-]+)/i)?.[1] ?? null,
    cliente: o.cliente ?? null,
    contrato: o.contrato ?? null,
    coluna_valida: !!o.status && ETAPA_KEYS.includes(o.status),
  };
}

function debugRowPipeline(r: ObraRow | null | undefined, extras?: { cliente?: string; contrato?: string; etapa?: string }) {
  if (!r) return null;
  return {
    obra_id: r.id ?? null,
    codigo: r.codigo ?? null,
    status: r.status ?? null,
    etapa: extras?.etapa ?? r.status ?? null,
    projeto_contrato_id: projetoContratoIdOf(r),
    cliente: extras?.cliente ?? null,
    contrato: extras?.contrato ?? null,
  };
}

function KanbanTab({ obras, setObras }: { obras: Obra[]; setObras: (v: Obra[]) => void }) {
  const contratos = useContratos();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"kanban" | "tabela">("kanban");
  const [dragId, setDragId] = useState<string | null>(null);

  const filtered = obras.filter((o) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    const keep = o.cliente.toLowerCase().includes(s)
      || o.id.toLowerCase().includes(s)
      || (o.contrato || "").toLowerCase().includes(s)
      || (o.obs || "").toLowerCase().includes(s);
    if (!keep) console.info("[engenharia] descarte:filtro", debugObraPipeline(o));
    return keep;
  });

  useEffect(() => {
    console.info("[engenharia] kanban:filtered", {
      busca: q,
      totalEntrada: obras.length,
      totalSaida: filtered.length,
      rows: filtered.map((o) => debugObraPipeline(o)),
      target: filtered.find((o) => o.obs?.includes(DEBUG_OBRA_CODIGO))
        ? filtered.filter((o) => o.obs?.includes(DEBUG_OBRA_CODIGO)).map((o) => debugObraPipeline(o))
        : null,
    });
  }, [filtered, obras.length, q]);

  const moveTo = (id: string, status: string) => {
    const cur = obras.find((o) => o.id === id);
    if (!cur || cur.status === status) return;
    setObras(obras.map((o) => o.id === id ? {
      ...o,
      status,
      finalizacao: status === "Finalizado" ? (o.finalizacao ?? new Date().toISOString().slice(0,10)) : o.finalizacao,
    } : o));
    toast.success(`${cur.cliente} → ${status}`);
  };

  const retornarComercial = (o: Obra) => {
    const link = findProjetoLink(o.id, contratos);
    if (!link) {
      toast.error("Esta obra não está vinculada a um projeto do Comercial");
      return;
    }
    const ok = window.confirm(
      `Retornar o projeto de ${o.cliente} para o Comercial (Assinados)?\n\n` +
      `Isso vai APAGAR informações da Engenharia: etapa atual, equipe, datas de início/finalização e observações operacionais.\n\n` +
      `O projeto poderá ser reeditado e reaprovado no Comercial. Deseja continuar?`
    );
    if (!ok) return;
    retornarProjetoComercial(link.contratoId, o.id);
    setObras(obras.filter((x) => x.id !== o.id));
    toast.success(`Projeto de ${o.cliente} retornado ao Comercial (Assinados).`);
  };

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Pesquisar cliente, projeto ou contrato…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 max-w-xs"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>Kanban</Button>
            <Button size="sm" variant={view === "tabela" ? "default" : "outline"} onClick={() => setView("tabela")}>Tabela</Button>
          </div>
        </div>
        {view === "kanban" ? (
          <div className="mt-2 text-xs text-muted-foreground">Arraste os cards entre as colunas para alterar a etapa.</div>
        ) : null}
      </Card>

      {view === "kanban" ? (
        <ObrasKanbanBlock obras={filtered} moveTo={moveTo} />
      ) : (

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Ações</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Módulos</TableHead>
                <TableHead className="text-center">kWp</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Previsto</TableHead>
                <TableHead className="min-w-[180px]">Etapa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">Nenhum projeto encontrado.</TableCell></TableRow>
              ) : filtered.map((o) => {
                const etapa = ETAPA_COLS.find((c) => c.key === o.status);
                return (
                <TableRow key={o.id}>
                  <TableCell>
                    <ActionsMenu label={fmtContrato(o.contrato)}>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Alterar etapa</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-[60vh] overflow-y-auto">
                          {ETAPA_COLS.map((c) => (
                            <DropdownMenuItem key={c.key} onSelect={() => moveTo(o.id, c.key)}>
                              {c.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => retornarComercial(o)}>
                        <RotateCcw className="mr-2 h-4 w-4 text-warning" />
                        <span className="text-warning">Retornar ao Comercial (Assinados)</span>
                      </DropdownMenuItem>
                    </ActionsMenu>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{fmtContrato(o.contrato)}</TableCell>
                  <TableCell className="font-medium">{o.cliente}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.tipo || "—"}</TableCell>
                  <TableCell className="text-center">{o.modulos}</TableCell>
                  <TableCell className="text-center">{o.potencia.toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{o.equipe || "—"}</TableCell>
                  <TableCell className="text-xs">{fmtBR(o.inicioReal || o.inicio)}</TableCell>
                  <TableCell className="text-xs">{fmtBR(o.previsto)}</TableCell>
                  <TableCell className="text-xs">
                    {etapa ? (
                      <span className="inline-flex rounded-md border px-2 py-0.5 text-xs">{etapa.label}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}



/* ---------------- CANCELADOS (engenharia) ---------------- */

function CanceladosEngTab({ contratos }: { contratos: ContratoFull[] }) {
  const cancelados = contratos.filter((c) => c.cancelado === true);
  const projetosCount = cancelados.reduce((s, c) => s + ((c.projetos ?? []).filter((p) => p.enviadoEngenharia || p.aprovado).length), 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos cancelados</div>
          <div className="mt-1 text-2xl font-bold text-destructive">{cancelados.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Projetos retirados</div>
          <div className="mt-1 text-2xl font-bold text-warning">{projetosCount}</div>
        </Card>
      </div>
      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Contratos cancelados — Engenharia</div>
        {cancelados.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum contrato cancelado.
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead className="w-[90px]">Opções</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-center">Projetos</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {cancelados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <ActionsMenu label={c.id}>
                      <DropdownMenuItem onSelect={() => {
                        const r = reativarContrato(c.id, "Engenharia");
                        if (!r.ok) { toast.error(r.motivo); return; }
                        toast.success(`Contrato ${c.id} reativado. Reaprovar para retornar à Engenharia.`);
                      }}>
                        Reativar
                      </DropdownMenuItem>
                    </ActionsMenu>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.cliente}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.motivoCancelamento ?? "—"}</TableCell>
                  <TableCell className="text-center text-xs">{(c.projetos ?? []).length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}


/* ---------- Bloco Kanban editável de Obras (Gestão de Projetos) ---------- */
const OBRAS_KANBAN_DEFAULTS: KCol[] = ETAPA_COLS.map((c) => ({
  id: `etapa:${c.key}`,
  titulo: c.label,
  ativo: true,
  tone: c.tone,
}));

function ObrasKanbanBlock({
  obras, moveTo,
}: {
  obras: Obra[];
  moveTo: (id: string, status: string) => void;
}) {
  const [manage, setManage] = useState(false);
  const est = useEstoqueState();
  const materialOK = (id: string) => {
    const n = est.necessidades.find((x) => x.obraId === id);
    return !!n && isMaterialEntregueTotal(n);
  };
  const { cols, setCols, assign, setAssign } = useKanbanColumns(
    "ms.engenharia.obras.kanban",
    OBRAS_KANBAN_DEFAULTS,
  );
  const colsAtivas = cols.filter((c) => c.ativo !== false);
  const items: KItem<Obra>[] = obras.map((o) => ({
    key: o.id,
    data: o,
    defaultColId: colsAtivas.some((c) => c.id === `etapa:${o.status}`) ? `etapa:${o.status}` : "etapa:Novo projeto",
  }));
  useEffect(() => {
    const payload = items.map((it) => ({
      ...debugObraPipeline(it.data),
      defaultColId: it.defaultColId,
      assignedColId: assign[it.key] ?? null,
      assignedColExists: !!assign[it.key] && colsAtivas.some((c) => c.id === assign[it.key]),
    }));
    console.info("[engenharia] kanban:items", {
      colsAtivas: colsAtivas.map((c) => c.id),
      rows: payload,
      target: payload.find((row) => row.codigo === DEBUG_OBRA_CODIGO) ?? null,
    });
  }, [assign, colsAtivas, items]);
  const handleDrop = (cardKey: string, colId: string) => {
    if (colId.startsWith("etapa:")) moveTo(cardKey, colId.slice(6));
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColunasButton onClick={() => setManage(true)} />
      </div>
      <KanbanGeneric
        cols={cols}
        items={items}
        assign={assign}
        setAssign={setAssign}
        onCardDrop={handleDrop}
        columnMinWidth={230}
        fullHeight
        renderCard={(o) => (
          <div className={`rounded-md border bg-card p-2 shadow-sm hover:shadow ${o.aguardandoLiberacaoFin ? "border-amber-400 ring-1 ring-amber-300/60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-semibold text-foreground line-clamp-2">{o.cliente || "Cliente não identificado"}</div>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">{fmtContrato(o.contrato)}</span>
            </div>
            {o.obs?.includes(DEBUG_OBRA_CODIGO) ? (
              <div className="mt-1 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                DEBUG REAL
              </div>
            ) : null}
            {o.tipo ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{o.tipo}</div> : null}
            <div className="mt-1 text-[10px] text-muted-foreground">Código: {o.obs?.match(/Código: ([^·]+)/)?.[1]?.trim() ?? "—"}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Status: {o.status || "—"}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Projeto: {o.obs?.match(/Projeto: ([0-9a-f-]+)/i)?.[1] ?? "—"}</div>
            <div className="mt-1 text-[10px] font-mono text-muted-foreground">Obra: {o.id}</div>
            {o.aguardandoLiberacaoFin ? (
              <div className="mt-1 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                Aguardando liberação Financiamento
              </div>
            ) : null}
            {materialOK(o.id) ? (
              <div className="mt-1 inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                Material entregue
              </div>
            ) : null}
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{o.modulos} mód · {o.potencia.toFixed(1)} kWp</span>
              <span>{o.equipe || "—"}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Início: {fmtBR(o.inicioReal || o.inicio)}</span>
              <span>Prev: {fmtBR(o.previsto)}</span>
            </div>
          </div>
        )}
      />
      <ColunasManager open={manage} onOpenChange={setManage} cols={cols} setCols={setCols} />
    </div>
  );
}

/* D6.8 Onda 4 — chip denso de strip operacional. */
function StripChip({
  label, value, tone = "muted",
}: { label: string; value: string | number; tone?: "muted" | "primary" | "info" | "success" | "warning" | "danger" }) {
  const toneText: Record<string, string> = {
    muted: "text-foreground",
    primary: "text-primary",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <span className={`font-mono font-semibold ${toneText[tone]}`}>{value}</span>
    </span>
  );
}
