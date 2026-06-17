/**
 * C-ENT.10 — Listagem oficial de Comissões.
 * Fonte: public.comercial_comissoes. Gate: comercial.comissao.visualizar.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShieldAlert, Loader2, RefreshCcw, Search, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  useComissoesAll, type ComissaoStatus, type ComissaoOrigem,
} from "@/lib/repositories/comercial-comissao-repo";
import { useHasPermission } from "@/hooks/use-has-permission";

export const Route = createFileRoute("/comercial/comissoes/")({
  head: () => ({ meta: [{ title: "Comissões — Meta Sun" }] }),
  component: ComissoesListPage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusTone: Record<ComissaoStatus, string> = {
  PREVISTA:    "bg-sky-50 text-sky-700 border-sky-200",
  APROVADA:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  LIBERADA:    "bg-amber-50 text-amber-700 border-amber-200",
  PAGA:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELADA:   "bg-slate-100 text-slate-600 border-slate-200",
  ESTORNADA:   "bg-red-50 text-red-700 border-red-200",
  SUBSTITUIDA: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function ComissoesListPage() {
  const perm = useHasPermission("comercial.comissao.visualizar");
  const [fStatus, setFStatus] = useState<"__todos__" | ComissaoStatus>("__todos__");
  const [fOrigem, setFOrigem] = useState<"__todos__" | ComissaoOrigem>("__todos__");
  const [busca, setBusca] = useState("");

  const { data, isLoading, refetch, isFetching } = useComissoesAll({
    status: fStatus === "__todos__" ? undefined : fStatus,
    origem: fOrigem === "__todos__" ? undefined : fOrigem,
  });

  const linhas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((r) =>
      [r.codigo, r.beneficiario_nome, r.vendedor_nome, r.contrato_id]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, busca]);

  if (perm.isLoading) return <div className="p-3 text-sm text-muted-foreground">Carregando permissões…</div>;
  if (perm.data === false) {
    return (
      <Card className="m-3 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4" /> Sem permissão para ver Comissões.
      </Card>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <PageHeader
        title="Comissões"
        subtitle="Comissões oficiais geradas a partir de contratos assinados e aditivos."
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="h-3 w-3 mr-1" /> Atualizar
          </Button>
        }
      />

      <Card className="p-2 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-7 h-8 text-sm" placeholder="Buscar por código, beneficiário ou contrato"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={fStatus} onValueChange={(v) => setFStatus(v as never)}>
          <SelectTrigger className="h-8 w-[150px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos os status</SelectItem>
            {(["PREVISTA","APROVADA","LIBERADA","PAGA","CANCELADA","ESTORNADA","SUBSTITUIDA"] as ComissaoStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fOrigem} onValueChange={(v) => setFOrigem(v as never)}>
          <SelectTrigger className="h-8 w-[140px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todas as origens</SelectItem>
            <SelectItem value="CONTRATO">Contrato</SelectItem>
            <SelectItem value="ADITIVO">Aditivo</SelectItem>
            <SelectItem value="AJUSTE">Ajuste</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-2">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Carregando…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Beneficiário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.codigo ?? c.id.slice(0,8)}</TableCell>
                  <TableCell>{c.beneficiario_nome ?? c.vendedor_nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.tipo_beneficiario}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{c.origem}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{Number(c.percentual).toFixed(2)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(c.valor_calculado)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusTone[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to="/comercial/comissoes/$comissaoId" params={{ comissaoId: c.id }}>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6 text-sm">
                    Nenhuma comissão encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
