/**
 * D18.17 — Listagem oficial de Contratos no padrão ERP:
 *  - SEM coluna "Ações" (removida)
 *  - Checkbox por linha + checkbox no header (select-all da aba/página)
 *  - Toolbar contextual acima da grade muda conforme aba/seleção
 *  - Ações operacionais ficam SEMPRE na toolbar, não na linha
 *  - Linha: clique no código abre workspace; duplo-clique em qualquer célula também
 *
 * Tela é EXCLUSIVA de contratos:
 *  - não importa PropostasPage / toolbar de proposta
 *  - não renderiza "Gerar nova proposta", "Aprovar/Reprovar proposta"
 * Gate: `comercial.contrato.visualizar`.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, ShieldAlert, Loader2, RefreshCcw, FileSignature, ExternalLink, Ban,
  FileText, Eye, Paperclip, History as HistoryIcon, PenLine, Send, CheckCircle2,
  Download, FilePlus2, Briefcase, X, Filter, Layout as LayoutIcon, ScrollText,
  FilePen, Banknote, Wrench, Coins,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
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
  // Seleção por aba (limpa ao trocar de aba)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

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

  const trocarTab = (v: string) => {
    setTab(v as TabKey);
    setSelecionados(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) { setSelecionados(new Set()); return; }
    setSelecionados(new Set(filtrados.map((r) => r.id)));
  };

  const limparSelecao = () => setSelecionados(new Set());

  const selecionadosList = useMemo(
    () => filtrados.filter((r) => selecionados.has(r.id)),
    [filtrados, selecionados],
  );
  const selCount = selecionadosList.length;
  const selUnico = selCount === 1 ? selecionadosList[0] : null;
  const allChecked = filtrados.length > 0 && selCount === filtrados.length;
  const someChecked = selCount > 0 && !allChecked;

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

  const abrirContrato = (id: string) =>
    navigate({ to: "/comercial/contratos/$contratoId", params: { contratoId: id } });

  const abrirPropostaOrigem = (c: ContratoSupabaseListItem) =>
    navigate({ to: "/comercial/contratos/$contratoId", params: { contratoId: c.id }, hash: "tab=propostas" });

  const acaoNoWorkspace = (msg = "Ação disponível dentro do workspace do contrato.") =>
    toast.info(msg);

  return (
    <TooltipProvider>
      <div className="p-2 space-y-2">
        <PageHeader
          title="Contratos"
          subtitle="Esteira oficial: propostas aprovadas → minuta → gerado → assinatura → assinado"
        />

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
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por código, cliente, CPF/CNPJ, consultor, proposta..."
                className="pl-7 h-8"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {filtrados.length} de {data?.length ?? 0}
            </div>
          </div>
        </Card>

        {/* Toolbar contextual oficial */}
        <ContextualToolbar
          tab={tab}
          selCount={selCount}
          selUnico={selUnico}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
          onClearSel={limparSelecao}
          perms={{
            cancelar: permCancelar.data === true,
            editarMinuta: permEditarMinuta.data === true,
            gerar: permGerar.data === true,
            enviarAss: permEnviarAss.data === true,
            assinar: permAssinar.data === true,
          }}
          onAbrir={(id) => abrirContrato(id)}
          onAbrirProposta={(c) => abrirPropostaOrigem(c)}
          onCancelar={(c) => setCancelTarget({ id: c.id, codigo: c.codigo })}
          onWS={acaoNoWorkspace}
        />

        <Card className="p-2">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando contratos...
            </div>
          ) : isError ? (
            <div className="p-6 text-sm text-destructive">
              Erro ao carregar contratos: {(error as Error)?.message ?? "desconhecido"}
            </div>
          ) : filtrados.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
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
      </div>
    </TooltipProvider>
  );
}

/* ---------------- Toolbar contextual ---------------- */

type Perms = {
  cancelar: boolean;
  editarMinuta: boolean;
  gerar: boolean;
  enviarAss: boolean;
  assinar: boolean;
};

