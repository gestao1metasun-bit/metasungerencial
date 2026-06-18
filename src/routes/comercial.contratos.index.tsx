/**
 * D18.18 — Listagem oficial de Contratos no padrão visual do ERP (Propostas/RM).
 *
 *  - Usa `EnterpriseRecordToolbar` (mesmo componente do Propostas) com:
 *      • availableActions: atualizar/anexos/historico/exportar/filtros/colunas
 *      • availableProcesses: contextuais por aba (Editar minuta, Visualizar PDF,
 *        Baixar PDF, Reenviar assinatura, Abrir projetos, Criar aditivo, etc.)
 *      • statusActions (botões circulares coloridos linha 2) por aba:
 *        Gerar contrato / Enviar assinatura / Marcar assinado / Criar aditivo /
 *        Gerar financeiro / Enviar engenharia / Cancelar contrato
 *      • layoutBar (Padrão/Compacto/Confortável + densidade) idêntico ao Propostas.
 *  - SEM coluna "Ações" — checkbox por linha + select-all.
 *  - 5 abas oficiais: minuta · gerado · aguardando · assinado · cancelado.
 *  - Tela é EXCLUSIVA de contratos. Nada de "Aprovar/Reprovar/Gerar nova
 *    proposta" — cada botão executa atividade de CONTRATO.
 *
 * Gate: `comercial.contrato.visualizar`.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, ShieldAlert, Loader2, FileSignature,
  PenLine, FilePen, Send, CheckCircle2, Ban,
  FilePlus2, Banknote, Wrench, RefreshCcw,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  EnterpriseRecordToolbar, layoutBarRm, AttachmentDialog, ModuloHistoricoDrawer,
} from "@/components/app/enterprise";
import { useContratosSupabase, useCancelarContratoSupabase, type ContratoSupabaseListItem } from "@/lib/repositories/contratos-supabase-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { CancelarContratoDialog } from "@/components/app/contratos/CancelarContratoDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classificarEtapaContrato, badgeEtapaContrato, type EtapaContrato } from "@/lib/contrato-etapa";
import { toast } from "sonner";

export const Route = createFileRoute("/comercial/contratos/")({
  head: () => ({ meta: [{ title: "Contratos — Meta Sun" }] }),
  component: ContratosListPage,
});

/* ---------------- Utils ---------------- */
const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";

const fmtDoc = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return v;
};

