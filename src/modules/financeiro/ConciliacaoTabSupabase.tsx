/**
 * D15.3.d — ConciliacaoTab Supabase
 */
import { useState } from "react";
import { CheckCircle2, Undo2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  useExtratoConta,
  useConciliarExtrato,
  useDesconciliarExtrato,
  useIgnorarExtrato,
} from "@/lib/repositories/conciliacao-repo";
import { useContasFinanceirasOficiais } from "@/lib/repositories/cadastros-repo";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

export function ConciliacaoTabSupabase() {
  const { data: contas = [] } = useContasFinanceirasOficiais();
  const contasAtivas = contas.filter((c) => c.ativo);
  const [contaSel, setContaSel] = useState<string>(contasAtivas[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("PENDENTE");

  const { data: linhas = [], isLoading } = useExtratoConta(contaSel, { status: statusFilter || undefined });
  const conciliar = useConciliarExtrato();
  const desconciliar = useDesconciliarExtrato();
  const ignorar = useIgnorarExtrato();

  async function handleConciliar(id: string) {
    const titulo = prompt("ID do título financeiro (UUID) para conciliar:");
    if (!titulo) return;
    try {
      await conciliar.mutateAsync({ extrato_id: id, titulo_id: titulo });
      toast.success("Linha conciliada");
    } catch (e) { toast.error("Falha: " + (e as Error).message); }
  }
  async function handleDesconciliar(id: string) {
    const motivo = prompt("Motivo (mín. 5):");
    if (!motivo || motivo.length < 5) return;
    try {
      await desconciliar.mutateAsync({ extrato_id: id, motivo });
      toast.success("Linha desconciliada");
    } catch (e) { toast.error("Falha: " + (e as Error).message); }
  }
  async function handleIgnorar(id: string) {
    const motivo = prompt("Motivo para ignorar:") ?? "";
    try {
      await ignorar.mutateAsync({ extrato_id: id, motivo });
      toast.success("Linha ignorada");
    } catch (e) { toast.error("Falha: " + (e as Error).message); }
  }

  const qc = useQueryClient();
  return (
    <div className="space-y-3">
      <RmTabHeader
        onAtualizar={() => qc.invalidateQueries({ queryKey: ["extrato-conta"] })}
        searchPlaceholder="Buscar extrato…"
      />
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <Label>Conta</Label>
          <Select value={contaSel} onValueChange={setContaSel}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {contasAtivas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDENTE">Pendentes</SelectItem>
              <SelectItem value="CONCILIADO">Conciliados</SelectItem>
              <SelectItem value="IGNORADO">Ignorados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground self-center">
          {isLoading ? "Carregando…" : `${linhas.length} linhas — fonte oficial: Supabase`}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vínculo</TableHead>
            <TableHead className="w-56">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{new Date(l.data).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell className="max-w-xs truncate" title={l.descricao}>{l.descricao}</TableCell>
              <TableCell className={`text-right font-mono ${l.valor < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {l.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </TableCell>
              <TableCell><Badge variant={l.status === "CONCILIADO" ? "default" : l.status === "IGNORADO" ? "outline" : "secondary"}>{l.status}</Badge></TableCell>
              <TableCell className="text-xs font-mono">
                {l.titulo_id ? `T:${l.titulo_id.slice(0, 8)}` : l.movimento_id ? `M:${l.movimento_id.slice(0, 8)}` : "—"}
              </TableCell>
              <TableCell className="flex gap-1">
                {l.status === "PENDENTE" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleConciliar(l.id)} className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Conciliar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleIgnorar(l.id)} className="gap-1">
                      <X className="h-3 w-3" /> Ignorar
                    </Button>
                  </>
                )}
                {l.status === "CONCILIADO" && (
                  <Button size="sm" variant="ghost" onClick={() => handleDesconciliar(l.id)} className="gap-1">
                    <Undo2 className="h-3 w-3" /> Desconciliar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {linhas.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma linha de extrato.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
