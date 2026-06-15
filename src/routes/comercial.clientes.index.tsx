/**
 * C-ENT.1.d — Listagem oficial de Clientes (Supabase).
 * Fonte: public.clientes. Gate: permissão `comercial.cliente.visualizar`.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert, Loader2, RefreshCcw, Users, Plus, ExternalLink, Target } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useClientesSupabase,
  useConsultoresMap,
  type ClientesOrder,
} from "@/lib/repositories/clientes-supabase-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { Open360Button } from "@/components/app/comercial/Open360Button";
import { ClienteCadastroSupabaseDialog } from "@/components/app/comercial/ClienteCadastroSupabaseDialog";
import { useCriarOportunidade } from "@/lib/repositories/oportunidades-repo";
import { toast } from "sonner";
import type { ClienteRecord } from "@/lib/clientes-store";

export const Route = createFileRoute("/comercial/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Meta Sun ERP" }] }),
  component: ClientesIndexPage,
});

function ClientesIndexPage() {
  const perm = useHasPermission("comercial.cliente.visualizar");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ClientesOrder>("nome");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const enabled = perm.data === true;
  const { data, isLoading, isFetching, isError, error, refetch } = useClientesSupabase(
    { search, orderBy, orderDir, limit: 200 },
  );
  const cons = useConsultoresMap();
  const rows = useMemo(() => data ?? [], [data]);

  if (perm.isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando permissões…
      </div>
    );
  }

  if (!enabled) {
    return (
      <>
        <PageHeader title="Clientes" subtitle="Base oficial de clientes do ERP" />
        <Card className="mx-auto mt-8 max-w-xl border-amber-300 bg-amber-50 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-600" />
          <h2 className="mt-3 font-semibold">Acesso negado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você não possui permissão para visualizar clientes.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Base oficial de clientes do ERP"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail…"
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex items-end gap-1">
            <Select value={orderBy} onValueChange={(v) => setOrderBy(v as ClientesOrder)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nome">Ordenar por nome</SelectItem>
                <SelectItem value="updated_at">Última atualização</SelectItem>
                <SelectItem value="created_at">Data de criação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orderDir} onValueChange={(v) => setOrderDir(v as "asc" | "desc")}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Crescente</SelectItem>
                <SelectItem value="desc">Decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {isFetching ? "atualizando…" : `${rows.length} cliente${rows.length === 1 ? "" : "s"}`}
          </Badge>
        </div>

        <div className="mt-3 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%]">Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Última atualização</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Carregando clientes…
                  </TableCell>
                </TableRow>
              )}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-destructive py-6">
                    Erro ao carregar: {(error as Error)?.message ?? "desconhecido"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    <Users className="mx-auto mb-2 h-5 w-5 opacity-60" />
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.map((c) => (
                <ClienteRow
                  key={c.id}
                  c={c}
                  consultor={c.consultor_id ? cons.data?.[c.consultor_id] ?? "—" : "—"}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}

function ClienteRow({
  c,
  consultor,
}: {
  c: import("@/lib/repositories/clientes-supabase-repo").ClienteRow;
  consultor: string;
}) {
  const navigate = useNavigate();
  const open = () => navigate({ to: "/comercial/clientes/$clienteId", params: { clienteId: c.id } });
  return (
    <TableRow className="cursor-pointer" onClick={open}>
      <TableCell className="font-medium">
        <Link
          to="/comercial/clientes/$clienteId"
          params={{ clienteId: c.id }}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {c.nome}
        </Link>
      </TableCell>
      <TableCell className="font-mono text-xs">{c.doc || "—"}</TableCell>
      <TableCell>{c.telefone || "—"}</TableCell>
      <TableCell className="truncate max-w-[220px]">{c.email || "—"}</TableCell>
      <TableCell>{consultor}</TableCell>
      <TableCell className="text-xs">{fmtDate(c.updated_at)}</TableCell>
      <TableCell className="text-xs">{fmtDate(c.created_at)}</TableCell>
      <TableCell className="text-right">
        <Open360Button clienteId={c.id} />
      </TableCell>
    </TableRow>
  );
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s.slice(0, 10);
  }
}