function ContextualToolbar({
  tab, selCount, selUnico, isFetching, onRefresh, onClearSel, perms,
  onAbrir, onAbrirProposta, onCancelar, onWS,
}: {
  tab: TabKey;
  selCount: number;
  selUnico: ContratoSupabaseListItem | null;
  isFetching: boolean;
  onRefresh: () => void;
  onClearSel: () => void;
  perms: Perms;
  onAbrir: (id: string) => void;
  onAbrirProposta: (c: ContratoSupabaseListItem) => void;
  onCancelar: (c: ContratoSupabaseListItem) => void;
  onWS: (msg?: string) => void;
}) {
  const acoesGlobais = (
    <>
      <ToolbarBtn icon={RefreshCcw} label="Atualizar" onClick={onRefresh} loading={isFetching} />
      <ToolbarBtn icon={Filter} label="Filtros" onClick={() => onWS("Filtros avançados em breve.")} />
      <ToolbarBtn icon={Download} label="Exportar" onClick={() => onWS("Exportação em breve.")} />
      <ToolbarBtn icon={LayoutIcon} label="Layout" onClick={() => onWS("Customização de layout em breve.")} />
    </>
  );

  // Sem seleção → só globais
  if (selCount === 0) {
    return (
      <Card className="p-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">Nenhum contrato selecionado</span>
          <Separator orientation="vertical" className="h-6 mx-1" />
          {acoesGlobais}
        </div>
      </Card>
    );
  }

  // Múltipla seleção → só ações em lote SEGURAS (lote ainda não habilitado)
  if (selCount > 1) {
    return (
      <Card className="p-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium">{selCount} contratos selecionados</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearSel}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpar seleção
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <ToolbarBtn icon={Download} label="Exportar selecionados" onClick={() => onWS("Exportação em breve.")} />
          <span className="text-xs text-muted-foreground ml-2">
            Ações em lote indisponíveis para esta seleção.
          </span>
        </div>
      </Card>
    );
  }

  // Seleção única → ações por aba
  const c = selUnico!;
  const cancelado = c.status === "CANCELADO" || c.cancelado;

  let acoes: React.ReactNode = null;
  if (tab === "minuta") {
    acoes = (
      <>
        <ToolbarBtn icon={Eye} label="Abrir minuta" onClick={() => onAbrir(c.id)} />
        <ToolbarBtn icon={PenLine} label="Editar minuta" onClick={() => onAbrir(c.id)} disabled={!perms.editarMinuta} disabledTip="Sem permissão (comercial.contrato.editar_minuta)." />
        <ToolbarBtn icon={ScrollText} label="Editar cláusulas" onClick={() => onAbrir(c.id)} disabled={!perms.editarMinuta} disabledTip="Sem permissão (comercial.contrato.editar_minuta)." />
        <ToolbarBtn icon={Paperclip} label="Anexar documentos" onClick={() => onWS()} />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <ToolbarBtn icon={FilePen} label="Gerar contrato" onClick={() => onWS()} disabled={!perms.gerar} disabledTip="Sem permissão (comercial.contrato.criar)." />
        <ToolbarBtn icon={Ban} label="Cancelar minuta" onClick={() => onCancelar(c)} danger disabled={!perms.cancelar || cancelado} disabledTip="Sem permissão (comercial.contrato.cancelar)." />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <PropostaOrigemBtn c={c} onClick={() => onAbrirProposta(c)} />
        <Cliente360Btn clienteId={c.cliente_id} />
      </>
    );
  } else if (tab === "gerado") {
    acoes = (
      <>
        <ToolbarBtn icon={Eye} label="Abrir contrato gerado" onClick={() => onAbrir(c.id)} />
        <ToolbarBtn icon={FileText} label="Visualizar PDF" onClick={() => onWS()} />
        <ToolbarBtn icon={Download} label="Baixar PDF" onClick={() => onWS()} />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <ToolbarBtn icon={Send} label="Enviar p/ assinatura" onClick={() => onWS()} disabled={!perms.enviarAss} disabledTip="Sem permissão (comercial.contrato.enviar_assinatura)." />
        <ToolbarBtn icon={Paperclip} label="Anexar contrato assinado" onClick={() => onWS()} />
        <ToolbarBtn icon={CheckCircle2} label="Marcar como aguardando assinatura" onClick={() => onWS()} />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <PropostaOrigemBtn c={c} onClick={() => onAbrirProposta(c)} />
        <Cliente360Btn clienteId={c.cliente_id} />
      </>
    );
  } else if (tab === "aguardando") {
    acoes = (
      <>
        <ToolbarBtn icon={Eye} label="Abrir contrato" onClick={() => onAbrir(c.id)} />
        <ToolbarBtn icon={Send} label="Reenviar assinatura" onClick={() => onWS()} disabled={!perms.enviarAss} disabledTip="Sem permissão (comercial.contrato.enviar_assinatura)." />
        <ToolbarBtn icon={Paperclip} label="Anexar contrato assinado" onClick={() => onWS()} />
        <ToolbarBtn icon={CheckCircle2} label="Marcar como assinado" onClick={() => onAbrir(c.id)} disabled={!perms.assinar} disabledTip="Sem permissão (comercial.contrato.assinar)." />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <PropostaOrigemBtn c={c} onClick={() => onAbrirProposta(c)} />
        <Cliente360Btn clienteId={c.cliente_id} />
      </>
    );
  } else if (tab === "assinado") {
    acoes = (
      <>
        <ToolbarBtn icon={Eye} label="Abrir contrato" onClick={() => onAbrir(c.id)} />
        <ToolbarBtn icon={Briefcase} label="Abrir projetos" onClick={() => onAbrir(c.id)} />
        <ToolbarBtn icon={FilePlus2} label="Criar aditivo" onClick={() => onWS()} />
        <ToolbarBtn icon={Coins} label="Ver comissões" onClick={() => onWS()} />
        <ToolbarBtn icon={Paperclip} label="Ver documentos" onClick={() => onWS()} />
        <ToolbarBtn icon={HistoryIcon} label="Ver timeline" onClick={() => onWS()} />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <ToolbarBtn icon={Banknote} label="Gerar financeiro" onClick={() => onWS()} disabled disabledTip="Disponível após integração do módulo financeiro." />
        <ToolbarBtn icon={Wrench} label="Enviar engenharia" onClick={() => onWS()} disabled disabledTip="Disponível após integração do módulo de engenharia." />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <PropostaOrigemBtn c={c} onClick={() => onAbrirProposta(c)} />
        <Cliente360Btn clienteId={c.cliente_id} />
      </>
    );
  } else {
    // cancelado — somente leitura
    acoes = (
      <>
        <ToolbarBtn icon={Eye} label="Visualizar contrato" onClick={() => onAbrir(c.id)} />
        <ToolbarBtn icon={Paperclip} label="Ver documentos" onClick={() => onWS()} />
        <ToolbarBtn icon={HistoryIcon} label="Ver timeline" onClick={() => onWS()} />
        <Separator orientation="vertical" className="h-6 mx-1" />
        <PropostaOrigemBtn c={c} onClick={() => onAbrirProposta(c)} />
        <Cliente360Btn clienteId={c.cliente_id} />
      </>
    );
  }

  return (
    <Card className="p-2">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs font-medium">1 contrato selecionado</span>
        <span className="text-xs text-muted-foreground font-mono ml-1">
          {c.codigo ?? c.id.slice(0, 8)}
        </span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearSel}>
          <X className="h-3.5 w-3.5 mr-1" /> Limpar seleção
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        {acoes}
      </div>
    </Card>
  );
}

