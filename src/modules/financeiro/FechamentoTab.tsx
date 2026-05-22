// Fechamento mensal — fecha/reabre mês contábil, bloqueia edição/baixa.
import { useState, useMemo } from "react";
import { Lock, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFechamentos, fecharMes, reabrirMes, isMesFechado } from "@/lib/fin-fechamento-store";
import { toast } from "sonner";

export function FechamentoTab() {
  const fechs = useFechamentos();
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [obs, setObs] = useState("");
  const [motivoReabertura, setMotivo] = useState("");
  const fechado = useMemo(() => isMesFechado(mes), [mes, fechs]);

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-2 text-sm font-semibold">Fechar mês</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Mês (AAAA-MM)</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
          </div>
          <div className="grow"><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          {!fechado ? (
            <Button
              onClick={() => { fecharMes(mes, "Admin", obs); toast.success(`Mês ${mes} fechado.`); setObs(""); }}
            ><Lock className="mr-1 h-4 w-4" /> Fechar mês</Button>
          ) : (
            <div className="flex items-end gap-2">
              <Input placeholder="Motivo da reabertura" value={motivoReabertura} onChange={(e) => setMotivo(e.target.value)} />
              <Button
                variant="destructive"
                onClick={() => motivoReabertura.trim() ? (reabrirMes(mes, "Admin", motivoReabertura), toast.success("Mês reaberto."), setMotivo("")) : toast.error("Informe o motivo.")}
              ><Unlock className="mr-1 h-4 w-4" /> Reabrir</Button>
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Apenas perfis com permissão de fechamento podem fechar/reabrir. Após fechado, títulos do mês ficam bloqueados para edição e baixa.
        </div>
      </Card>

      <Card className="bg-[image:var(--gradient-card)]">
        <div className="p-4 text-sm font-semibold">Histórico</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Mês</TableHead><TableHead>Fechado em</TableHead><TableHead>Fechado por</TableHead>
            <TableHead>Reabertura</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {fechs.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Nenhum fechamento.</TableCell></TableRow>}
            {fechs.map((f) => (
              <TableRow key={f.mes}>
                <TableCell className="font-mono">{f.mes}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(f.fechadoEm).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{f.fechadoPor}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {f.reabertoEm ? `${new Date(f.reabertoEm).toLocaleString("pt-BR")} por ${f.reabertoPor}` : "—"}
                </TableCell>
                <TableCell className="text-xs font-semibold">{f.reabertoEm ? "Reaberto" : "Fechado"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