const diasDesde = (s: string | null | undefined) => {
  if (!s) return null;
  const ms = Date.now() - new Date(s).getTime();
  if (isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
};

const dataGerada = (c: ContratoSupabaseListItem): string | null => {
  const v = (c.dados as Record<string, unknown> | null | undefined)?.["gerado_em"];
  return typeof v === "string" ? v : null;
};
const dataEnvioAssinatura = (c: ContratoSupabaseListItem): string | null => {
  const v = (c.dados as Record<string, unknown> | null | undefined)?.["enviado_assinatura_em"];
  return typeof v === "string" ? v : null;
};

function statusBadge(status: string, cancelado?: boolean) {
  const etapa = classificarEtapaContrato(status, cancelado);
  const b = badgeEtapaContrato(etapa);
  return <Badge variant={b.variant} className={b.className}>{b.label}</Badge>;
}

type TabKey = EtapaContrato;

const TABS: { key: TabKey; label: string }[] = [
  { key: "minuta",     label: "Pendentes de Redação" },
  { key: "gerado",     label: "Contratos Gerados" },
  { key: "aguardando", label: "Aguardando Assinatura" },
  { key: "assinado",   label: "Contratos Assinados" },
  { key: "cancelado",  label: "Cancelados" },
];

/* ============================================================
 * Página
 * ========================================================== */
function ContratosListPage() {
  const navigate = useNavigate();
  const perm = useHasPermission("comercial.contrato.visualizar");
  const permCancelar = useHasPermission("comercial.contrato.cancelar");
  const permEditarMinuta = useHasPermission("comercial.contrato.editar_minuta");
  const permGerar = useHasPermission("comercial.contrato.criar");
  const permEnviarAss = useHasPermission("comercial.contrato.enviar_assinatura");
  const permAssinar = useHasPermission("comercial.contrato.assinar");

  const { data, isLoading, isError, error, refetch, isFetching } = useContratosSupabase();
  const cancelar = useCancelarContratoSupabase();

  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<TabKey>("minuta");
  const [cancelTarget, setCancelTarget] = useState<{ id: string; codigo: string | null } | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [anexosOpen, setAnexosOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);

  // Layout RM (estilo Propostas)
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">("compact");
  const [layoutPreset, setLayoutPreset] = useState<string>("padrao");

  const contagem = useMemo(() => {
    const rows = data ?? [];
    const acc: Record<TabKey, number> = { minuta: 0, gerado: 0, aguardando: 0, assinado: 0, cancelado: 0 };
    for (const r of rows) acc[classificarEtapaContrato(r.status, r.cancelado)]++;
    return acc;
  }, [data]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const rows = (data ?? []).filter((r) => classificarEtapaContrato(r.status, r.cancelado) === tab);
    if (!q) return rows;
    return rows.filter((r) =>
      [r.codigo, r.cliente_nome, r.cliente_doc, r.consultor_nome, r.status, r.proposta_origem_numero]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, busca, tab]);

  const trocarTab = (v: string) => { setTab(v as TabKey); setSelecionados(new Set()); };
  const toggleOne = (id: string, checked: boolean) =>
    setSelecionados((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; });
  const toggleAll = (checked: boolean) =>
    setSelecionados(checked ? new Set(filtrados.map((r) => r.id)) : new Set());

  const selecionadosList = useMemo(
    () => filtrados.filter((r) => selecionados.has(r.id)),
    [filtrados, selecionados],
  );
  const selUnico = selecionadosList.length === 1 ? selecionadosList[0] : null;
  const allChecked = filtrados.length > 0 && selecionadosList.length === filtrados.length;
  const someChecked = selecionadosList.length > 0 && !allChecked;

  if (perm.isLoading) {
    return (
      <div className="p-2">
        <PageHeader title="Contratos" subtitle="Carregando..." />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando permissão...
        </div>
      </div>
    );
  }
  if (perm.data === false) {
    return (
      <div className="p-2">
        <PageHeader title="Contratos" subtitle="Acesso negado" />
        <Card className="p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium">Você não tem permissão para visualizar contratos.</p>
            <p className="text-sm text-muted-foreground">
              Permissão necessária: <code>comercial.contrato.visualizar</code>.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const abrirContrato = (id: string, hash?: string) =>
    navigate({
      to: "/comercial/contratos/$contratoId",
      params: { contratoId: id },
      ...(hash ? { hash } : {}),
    });

  // D18.19 — focos da minuta navegáveis via hash (#tab=...&minuta=...&focus=...)
  const FOCO_MINUTA = {
    abrir:       "tab=resumo&minuta=contratante",
    contratuais: "tab=resumo&minuta=contratuais",
    clausulas:   "tab=resumo&minuta=clausulas",
    previa:      "tab=resumo&minuta=previa",
    gerar:       "tab=resumo&minuta=previa&focus=gerar",
    documentos:  "tab=documentos",
  } as const;

  const acaoNoWS = (msg = "Ação disponível dentro do workspace do contrato.") =>
    toast.info(msg);

  /* ---------------- statusActions (linha 2 — círculos coloridos por aba) ---------------- */
  const semSel = !selUnico;
  const semSelMsg = "Selecione exatamente 1 contrato.";
  const cancelado = selUnico ? (selUnico.status === "CANCELADO" || !!selUnico.cancelado) : false;

  const statusActions = (() => {
    if (tab === "minuta") {
      return [
        { key: "gerar_contrato", label: "Gerar Contrato", icon: FilePen, tone: "success" as const, wide: true,
          disabled: semSel || !permGerar.data || cancelado,
          disabledReason: semSel ? semSelMsg : (!permGerar.data ? "Sem permissão (comercial.contrato.criar)." : "Contrato cancelado."),
          onClick: () => selUnico && abrirContrato(selUnico.id, FOCO_MINUTA.gerar) },
        { key: "editar_minuta", label: "Editar Minuta", icon: PenLine, tone: "info" as const,
          disabled: semSel || !permEditarMinuta.data,
          disabledReason: semSel ? semSelMsg : "Sem permissão (comercial.contrato.editar_minuta).",
          onClick: () => selUnico && abrirContrato(selUnico.id, FOCO_MINUTA.contratuais) },
        { key: "cancelar_minuta", label: "Cancelar Minuta", icon: Ban, tone: "danger" as const,
          disabled: semSel || !permCancelar.data || cancelado,
          disabledReason: semSel ? semSelMsg : "Sem permissão (comercial.contrato.cancelar).",
          onClick: () => selUnico && setCancelTarget({ id: selUnico.id, codigo: selUnico.codigo }) },
      ];
    }
    if (tab === "gerado") {
      return [
        { key: "enviar_assinatura", label: "Enviar Assinatura", icon: Send, tone: "primary" as const, wide: true,
          disabled: semSel || !permEnviarAss.data,
          disabledReason: semSel ? semSelMsg : "Sem permissão (comercial.contrato.enviar_assinatura).",
          onClick: () => acaoNoWS("Enviar para assinatura: ação executada dentro do workspace do contrato.") },
        { key: "cancelar_contrato", label: "Cancelar Contrato", icon: Ban, tone: "danger" as const,
          disabled: semSel || !permCancelar.data || cancelado,
          disabledReason: semSel ? semSelMsg : "Sem permissão (comercial.contrato.cancelar).",
          onClick: () => selUnico && setCancelTarget({ id: selUnico.id, codigo: selUnico.codigo }) },
      ];
    }
    if (tab === "aguardando") {
      return [
        { key: "reenviar_ass", label: "Reenviar Assinatura", icon: Send, tone: "info" as const, wide: true,
          disabled: semSel || !permEnviarAss.data,
          disabledReason: semSel ? semSelMsg : "Sem permissão (comercial.contrato.enviar_assinatura).",
          onClick: () => acaoNoWS("Reenviar link de assinatura no workspace do contrato.") },
        { key: "marcar_assinado", label: "Marcar como Assinado", icon: CheckCircle2, tone: "success" as const, wide: true,
          disabled: semSel || !permAssinar.data,
          disabledReason: semSel ? semSelMsg : "Sem permissão (comercial.contrato.assinar).",
          onClick: () => selUnico && abrirContrato(selUnico.id) },
        { key: "cancelar_contrato", label: "Cancelar Contrato", icon: Ban, tone: "danger" as const,
          disabled: semSel || !permCancelar.data || cancelado,
          disabledReason: semSel ? semSelMsg : "Sem permissão (comercial.contrato.cancelar).",
          onClick: () => selUnico && setCancelTarget({ id: selUnico.id, codigo: selUnico.codigo }) },
      ];
    }
    if (tab === "assinado") {
      return [
        { key: "criar_aditivo", label: "Criar Aditivo", icon: FilePlus2, tone: "warning" as const, wide: true,
          disabled: semSel,
          disabledReason: semSel ? semSelMsg : undefined,
          onClick: () => acaoNoWS("Criar aditivo: abra o workspace do contrato.") },
        { key: "gerar_financeiro", label: "Gerar Financeiro", icon: Banknote, tone: "primary" as const, wide: true,
          disabled: true,
          disabledReason: "Disponível após integração do módulo financeiro (D18.16).",
          onClick: () => acaoNoWS() },
        { key: "enviar_engenharia", label: "Enviar Engenharia", icon: Wrench, tone: "primary" as const, wide: true,
          disabled: true,
          disabledReason: "Disponível após integração do módulo de engenharia (D18.16).",
          onClick: () => acaoNoWS() },
      ];
    }
    // cancelado — sem ações destrutivas
    return [];
  })();

  /* ---------------- availableProcesses (dropdown "Processos") ---------------- */
  const availableProcesses = (() => {
    if (tab === "minuta") {
      return [
        { key: "editar_clausulas",  label: "Editar Cláusulas",       group: "Minuta" },
        { key: "anexar_documentos", label: "Anexar Documentos",      group: "Minuta" },
        { key: "abrir_workspace",   label: "Abrir Minuta",           group: "Minuta" },
        { key: "abrir_proposta",    label: "Abrir Proposta Origem",  group: "Referências" },
      ];
    }
    if (tab === "gerado") {
      return [
        { key: "ver_pdf",                label: "Visualizar PDF",                    group: "PDF" },
        { key: "baixar_pdf",             label: "Baixar PDF",                        group: "PDF" },
        { key: "anexar_assinado",        label: "Anexar Contrato Assinado",          group: "Assinatura" },
        { key: "marcar_aguardando",      label: "Marcar como Aguardando Assinatura", group: "Assinatura" },
        { key: "abrir_workspace",        label: "Abrir Contrato",                    group: "Referências" },
        { key: "abrir_proposta",         label: "Abrir Proposta Origem",             group: "Referências" },
      ];
    }
    if (tab === "aguardando") {
      return [
        { key: "anexar_assinado", label: "Anexar Contrato Assinado", group: "Assinatura" },
        { key: "abrir_workspace", label: "Abrir Contrato",           group: "Referências" },
        { key: "abrir_proposta",  label: "Abrir Proposta Origem",    group: "Referências" },
      ];
    }
    if (tab === "assinado") {
      return [
        { key: "abrir_projetos",  label: "Abrir Projetos",       group: "Execução" },
        { key: "ver_comissoes",   label: "Ver Comissões",        group: "Execução" },
        { key: "ver_documentos",  label: "Ver Documentos",       group: "Documentos" },
        { key: "ver_timeline",   label: "Ver Timeline",          group: "Documentos" },
        { key: "abrir_workspace", label: "Abrir Contrato",       group: "Referências" },
        { key: "abrir_proposta",  label: "Abrir Proposta Origem", group: "Referências" },
      ];
    }
    return [
      { key: "abrir_workspace", label: "Visualizar Contrato",   group: "Referências" },
      { key: "ver_documentos",  label: "Ver Documentos",        group: "Documentos" },
      { key: "ver_timeline",    label: "Ver Timeline",          group: "Documentos" },
      { key: "abrir_proposta",  label: "Abrir Proposta Origem", group: "Referências" },
    ];
  })();

  const handleProcess = (key: string) => {
    if (!selUnico) { toast.info(semSelMsg); return; }
    if (key === "abrir_workspace") {
      abrirContrato(selUnico.id, FOCO_MINUTA.abrir); return;
    }
    if (key === "editar_clausulas") {
      abrirContrato(selUnico.id, FOCO_MINUTA.clausulas); return;
    }
    if (key === "abrir_proposta") {
      if (!selUnico.proposta_origem_id) { toast.info("Contrato sem proposta de origem vinculada."); return; }
      navigate({ to: "/comercial/contratos/$contratoId", params: { contratoId: selUnico.id }, hash: "tab=propostas" });
      return;
    }
    if (key === "anexar_documentos" || key === "anexar_assinado") {
      abrirContrato(selUnico.id, FOCO_MINUTA.documentos); return;
    }
    if (key === "abrir_projetos") { abrirContrato(selUnico.id, "tab=projetos"); return; }
    acaoNoWS();
  };

  /* ---------------- onAction (ações básicas) ---------------- */
  const handleAction = (a: string) => {
    if (a === "novo") {
      toast.info("Contratos nascem de propostas aprovadas. Abra Comercial → Propostas e use 'Enviar para Contratos'.");
      navigate({ to: "/comercial/propostas" });
      return;
    }
    if (a === "editar") {
      if (!selUnico) { toast.info(semSelMsg); return; }
      if (!permEditarMinuta.data) { toast.error("Sem permissão (comercial.contrato.editar_minuta)."); return; }
      abrirContrato(selUnico.id);
      return;
    }
    if (a === "favoritos") {
      if (!selUnico) { toast.info(semSelMsg); return; }
      toast.info("Favoritos do contrato disponíveis no workspace.");
      return;
    }
    if (a === "enviar") {
      if (!selUnico) { toast.info(semSelMsg); return; }
      if (tab === "gerado" || tab === "aguardando") {
        if (!permEnviarAss.data) { toast.error("Sem permissão (comercial.contrato.enviar_assinatura)."); return; }
        acaoNoWS("Enviar para assinatura: ação executada dentro do workspace do contrato.");
        return;
      }
      acaoNoWS("Use o workspace do contrato para envios específicos da etapa atual.");
      return;
    }
    if (a === "atualizar") { void refetch(); toast.info("Lista de contratos atualizada."); return; }
    if (a === "anexos") {
      if (!selUnico) { toast.info(semSelMsg); return; }
      setAnexosOpen(true); return;
    }
    if (a === "historico" || a === "auditoria") {
      if (!selUnico) { toast.info(semSelMsg); return; }
      setHistoricoOpen(true); return;
    }
    if (a === "exportar") {
      try {
        const linhas = filtrados;
        const header = ["codigo","cliente","cpf_cnpj","cidade","uf","consultor","valor_total","potencia_kwp","status","etapa","proposta_origem","criado_em","assinado_em"];
        const SEP = ";";
        const esc = (v: unknown) => {
          if (v == null) return "";
          const s = String(v).replace(/"/g, '""');
          return /["\n;]/.test(s) ? `"${s}"` : s;
        };
        const csv = [header.join(SEP), ...linhas.map((c) => [
          c.codigo, c.cliente_nome, c.cliente_doc, c.cliente_cidade, c.cliente_uf,
          c.consultor_nome, c.valor_total, c.potencia_kwp, c.status,
          classificarEtapaContrato(c.status, c.cancelado), c.proposta_origem_numero,
          c.created_at, c.data_assinatura,
        ].map(esc).join(SEP))].join("\r\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a2 = document.createElement("a");
        a2.href = url;
        a2.download = `contratos-${tab}-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a2); a2.click(); a2.remove();
        URL.revokeObjectURL(url);
        toast.success(`Exportado ${linhas.length} contrato(s) em CSV.`);
      } catch (e) {
        toast.error((e as Error)?.message ?? "Falha ao exportar.");
      }
      return;
    }
    if (a === "filtroAvancado" || a === "filtroRapido" || a === "colunas") {
      const inp = document.querySelector<HTMLInputElement>("[data-contratos-search]");
      if (inp) { inp.scrollIntoView({ behavior: "smooth", block: "center" }); inp.focus(); }
      else toast.info("Use a busca acima da tabela.");
      return;
    }
    acaoNoWS();
  };

  /* ---------------- Render ---------------- */
  const densityClass =
    density === "spacious" ? "text-sm" :
    density === "comfortable" ? "text-sm" :
    "text-xs";

  return (
    <div className="p-2 space-y-2">
      <PageHeader
        title="Contratos"
        subtitle="Esteira oficial: propostas aprovadas → minuta → gerado → assinatura → assinado"
      />

      {/* Toolbar Enterprise (mesmo componente do Propostas) */}
      <EnterpriseRecordToolbar
        entityType="contratos"
        selectedIds={selUnico ? [selUnico.id] : selecionadosList.map((s) => s.id)}
        splitSecondaryActions
        availableActions={[
          "novo", "editar", "atualizar",
          "anexos", "historico", "auditoria", "favoritos",
          "exportar", "enviar",
          "filtroRapido", "filtroAvancado", "colunas",
        ]}
        availableProcesses={availableProcesses}
        onAction={(a) => handleAction(a)}
        onProcess={(k) => handleProcess(k)}
        statusActions={statusActions}
        layoutBar={layoutBarRm({
          density,
          onDensityChange: (d) => setDensity(d),
          currentPreset: layoutPreset,
          presets: [
            { key: "padrao",      label: "Padrão" },
            { key: "compacto",    label: "Compacto" },
            { key: "confortavel", label: "Confortável" },
            { key: "espacoso",    label: "Espaçoso" },
          ],
          onPresetChange: (k) => {
            setLayoutPreset(k);
            if (k === "compacto") setDensity("compact");
            else if (k === "confortavel") setDensity("comfortable");
            else if (k === "espacoso") setDensity("spacious");
            else setDensity("compact");
          },
        })}
      />

      {/* Abas + busca */}
      <Card className="p-2">
        <Tabs value={tab} onValueChange={trocarTab}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label} ({contagem[t.key]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-contratos-search
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar por código, cliente, CPF/CNPJ, consultor, proposta..."
              className="pl-7 h-8"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtrados.length} de {data?.length ?? 0}
            {selecionadosList.length > 0 && ` · ${selecionadosList.length} selecionado(s)`}
          </div>
          {selecionadosList.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setSelecionados(new Set())}
            >
              limpar seleção
            </button>
          )}
        </div>
      </Card>

      <Card className="p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando contratos...
          </div>
        ) : isError ? (
          <div className="p-6 text-sm text-destructive flex items-center gap-2">
            Erro ao carregar contratos: {(error as Error)?.message ?? "desconhecido"}
            <button className="underline" onClick={() => void refetch()}>
              <RefreshCcw className="h-3.5 w-3.5 inline mr-1" /> tentar novamente
            </button>
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className={densityClass}>
            <Table>
              <TableHeader>
                <ColumnsHeader
                  tab={tab}
                  allChecked={allChecked}
                  someChecked={someChecked}
                  onToggleAll={toggleAll}
                />
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => (
                  <ContratoRow
                    key={c.id}
                    c={c}
                    tab={tab}
                    selected={selecionados.has(c.id)}
                    onToggle={(v) => toggleOne(c.id, v)}
                    onOpen={() => abrirContrato(c.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {isFetching && !isLoading && (
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> atualizando...
          </div>
        )}
      </Card>

      <CancelarContratoDialog
        open={!!cancelTarget}
        onOpenChange={(v: boolean) => !v && setCancelTarget(null)}
        contratoId={cancelTarget?.id ?? null}
        codigo={cancelTarget?.codigo ?? null}
        loading={cancelar.isPending}
        onConfirm={async (motivo: string, observacao?: string | null) => {
          if (!cancelTarget) return;
          await cancelar.mutateAsync({ id: cancelTarget.id, motivo, observacao });
          setCancelTarget(null);
        }}
      />

      {selUnico && (
        <AttachmentDialog
          open={anexosOpen}
          onOpenChange={setAnexosOpen}
          entidade="contratos"
          entidadeId={selUnico.id}
          titulo={`Anexos · Contrato ${selUnico.codigo ?? selUnico.id.slice(0, 8)}`}
          descricao={selUnico.cliente_nome ? `Cliente: ${selUnico.cliente_nome}` : undefined}
          categoriaPadrao="contrato"
        />
      )}

      {selUnico && (
        <ModuloHistoricoDrawer
          open={historicoOpen}
          onOpenChange={setHistoricoOpen}
          entidade="contrato"
          entidadeId={selUnico.id}
          titulo={`Histórico · Contrato ${selUnico.codigo ?? selUnico.id.slice(0, 8)}`}
        />
      )}
    </div>
  );
}

/* ---------------- Header por aba ---------------- */
function ColumnsHeader({
  tab, allChecked, someChecked, onToggleAll,
}: {
  tab: TabKey;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: (v: boolean) => void;
}) {
  const checkbox = (
    <TableHead className="w-8">
      <Checkbox
        checked={allChecked ? true : someChecked ? "indeterminate" : false}
        onCheckedChange={(v) => onToggleAll(v === true)}
        aria-label="Selecionar todos"
      />
    </TableHead>
  );
  const common = (
    <>
      <TableHead>Código</TableHead>
      <TableHead>Cliente</TableHead>
      <TableHead>CPF/CNPJ</TableHead>
      <TableHead>Cidade/UF</TableHead>
      <TableHead>Consultor</TableHead>
      <TableHead className="text-right">Valor contrato</TableHead>
    </>
  );
  if (tab === "minuta") {
    return (
      <TableRow>
        {checkbox}{common}
        <TableHead className="text-right">Potência (kWp)</TableHead>
        <TableHead className="text-right">Módulos</TableHead>
        <TableHead>Proposta origem</TableHead>
        <TableHead>Entrada</TableHead>
        <TableHead className="text-right">Dias</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Etapa</TableHead>
      </TableRow>
    );
  }
  if (tab === "gerado") {
    return (
      <TableRow>
        {checkbox}{common}
        <TableHead>Proposta origem</TableHead>
        <TableHead>Geração</TableHead>
        <TableHead className="text-right">Dias</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    );
  }
  if (tab === "aguardando") {
    return (
      <TableRow>
        {checkbox}{common}
        <TableHead>Proposta origem</TableHead>
        <TableHead>Envio assinatura</TableHead>
        <TableHead className="text-right">Dias aguard.</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    );
  }
  if (tab === "assinado") {
    return (
      <TableRow>
        {checkbox}{common}
        <TableHead className="text-right">Potência (kWp)</TableHead>
        <TableHead className="text-right">Projetos</TableHead>
        <TableHead>Assinatura</TableHead>
        <TableHead>Proposta origem</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    );
  }
  return (
    <TableRow>
      {checkbox}{common}
      <TableHead>Proposta origem</TableHead>
      <TableHead>Cancelado em</TableHead>
      <TableHead>Motivo</TableHead>
    </TableRow>
  );
}

/* ---------------- Linha ---------------- */
function ContratoRow({
  c, tab, selected, onToggle, onOpen,
}: {
  c: ContratoSupabaseListItem;
  tab: TabKey;
  selected: boolean;
  onToggle: (v: boolean) => void;
  onOpen: () => void;
}) {
  const codigo = c.codigo ?? c.id.slice(0, 8);
  const propostaOrigem = c.proposta_origem_numero
    ? <span className="text-xs font-mono">{c.proposta_origem_numero}</span>
    : <span className="text-xs text-muted-foreground">—</span>;
  const cidadeUf =
    c.cliente_cidade || c.cliente_uf
      ? `${c.cliente_cidade ?? "—"}${c.cliente_uf ? ` / ${c.cliente_uf}` : ""}`
      : "—";

  const checkCell = (
    <TableCell className="w-8" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={selected}
        onCheckedChange={(v) => onToggle(v === true)}
        aria-label={`Selecionar contrato ${codigo}`}
      />
    </TableCell>
  );

  const commonCells = (
    <>
      <TableCell
        className="font-mono text-xs text-primary cursor-pointer hover:underline"
        onClick={onOpen}
      >
        {codigo}
      </TableCell>
      <TableCell className="font-medium">
        {c.cliente_nome ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-xs font-mono">{fmtDoc(c.cliente_doc)}</TableCell>
      <TableCell className="text-xs">{cidadeUf}</TableCell>
      <TableCell className="text-xs">
        {c.consultor_nome ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{fmtBRL(c.valor_total)}</TableCell>
    </>
  );

  const rowProps = {
    className: `hover:bg-muted/40 cursor-default ${tab === "cancelado" ? "opacity-80" : ""} ${selected ? "bg-muted/30" : ""}`,
    onDoubleClick: onOpen,
  };

  if (tab === "minuta") {
    const dias = diasDesde(c.created_at);
    return (
      <TableRow {...rowProps}>
        {checkCell}{commonCells}
        <TableCell className="text-right tabular-nums text-xs">{(c.potencia_kwp ?? 0).toFixed(2)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{c.modulos_qtde ?? 0}</TableCell>
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{dias ?? "—"}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
        <TableCell className="text-xs uppercase text-muted-foreground">
          {classificarEtapaContrato(c.status, c.cancelado)}
        </TableCell>
      </TableRow>
    );
  }
  if (tab === "gerado") {
    const ger = dataGerada(c);
    return (
      <TableRow {...rowProps}>
        {checkCell}{commonCells}
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(ger)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{diasDesde(ger) ?? "—"}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
      </TableRow>
    );
  }
  if (tab === "aguardando") {
    const env = dataEnvioAssinatura(c) ?? dataGerada(c);
    return (
      <TableRow {...rowProps}>
        {checkCell}{commonCells}
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(env)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{diasDesde(env) ?? "—"}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
      </TableRow>
    );
  }
  if (tab === "assinado") {
    return (
      <TableRow {...rowProps}>
        {checkCell}{commonCells}
        <TableCell className="text-right tabular-nums text-xs">{(c.potencia_kwp ?? 0).toFixed(2)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{c.projetos_count}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(c.data_assinatura)}</TableCell>
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
      </TableRow>
    );
  }
  // cancelado
  return (
    <TableRow {...rowProps}>
      {checkCell}{commonCells}
      <TableCell>{propostaOrigem}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{fmtDate(c.updated_at)}</TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
        {c.motivo_cancelamento ?? "—"}
      </TableCell>
    </TableRow>
  );
}

/* ---------------- Empty ---------------- */
function EmptyState({ tab }: { tab: TabKey }) {
  const msg =
    tab === "minuta"      ? "Nenhum contrato pendente de redação. Envie uma proposta APROVADA para Contratos a partir de /comercial → Propostas."
  : tab === "gerado"      ? "Nenhum contrato gerado. Gere o PDF a partir de uma minuta pendente."
  : tab === "aguardando"  ? "Nenhum contrato aguardando assinatura. Envie um contrato gerado para assinatura."
  : tab === "assinado"    ? "Nenhum contrato assinado. Registre a assinatura em um contrato aguardando."
  : "Nenhum contrato cancelado.";
  return (
    <div className="p-6 text-center text-sm text-muted-foreground">
      <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
      {msg}
    </div>
  );
}
