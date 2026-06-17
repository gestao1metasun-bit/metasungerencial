/**
 * C-ENT.5 — Listagem oficial de Contratos Supabase.
 * Fonte: public.contratos + contrato_propostas + projetos.
 * Gate: permissão `comercial.contrato.visualizar`.
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
import { classificarEtapaContrato, type EtapaContrato } from "@/lib/contrato-etapa";

export const Route = createFileRoute("/comercial/contratos/")({
  head: () => ({ meta: [{ title: "Contratos — Meta Sun" }] }),
  component: ContratosListPage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (status: string, cancelado?: boolean) => {
  const etapa = classificarEtapaContrato(status, cancelado);
  if (etapa === "cancelado") return <Badge variant="destructive">CANCELADO</Badge>;
  if (etapa === "minuta") return <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40">CONTRATO PENDENTE</Badge>;
  return <Badge>ATIVO</Badge>;
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
      ativo: rows.filter((r) => classificarEtapaContrato(r.status, r.cancelado) === "ativo").length,
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

  return (
    <TooltipProvider>
      <div className="p-2 space-y-2">
        <PageHeader
          title="Contratos"
          subtitle="Contratos oficiais gerados a partir de propostas aprovadas"
          actions={
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCcw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          }
        />

        <Card className="p-2">
          <Tabs value={etapa} onValueChange={(v) => setEtapa(v as EtapaContrato)}>
            <TabsList>
              <TabsTrigger value="minuta">Pendentes ({contagem.minuta})</TabsTrigger>
              <TabsTrigger value="ativo">Ativos ({contagem.ativo})</TabsTrigger>
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
                : etapa === "ativo"
                  ? "Nenhum contrato ativo. Aprove uma minuta para movê-la para Ativos."
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
                  <TableHead className="text-right">Potência (kWp)</TableHead>
                  <TableHead className="text-center">Projetos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
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
                      <TableCell className="text-right tabular-nums">
                        {c.potencia_kwp != null ? Number(c.potencia_kwp).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{c.projetos_count}</TableCell>
                      <TableCell>{statusBadge(c.status, c.cancelado)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => navigate({ to: "/comercial/contratos/$contratoId", params: { contratoId: c.id }, hash: "tab=propostas" })}>
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Propostas origem</TooltipContent>
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
