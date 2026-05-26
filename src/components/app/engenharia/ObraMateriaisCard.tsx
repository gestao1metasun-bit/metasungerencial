import { useState } from "react";
import { Package, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useObraMaterialStatus, useObraMateriais,
  statusMaterialLabel, statusMaterialTone,
} from "@/lib/repositories/use-obra-materiais";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ObraMateriaisCard({ obraId }: { obraId: string }) {
  const { data: status, loading } = useObraMaterialStatus(obraId);
  const [open, setOpen] = useState(false);

  const tone = status ? statusMaterialTone(status.status_material) : "bg-muted text-muted-foreground";
  const label = status ? statusMaterialLabel(status.status_material) : "—";

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Materiais</span>
          <Badge className={tone} variant="secondary">{loading ? "…" : label}</Badge>
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpen(true)}>
          <Eye className="h-3.5 w-3.5" /> Ver materiais
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="rounded border bg-muted/30 p-1.5">
          <div className="text-muted-foreground">Reservado</div>
          <div className="font-semibold tabular-nums">{fmt(status?.total_reservado ?? 0)}</div>
        </div>
        <div className="rounded border bg-muted/30 p-1.5">
          <div className="text-muted-foreground">Entregue</div>
          <div className="font-semibold tabular-nums">{fmt(status?.total_entregue ?? 0)}</div>
        </div>
        <div className="rounded border bg-muted/30 p-1.5">
          <div className="text-muted-foreground">Pendente</div>
          <div className="font-semibold tabular-nums">{fmt(status?.total_pendente ?? 0)}</div>
        </div>
        <div className="rounded border bg-muted/30 p-1.5">
          <div className="text-muted-foreground">Reservas</div>
          <div className="font-semibold tabular-nums">{status?.qtd_reservas ?? 0}</div>
        </div>
      </div>

      <MateriaisDialog obraId={obraId} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function MateriaisDialog({ obraId, open, onOpenChange }: { obraId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, loading } = useObraMateriais(obraId);
  const total = items.reduce((s, i) => s + i.custo_estimado, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Materiais da obra</DialogTitle></DialogHeader>
        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Entregue</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
                <TableHead className="text-right">Custo est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Sem reserva para esta obra.</TableCell></TableRow>
              )}
              {items.map((i) => (
                <TableRow key={i.produto_id}>
                  <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
                  <TableCell>{i.nome} <span className="text-muted-foreground">({i.unidade})</span></TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(i.qtd_reservada)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(i.qtd_entregue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(i.qtd_pendente)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(i.custo_estimado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {items.length > 0 && (
          <div className="mt-2 flex justify-end text-sm">
            <span className="text-muted-foreground mr-2">Custo estimado total:</span>
            <span className="font-semibold tabular-nums">{brl(total)}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
