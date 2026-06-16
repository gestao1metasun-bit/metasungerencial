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

export const Route = createFileRoute("/comercial/contratos/")({
  head: () => ({ meta: [{ title: "Contratos — Meta Sun" }] }),
  component: ContratosListPage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (status: string) => {
  const s = (status ?? "").toUpperCase();
  if (s === "CANCELADO") return <Badge variant="destructive">{s}</Badge>;
  if (s === "ATIVO") return <Badge>{s}</Badge>;
  return <Badge variant="outline">{s || "—"}</Badge>;
};

function ContratosListPage() {
  const navigate = useNavigate();
  const perm = useHasPermission("comercial.contrato.visualizar");
  const permCancelar = useHasPermission("comercial.contrato.cancelar");
  const { data, isLoading, isError, error, refetch, isFetching } = useContratosSupabase();
  const cancelar = useCancelarContratoSupabase();
  const [busca, setBusca] = useState("");
  const [cancelTarget, setCancelTarget] = useState<{ id: string; codigo: string | null } | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const rows = data ?? [];
    if (!q) return rows;
    return rows.filter((r) =>
      [r.codigo, r.cliente_nome, r.consultor_nome, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, busca]);

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

  if (!perm.granted) {
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
          right={
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCcw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          }
        />

        <Card className="p-2">
          <div className="flex items-center gap-2">
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
              Nenhum contrato encontrado. Gere contratos a partir de propostas aprovadas em /comercial → Leads.
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
                      <TableCell>{statusBadge(c.status)}</TableCell>
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
                          {permCancelar.granted && !cancelado && (
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
          onOpenChange={(v) => !v && setCancelTarget(null)}
          contratoId={cancelTarget?.id ?? null}
          codigo={cancelTarget?.codigo ?? null}
          loading={cancelar.isPending}
          onConfirm={async (motivo, observacao) => {
            if (!cancelTarget) return;
            await cancelar.mutateAsync({ id: cancelTarget.id, motivo, observacao });
            setCancelTarget(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
