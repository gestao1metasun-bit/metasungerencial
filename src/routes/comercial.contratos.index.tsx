/**
 * D18.15 — Listagem oficial de Contratos com 5 abas separadas da esteira:
 * Pendentes de Redação | Contratos Gerados | Aguardando Assinatura |
 * Contratos Assinados | Cancelados.
 *
 * Tela é EXCLUSIVA de contratos:
 *  - não importa PropostasPage / toolbar de proposta
 *  - não renderiza botão "Gerar nova proposta", "Aprovar/Reprovar proposta"
 *  - colunas, ações e dados são todos de contrato
 * Fonte oficial: public.contratos (via contratos-supabase-repo).
 * Gate: `comercial.contrato.visualizar`.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, ShieldAlert, Loader2, RefreshCcw, FileSignature, ExternalLink, Ban,
  FileText, Eye, Paperclip, History as HistoryIcon, PenLine, Send, CheckCircle2,
  Download, FilePlus2, Briefcase,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { data, isLoading, isError, error, refetch, isFetching } = useContratosSupabase();
  const cancelar = useCancelarContratoSupabase();
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<TabKey>("minuta");
  const [cancelTarget, setCancelTarget] = useState<{ id: string; codigo: string | null } | null>(null);

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

  const acaoIndisponivel = () =>
    toast.info("Ação disponível dentro do workspace do contrato.");

  return (
    <TooltipProvider>
      <div className="p-2 space-y-2">
        <PageHeader
          title="Contratos"
          subtitle="Esteira oficial: propostas aprovadas → minuta → gerado → assinatura → assinado"
          actions={
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCcw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          }
        />

        <Card className="p-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
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
                <ColumnsHeader tab={tab} />
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => (
                  <ContratoRow
                    key={c.id}
                    c={c}
                    tab={tab}
                    permCancelar={permCancelar.data === true}
                    onAbrir={() => abrirContrato(c.id)}
                    onAbrirProposta={() => abrirPropostaOrigem(c)}
                    onCancelar={() => setCancelTarget({ id: c.id, codigo: c.codigo })}
                    onAcaoNoWorkspace={acaoIndisponivel}
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

/* ---------------- Header por aba ---------------- */

function ColumnsHeader({ tab }: { tab: TabKey }) {
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
        {common}
        <TableHead className="text-right">Potência (kWp)</TableHead>
        <TableHead className="text-right">Módulos</TableHead>
        <TableHead>Proposta origem</TableHead>
        <TableHead>Entrada</TableHead>
        <TableHead className="text-right">Dias</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Etapa</TableHead>
        <TableHead className="text-right w-44">Ações</TableHead>
      </TableRow>
    );
  }
  if (tab === "gerado") {
    return (
      <TableRow>
        {common}
        <TableHead>Proposta origem</TableHead>
        <TableHead>Geração</TableHead>
        <TableHead className="text-right">Dias</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right w-44">Ações</TableHead>
      </TableRow>
    );
  }
  if (tab === "aguardando") {
    return (
      <TableRow>
        {common}
        <TableHead>Proposta origem</TableHead>
        <TableHead>Envio assinatura</TableHead>
        <TableHead className="text-right">Dias aguard.</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right w-44">Ações</TableHead>
      </TableRow>
    );
  }
  if (tab === "assinado") {
    return (
      <TableRow>
        {common}
        <TableHead className="text-right">Potência (kWp)</TableHead>
        <TableHead className="text-right">Projetos</TableHead>
        <TableHead>Assinatura</TableHead>
        <TableHead>Proposta origem</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right w-44">Ações</TableHead>
      </TableRow>
    );
  }
  return (
    <TableRow>
      {common}
      <TableHead>Proposta origem</TableHead>
      <TableHead>Cancelado em</TableHead>
      <TableHead>Motivo</TableHead>
      <TableHead className="text-right w-32">Ações</TableHead>
    </TableRow>
  );
}

