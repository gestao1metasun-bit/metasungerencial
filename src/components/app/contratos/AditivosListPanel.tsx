/**
 * C-ENT.8 / C-ENT.9 — Lista reutilizável de Aditivos.
 * Mostra tipo (NORMAL/COMPENSATÓRIO), referência ao aditivo original e
 * disponibiliza a ação "Gerar compensatório" para APLICADOS.
 *
 * Aditivo APLICADO é imutável: não há ação de cancelar/editar — apenas
 * compensar via novo aditivo (mensagem oficial exibida em tooltip de bloqueio).
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Ban } from "lucide-react";
import type { AditivoSupabase } from "@/lib/repositories/aditivos-repo";

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MSG_IMUTAVEL =
  "Aditivo aplicado não pode ser cancelado ou editado. Para corrigir seus efeitos, gere um aditivo compensatório.";

function statusBadge(s: string) {
  if (s === "APLICADO") return <Badge>{s}</Badge>;
  if (s === "CANCELADO") return <Badge variant="destructive">{s}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

function tipoBadge(t: "NORMAL" | "COMPENSATORIO") {
  if (t === "COMPENSATORIO") {
    return <Badge variant="outline" className="border-amber-500 text-amber-700">COMPENSATÓRIO</Badge>;
  }
  return <Badge variant="outline">NORMAL</Badge>;
}

type Props = {
  aditivos: AditivoSupabase[];
  mostrarProjeto?: boolean;
  empty?: string;
  /** C-ENT.9 — habilita botão "Gerar compensatório" em APLICADOS. */
  podeCompensar?: boolean;
  onCompensar?: (aditivo: AditivoSupabase) => void;
};

export function AditivosListPanel({
  aditivos, mostrarProjeto = true, empty, podeCompensar = false, onCompensar,
}: Props) {
  // Mapa codigo → aditivo (para mostrar "Compensa: ADT-XXX")
  const byId = new Map(aditivos.map((a) => [a.id, a] as const));
  // Quais aditivos foram compensados ao menos uma vez (badge "compensado")
  const compensados = new Set(
    aditivos
      .filter((a) => a.tipo_aditivo === "COMPENSATORIO" && a.aditivo_origem_id)
      .map((a) => a.aditivo_origem_id as string),
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Escopo</TableHead>
              {mostrarProjeto && <TableHead>Projeto</TableHead>}
              <TableHead className="text-right">Δ Valor</TableHead>
              <TableHead className="text-right">Δ Potência</TableHead>
              <TableHead className="text-right">Δ Módulos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aditivos.map((a) => {
              const origem = a.aditivo_origem_id ? byId.get(a.aditivo_origem_id) : null;
              const foiCompensado = compensados.has(a.id);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">
                    <div className="flex flex-col">
                      <span>{a.codigo ?? a.id.slice(0, 8)}</span>
                      {a.tipo_aditivo === "COMPENSATORIO" && (
                        <span className="text-[10px] text-amber-700">
                          Compensa: {origem?.codigo ?? (a.aditivo_origem_id ?? "").slice(0, 8)}
                        </span>
                      )}
                      {foiCompensado && (
                        <span className="text-[10px] text-muted-foreground">Compensado por aditivo posterior</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{tipoBadge(a.tipo_aditivo)}</TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.status === "APLICADO" && podeCompensar && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                          onClick={() => onCompensar?.(a)}
                          title="Gerar aditivo compensatório"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Compensar
                        </Button>
                      )}
                      {a.status === "APLICADO" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground"
                              disabled
                              aria-label="Aditivo aplicado é imutável"
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">{MSG_IMUTAVEL}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {aditivos.length === 0 && (
              <TableRow>
                <TableCell colSpan={mostrarProjeto ? 11 : 10} className="text-center text-muted-foreground py-6 text-sm">
                  {empty ?? "Nenhum aditivo registrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </TooltipProvider>
  );
}
