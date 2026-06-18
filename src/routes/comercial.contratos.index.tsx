/**
 * D18.12 — Listagem oficial de Contratos com 4 abas da esteira:
 * Pendentes | Contratos Gerados | Contratos Assinados | Cancelados.
 * Fonte: public.contratos. Gate: `comercial.contrato.visualizar`.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, ShieldAlert, Loader2, RefreshCcw, FileSignature, ExternalLink, Ban, FileText, Eye,
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
import { useContratosSupabase, useCancelarContratoSupabase } from "@/lib/repositories/contratos-supabase-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { CancelarContratoDialog } from "@/components/app/contratos/CancelarContratoDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classificarEtapaContrato, badgeEtapaContrato, type EtapaContrato } from "@/lib/contrato-etapa";

export const Route = createFileRoute("/comercial/contratos/")({
  head: () => ({ meta: [{ title: "Contratos — Meta Sun" }] }),
  component: ContratosListPage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";

const statusBadge = (status: string, cancelado?: boolean) => {
  const etapa = classificarEtapaContrato(status, cancelado);
  const b = badgeEtapaContrato(etapa);
  return <Badge variant={b.variant} className={b.className}>{b.label}</Badge>;
};

function ContratosListPage() {
  const navigate = useNavigate();
  const perm = useHasPermission("comercial.contrato.visualizar");
  const permCancelar = useHasPermission("comercial.contrato.cancelar");
  const { data, isLoading, isError, error, refetch, isFetching } = useContratosSupabase();
  const cancelar = useCancelarContratoSupabase();
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState<EtapaContrato>("minuta");
  const [cancelTarget, setCancelTarget] = useState<{ id: string; codigo: string | null } | null>(null);

  const contagem = useMemo(() => {
    const rows = data ?? [];
    return {
      minuta: rows.filter((r) => classificarEtapaContrato(r.status, r.cancelado) === "minuta").length,
      gerado: rows.filter((r) => classificarEtapaContrato(r.status, r.cancelado) === "gerado").length,
      assinado: rows.filter((r) => classificarEtapaContrato(r.status, r.cancelado) === "assinado").length,
      cancelado: rows.filter((r) => classificarEtapaContrato(r.status, r.cancelado) === "cancelado").length,
    };
  }, [data]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const rows = (data ?? []).filter((r) => classificarEtapaContrato(r.status, r.cancelado) === etapa);
    if (!q) return rows;
    return rows.filter((r) =>
      [r.codigo, r.cliente_nome, r.consultor_nome, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, busca, etapa]);

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

  const dataGerada = (c: { dados?: Record<string, unknown> | null }): string | null => {
    const v = (c.dados as Record<string, unknown> | null | undefined)?.["gerado_em"];
    return typeof v === "string" ? v : null;
  };

  return (
    <TooltipProvider>
      <div className="p-2 space-y-2">
        <PageHeader
          title="Contratos"
          subtitle="Esteira oficial: propostas aprovadas → minuta → gerado → assinado"
          actions={
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCcw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          }
        />

        <Card className="p-2">
          <Tabs value={etapa} onValueChange={(v) => setEtapa(v as EtapaContrato)}>
            <TabsList>
              <TabsTrigger value="minuta">Pendentes de Redação ({contagem.minuta})</TabsTrigger>
              <TabsTrigger value="gerado">Contratos Gerados / Aguardando Assinatura ({contagem.gerado})</TabsTrigger>
              <TabsTrigger value="assinado">Contratos Assinados ({contagem.assinado})</TabsTrigger>
              <TabsTrigger value="cancelado">Cancelados ({contagem.cancelado})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por código, cliente, consultor ou status..."
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
            <div className="p-6 text-center text-sm text-muted-foreground">
              <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {etapa === "minuta"
                ? "Nenhum contrato pendente. Aprove uma proposta em /comercial → Propostas para criar uma minuta."
                : etapa === "gerado"
                  ? "Nenhum contrato aguardando assinatura. Gere um contrato a partir de uma minuta."
                  : etapa === "assinado"
                    ? "Nenhum contrato assinado. Registre a assinatura em um contrato gerado."
                    : "Nenhum contrato cancelado."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Consultor</TableHead>
                  <TableHead className="text-right">Valor global</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Gerado</TableHead>
                  <TableHead>Assinado</TableHead>
                  <TableHead className="text-right w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => {
                  const cancelado = c.status === "CANCELADO" || c.cancelado;
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{c.codigo ?? c.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">
                        {c.cliente_nome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.consultor_nome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(c.valor_total)}</TableCell>
                      <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">
                        {classificarEtapaContrato(c.status, c.cancelado)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(dataGerada(c))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(c.data_assinatura)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => navigate({ to: "/comercial/contratos/$contratoId", params: { contratoId: c.id } })}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir contrato</TooltipContent>
                          </Tooltip>
                          {c.cliente_id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to="/comercial/clientes/$clienteId" params={{ clienteId: c.cliente_id }}>
                                  <Button size="icon" variant="ghost" className="h-7 w-7">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>Cliente 360º</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => navigate({ to: "/comercial/contratos/$contratoId", params: { contratoId: c.id }, hash: "tab=propostas" })}>
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Proposta origem</TooltipContent>
                          </Tooltip>
                          {permCancelar.data === true && !cancelado && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                  onClick={() => setCancelTarget({ id: c.id, codigo: c.codigo })}>
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar contrato</TooltipContent>
                            </Tooltip>
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
