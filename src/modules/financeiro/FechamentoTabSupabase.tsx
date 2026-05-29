/**
 * D15.3.d — FechamentoTab Supabase
 */
import { useMemo, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  useFechamentos,
  useAbrirFechamento,
  useFecharFechamento,
  useReabrirFechamento,
} from "@/lib/repositories/fechamento-repo";
import { useContasFinanceirasOficiais } from "@/lib/repositories/cadastros-repo";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

function fmtMonth(d: string) {
  const [y, m] = d.split("-");
  return `${m}/${y}`;
}

export function FechamentoTabSupabase() {
  const { data: contas = [] } = useContasFinanceirasOficiais();
  const contasAtivas = contas.filter((c) => c.ativo);
  const [contaSel, setContaSel] = useState<string>(contasAtivas[0]?.id ?? "");
  const [comp, setComp] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [saldo, setSaldo] = useState<string>("");

  const { data: fechamentos = [], isLoading } = useFechamentos({ conta_id: contaSel || undefined });
  const abrir = useAbrirFechamento();
  const fechar = useFecharFechamento();
  const reabrir = useReabrirFechamento();

  const lista = useMemo(() => fechamentos, [fechamentos]);

  async function handleAbrir() {
    if (!contaSel) return toast.error("Selecione a conta");
    try {
      await abrir.mutateAsync({ conta_id: contaSel, competencia: comp });
      toast.success("Período aberto/atualizado");
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    }
  }

  async function handleFechar(id: string) {
    const v = parseFloat((saldo || "0").replace(",", "."));
    try {
      await fechar.mutateAsync({ id, saldo_apurado: v });
      toast.success("Período fechado");
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    }
  }

  async function handleReabrir(id: string) {
    const motivo = prompt("Motivo da reabertura (mín. 5):");
    if (!motivo || motivo.trim().length < 5) return;
    try {
      await reabrir.mutateAsync({ id, motivo });
      toast.success("Período reaberto");
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    }
  }

  const qc = useQueryClient();
  return (
    <div className="space-y-3">
      <RmTabHeader
        onAtualizar={() => qc.invalidateQueries({ queryKey: ["fechamentos"] })}
        searchPlaceholder="Buscar fechamento…"
      />
      <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
          <Label>Competência</Label>
          <Input type="month" value={comp.slice(0, 7)} onChange={(e) => setComp(`${e.target.value}-01`)} />
        </div>
        <div>
          <Label>Saldo apurado (R$)</Label>
          <Input value={saldo} onChange={(e) => setSaldo(e.target.value)} placeholder="0,00" />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAbrir} disabled={abrir.isPending} className="gap-2">
            <Unlock className="h-4 w-4" /> Abrir período
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {isLoading ? "Carregando…" : `${lista.length} período(s) — fonte oficial: Supabase`}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competência</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Saldo apurado</TableHead>
            <TableHead>Fechado em</TableHead>
            <TableHead>Reaberto em</TableHead>
            <TableHead className="w-44">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{fmtMonth(f.competencia)}</TableCell>
              <TableCell>
                <Badge variant={f.status === "FECHADO" ? "default" : f.status === "REABERTO" ? "outline" : "secondary"}>
                  {f.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {f.saldo_apurado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </TableCell>
              <TableCell className="text-xs">{f.fechado_em ? new Date(f.fechado_em).toLocaleString("pt-BR") : "—"}</TableCell>
              <TableCell className="text-xs">
                {f.reaberto_em ? `${new Date(f.reaberto_em).toLocaleDateString("pt-BR")} — ${f.motivo_reabertura ?? ""}` : "—"}
              </TableCell>
              <TableCell className="flex gap-1">
                {f.status !== "FECHADO" ? (
                  <Button size="sm" variant="outline" onClick={() => handleFechar(f.id)} className="gap-1">
                    <Lock className="h-3 w-3" /> Fechar
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => handleReabrir(f.id)} className="gap-1">
                    <Unlock className="h-3 w-3" /> Reabrir
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {lista.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum fechamento ainda.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