function ToolbarBtn({
  icon: Icon, label, onClick, disabled, danger, loading, disabledTip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  loading?: boolean;
  disabledTip?: string;
}) {
  const btn = (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 px-2 text-xs ${danger ? "text-destructive hover:text-destructive" : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <Icon className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
      {label}
    </Button>
  );
  const tip = disabled && disabledTip ? disabledTip : label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{btn}</span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

function PropostaOrigemBtn({ c, onClick }: { c: ContratoSupabaseListItem; onClick: () => void }) {
  return (
    <ToolbarBtn
      icon={FileText}
      label="Proposta origem"
      onClick={onClick}
      disabled={!c.proposta_origem_id}
      disabledTip="Contrato sem proposta de origem vinculada."
    />
  );
}

function Cliente360Btn({ clienteId }: { clienteId: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/comercial/clientes/$clienteId" params={{ clienteId }}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Cliente 360º
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent>Abrir cliente 360º</TooltipContent>
    </Tooltip>
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
        {checkbox}
        {common}
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
        {checkbox}
        {common}
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
        {checkbox}
        {common}
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
        {checkbox}
        {common}
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
      {checkbox}
      {common}
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
        {checkCell}
        {commonCells}
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
        {checkCell}
        {commonCells}
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
        {checkCell}
        {commonCells}
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
        {checkCell}
        {commonCells}
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
      {checkCell}
      {commonCells}
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
