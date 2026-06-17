/**
 * C-ENT.10 — Painel reutilizável de Comissões de um Contrato.
 * Lista todas as comissões (todas as origens e versões), com ações inline.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExternalLink, CheckCircle2, Shuffle, Ban, DollarSign, FilePlus2 } from "lucide-react";
import {
  useComissoesPorContrato,
  useAprovarComissao,
  useCancelarComissao,
  useLiberarComissao,
  useMarcarComissaoPaga,
  type Comissao,
  type ComissaoStatus,
} from "@/lib/repositories/comercial-comissao-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { SubstituirComissaoDialog } from "./SubstituirComissaoDialog";

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (s: ComissaoStatus) => {
  const tone: Record<ComissaoStatus, string> = {
    PREVISTA:    "bg-sky-50 text-sky-700 border-sky-200",
    APROVADA:    "bg-indigo-50 text-indigo-700 border-indigo-200",
    LIBERADA:    "bg-amber-50 text-amber-700 border-amber-200",
    PAGA:        "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELADA:   "bg-slate-100 text-slate-600 border-slate-200",
    ESTORNADA:   "bg-red-50 text-red-700 border-red-200",
    SUBSTITUIDA: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return <Badge variant="outline" className={tone[s]}>{s}</Badge>;
};

const origemBadge = (o: Comissao["origem"]) => {
  const map = { CONTRATO: "Contrato", ADITIVO: "Aditivo", AJUSTE: "Ajuste" } as const;
  return <Badge variant="secondary" className="text-[10px]">{map[o] ?? o}</Badge>;
};

export function ComissoesContratoPanel({ contratoId }: { contratoId: string }) {
  const { data, isLoading } = useComissoesPorContrato(contratoId);
  const permAprovar = useHasPermission("comercial.comissao.aprovar");
  const permSubst   = useHasPermission("comercial.comissao.substituir");
  const permLib     = useHasPermission("comercial.comissao.liberar");
  const permPagar   = useHasPermission("comercial.comissao.pagar");
  const permCanc    = useHasPermission("comercial.comissao.cancelar");

  const aprovar = useAprovarComissao();
  const liberar = useLiberarComissao();
  const pagar   = useMarcarComissaoPaga();
  const cancelar = useCancelarComissao();

  const [substAlvo, setSubstAlvo] = useState<Comissao | null>(null);

  return (
    <Card className="p-2">
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
          {(data ?? []).map((c) => {
            const canMutate = !["PAGA","CANCELADA","SUBSTITUIDA","ESTORNADA"].includes(c.status);
            return (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.codigo ?? c.id.slice(0,8)}</TableCell>
                <TableCell>{c.beneficiario_nome ?? c.vendedor_nome ?? "—"}</TableCell>
                <TableCell className="text-xs">{c.tipo_beneficiario}</TableCell>
                <TableCell>{origemBadge(c.origem)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(c.percentual).toFixed(2)}%</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(c.valor_calculado)}</TableCell>
                <TableCell>{statusBadge(c.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link to="/comercial/comissoes/$comissaoId" params={{ comissaoId: c.id }}>
                      <Button size="icon" variant="ghost" title="Abrir">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                    {canMutate && c.status === "PREVISTA" && permAprovar.data && (
                      <Button size="icon" variant="ghost" title="Aprovar"
                        onClick={() => aprovar.mutate({ comissaoId: c.id })}>
                        <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                      </Button>
                    )}
                    {canMutate && (c.status === "APROVADA" || c.status === "PREVISTA") && permLib.data && (
                      <Button size="icon" variant="ghost" title="Liberar"
                        onClick={() => liberar.mutate({ comissaoId: c.id })}>
                        <DollarSign className="h-3 w-3 text-amber-600" />
                      </Button>
                    )}
                    {c.status === "LIBERADA" && permPagar.data && (
                      <Button size="icon" variant="ghost" title="Marcar paga"
                        onClick={() => pagar.mutate({ comissaoId: c.id })}>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      </Button>
                    )}
                    {canMutate && permSubst.data && (
                      <Button size="icon" variant="ghost" title="Substituir"
                        onClick={() => setSubstAlvo(c)}>
                        <Shuffle className="h-3 w-3 text-blue-600" />
                      </Button>
                    )}
                    {canMutate && permCanc.data && (
                      <Button size="icon" variant="ghost" title="Cancelar"
                        onClick={() => {
                          const m = window.prompt("Motivo (mín. 5 caracteres):");
                          if (m && m.trim().length >= 5) cancelar.mutate({ comissaoId: c.id, motivo: m.trim() });
                        }}>
                        <Ban className="h-3 w-3 text-red-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {!isLoading && (data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-6 text-sm">
                <FilePlus2 className="h-4 w-4 inline mr-1" />
                Nenhuma comissão registrada para este contrato.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <SubstituirComissaoDialog
        open={!!substAlvo}
        onOpenChange={(v) => !v && setSubstAlvo(null)}
        comissao={substAlvo}
      />
    </Card>
  );
}