/* ---------------- Linha ---------------- */

function ContratoRow({
  c, tab, permCancelar, onAbrir, onAbrirProposta, onCancelar, onAcaoNoWorkspace,
}: {
  c: ContratoSupabaseListItem;
  tab: TabKey;
  permCancelar: boolean;
  onAbrir: () => void;
  onAbrirProposta: () => void;
  onCancelar: () => void;
  onAcaoNoWorkspace: () => void;
}) {
  const cancelado = c.status === "CANCELADO" || c.cancelado;
  const codigo = c.codigo ?? c.id.slice(0, 8);
  const propostaOrigem = c.proposta_origem_numero
    ? <span className="text-xs font-mono">{c.proposta_origem_numero}</span>
    : <span className="text-xs text-muted-foreground">—</span>;
  const cidadeUf =
    c.cliente_cidade || c.cliente_uf
      ? `${c.cliente_cidade ?? "—"}${c.cliente_uf ? ` / ${c.cliente_uf}` : ""}`
      : "—";

  const commonCells = (
    <>
      <TableCell className="font-mono text-xs">{codigo}</TableCell>
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

  if (tab === "minuta") {
    const dias = diasDesde(c.created_at);
    return (
      <TableRow className="hover:bg-muted/40">
        {commonCells}
        <TableCell className="text-right tabular-nums text-xs">{(c.potencia_kwp ?? 0).toFixed(2)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{c.modulos_qtde ?? 0}</TableCell>
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{dias ?? "—"}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
        <TableCell className="text-xs uppercase text-muted-foreground">{classificarEtapaContrato(c.status, c.cancelado)}</TableCell>
        <TableCell className="text-right">
          <RowActions
            actions={[
              { icon: Eye,         tip: "Abrir minuta",         onClick: onAbrir },
              { icon: PenLine,     tip: "Editar minuta",        onClick: onAbrir },
              { icon: Paperclip,   tip: "Anexar documentos",    onClick: onAcaoNoWorkspace },
              { icon: FileText,    tip: "Proposta origem",      onClick: onAbrirProposta, show: !!c.proposta_origem_id },
              { icon: ExternalLink,tip: "Cliente 360º",         to: { path: "/comercial/clientes/$clienteId", clienteId: c.cliente_id } },
              { icon: Ban,         tip: "Cancelar minuta",      onClick: onCancelar, danger: true, show: permCancelar && !cancelado },
            ]}
          />
        </TableCell>
      </TableRow>
    );
  }

  if (tab === "gerado") {
    const ger = dataGerada(c);
    return (
      <TableRow className="hover:bg-muted/40">
        {commonCells}
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(ger)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{diasDesde(ger) ?? "—"}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
        <TableCell className="text-right">
          <RowActions
            actions={[
              { icon: Eye,         tip: "Abrir contrato gerado", onClick: onAbrir },
              { icon: FileText,    tip: "Visualizar PDF",        onClick: onAcaoNoWorkspace },
              { icon: Download,    tip: "Baixar PDF",            onClick: onAcaoNoWorkspace },
              { icon: Send,        tip: "Enviar p/ assinatura",  onClick: onAcaoNoWorkspace },
              { icon: FileText,    tip: "Proposta origem",       onClick: onAbrirProposta, show: !!c.proposta_origem_id },
              { icon: ExternalLink,tip: "Cliente 360º",          to: { path: "/comercial/clientes/$clienteId", clienteId: c.cliente_id } },
              { icon: Ban,         tip: "Cancelar contrato",     onClick: onCancelar, danger: true, show: permCancelar && !cancelado },
            ]}
          />
        </TableCell>
      </TableRow>
    );
  }

  if (tab === "aguardando") {
    const env = dataEnvioAssinatura(c) ?? dataGerada(c);
    return (
      <TableRow className="hover:bg-muted/40">
        {commonCells}
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(env)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{diasDesde(env) ?? "—"}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
        <TableCell className="text-right">
          <RowActions
            actions={[
              { icon: Eye,         tip: "Abrir contrato",        onClick: onAbrir },
              { icon: Send,        tip: "Reenviar assinatura",   onClick: onAcaoNoWorkspace },
              { icon: Paperclip,   tip: "Anexar contrato assinado", onClick: onAcaoNoWorkspace },
              { icon: CheckCircle2,tip: "Marcar como assinado",  onClick: onAbrir },
              { icon: FileText,    tip: "Proposta origem",       onClick: onAbrirProposta, show: !!c.proposta_origem_id },
              { icon: ExternalLink,tip: "Cliente 360º",          to: { path: "/comercial/clientes/$clienteId", clienteId: c.cliente_id } },
              { icon: Ban,         tip: "Cancelar contrato",     onClick: onCancelar, danger: true, show: permCancelar && !cancelado },
            ]}
          />
        </TableCell>
      </TableRow>
    );
  }

  if (tab === "assinado") {
    return (
      <TableRow className="hover:bg-muted/40">
        {commonCells}
        <TableCell className="text-right tabular-nums text-xs">{(c.potencia_kwp ?? 0).toFixed(2)}</TableCell>
        <TableCell className="text-right tabular-nums text-xs">{c.projetos_count}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{fmtDate(c.data_assinatura)}</TableCell>
        <TableCell>{propostaOrigem}</TableCell>
        <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
        <TableCell className="text-right">
          <RowActions
            actions={[
              { icon: Eye,         tip: "Abrir contrato",  onClick: onAbrir },
              { icon: Briefcase,   tip: "Abrir projetos",  onClick: onAbrir },
              { icon: FilePlus2,   tip: "Criar aditivo",   onClick: onAcaoNoWorkspace },
              { icon: HistoryIcon, tip: "Ver comissões",   onClick: onAcaoNoWorkspace },
              { icon: FileText,    tip: "Proposta origem", onClick: onAbrirProposta, show: !!c.proposta_origem_id },
              { icon: ExternalLink,tip: "Cliente 360º",    to: { path: "/comercial/clientes/$clienteId", clienteId: c.cliente_id } },
            ]}
          />
        </TableCell>
      </TableRow>
    );
  }

  // cancelado — somente leitura
  return (
    <TableRow className="hover:bg-muted/40 opacity-80">
      {commonCells}
      <TableCell>{propostaOrigem}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{fmtDate(c.updated_at)}</TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
        {c.motivo_cancelamento ?? "—"}
      </TableCell>
      <TableCell className="text-right">
        <RowActions
          actions={[
            { icon: Eye,         tip: "Visualizar contrato", onClick: onAbrir },
            { icon: FileText,    tip: "Proposta origem",     onClick: onAbrirProposta, show: !!c.proposta_origem_id },
            { icon: ExternalLink,tip: "Cliente 360º",        to: { path: "/comercial/clientes/$clienteId", clienteId: c.cliente_id } },
          ]}
        />
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

/* ---------------- RowActions canônico ---------------- */

type ActionItem = {
  icon: React.ComponentType<{ className?: string }>;
  tip: string;
  onClick?: () => void;
  to?: { path: "/comercial/clientes/$clienteId"; clienteId: string };
  show?: boolean;
  danger?: boolean;
};

function RowActions({ actions }: { actions: ActionItem[] }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {actions.filter((a) => a.show !== false).map((a, i) => {
        const Icon = a.icon;
        const btn = (
          <Button
            size="icon"
            variant="ghost"
            className={`h-7 w-7 ${a.danger ? "text-destructive" : ""}`}
            onClick={a.onClick}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        );
        const wrapped = a.to ? (
          <Link to={a.to.path} params={{ clienteId: a.to.clienteId }}>{btn}</Link>
        ) : btn;
        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
            <TooltipContent>{a.tip}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
