/**
 * C-ENT.8 — Lista reutilizável de Aditivos (Contrato ou Projeto).
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { AditivoSupabase } from "@/lib/repositories/aditivos-repo";

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (s: string) => {
  if (s === "APLICADO") return <Badge>{s}</Badge>;
  if (s === "CANCELADO") return <Badge variant="destructive">{s}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

type Props = {
  aditivos: AditivoSupabase[];
  mostrarProjeto?: boolean;
  empty?: string;
};

export function AditivosListPanel({ aditivos, mostrarProjeto = true, empty }: Props) {
  return (
    <Card className="p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Tipo</TableHead>
            {mostrarProjeto && <TableHead>Projeto</TableHead>}
            <TableHead className="text-right">Δ Valor</TableHead>
            <TableHead className="text-right">Δ Potência</TableHead>
            <TableHead className="text-right">Δ Módulos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aditivos.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs">{a.codigo ?? a.id.slice(0, 8)}</TableCell>
              <TableCell><Badge variant="outline">{a.tipo_escopo}</Badge></TableCell>
              {mostrarProjeto && (
                <TableCell className="font-mono text-xs">{a.projeto_id ? a.projeto_id.slice(0, 8) : "—"}</TableCell>
              )}
              <TableCell className={`text-right tabular-nums ${Number(a.diferenca_valor) >= 0 ? "" : "text-amber-600"}`}>
                {fmtBRL(a.diferenca_valor)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{Number(a.diferenca_potencia ?? 0).toFixed(2)}</TableCell>
              <TableCell className="text-right tabular-nums">{a.diferenca_modulos ?? 0}</TableCell>
              <TableCell>{statusBadge(a.status)}</TableCell>
              <TableCell className="text-xs max-w-xs truncate" title={a.motivo ?? ""}>{a.motivo ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleDateString("pt-BR")}
              </TableCell>
            </TableRow>
          ))}
          {aditivos.length === 0 && (
            <TableRow>
              <TableCell colSpan={mostrarProjeto ? 9 : 8} className="text-center text-muted-foreground py-6 text-sm">
                {empty ?? "Nenhum aditivo registrado."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
