import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, History } from "lucide-react";
import { toast } from "sonner";
import { listarLixeira, restaurarRegistro, listarVersoes } from "@/lib/versoes.functions";

const MODULOS = [
  { value: "contratos", label: "Contratos" },
  { value: "aditivos", label: "Aditivos" },
  { value: "obras", label: "Obras" },
  { value: "projetos", label: "Projetos" },
  { value: "clientes", label: "Clientes" },
] as const;

type Modulo = (typeof MODULOS)[number]["value"];

export function LixeiraTab() {
  const [modulo, setModulo] = useState<Modulo>("contratos");
  const fnListar = useServerFn(listarLixeira);
  const fnRestaurar = useServerFn(restaurarRegistro);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["lixeira", modulo],
    queryFn: () => fnListar({ data: { modulo } }),
  });

  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<{ id: string } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [versoesOpen, setVersoesOpen] = useState<{ id: string } | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      if (!sel) return;
      if (motivo.trim().length < 3) throw new Error("Motivo obrigatório (mín 3 caracteres).");
      await fnRestaurar({ data: { modulo, id: sel.id, motivo: motivo.trim() } });
    },
    onSuccess: () => {
      toast.success("Registro restaurado");
      setOpen(false);
      setMotivo("");
      setSel(null);
      qc.invalidateQueries({ queryKey: ["lixeira", modulo] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao restaurar"),
  });

  return (
    <Card className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Lixeira operacional</h2>
          <p className="text-xs text-muted-foreground">
            Registros arquivados via soft-delete. Apenas administradores podem restaurar.
          </p>
        </div>
        <div className="w-56">
          <Label className="text-xs">Módulo</Label>
          <Select value={modulo} onValueChange={(v) => setModulo(v as Modulo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODULOS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Arquivado em</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">Lixeira vazia</TableCell></TableRow>
            ) : data.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}…</TableCell>
                <TableCell className="text-xs">{row.deleted_at ? new Date(row.deleted_at).toLocaleString("pt-BR") : "—"}</TableCell>
                <TableCell className="text-xs">{row.deleted_reason ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setVersoesOpen({ id: row.id })}>
                    <History className="mr-1 h-3.5 w-3.5" /> Versões
                  </Button>
                  <Button size="sm" variant="default" className="h-7"
                    onClick={() => { setSel({ id: row.id }); setOpen(true); }}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restaurar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restaurar registro</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da restauração</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo (mín. 3 caracteres)" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? "Restaurando…" : "Confirmar restauração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VersoesDialog
        open={!!versoesOpen}
        onOpenChange={(o) => !o && setVersoesOpen(null)}
        modulo={modulo}
        entidadeId={versoesOpen?.id ?? null}
      />
    </Card>
  );
}

function VersoesDialog({
  open, onOpenChange, modulo, entidadeId,
}: { open: boolean; onOpenChange: (o: boolean) => void; modulo: Modulo; entidadeId: string | null }) {
  const fnListar = useServerFn(listarVersoes);
  const { data = [], isLoading } = useQuery({
    queryKey: ["versoes", modulo, entidadeId],
    queryFn: () => fnListar({ data: { entidade: modulo, entidade_id: entidadeId! } }),
    enabled: !!entidadeId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de versões</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Carregando…</div>
        ) : data.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhuma versão registrada.</div>
        ) : (
          <div className="space-y-3">
            {data.map((v: any) => (
              <div key={v.id} className="rounded border border-border bg-card/40 p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">v{v.versao}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(v.created_at).toLocaleString("pt-BR")} · {v.user_email ?? "sistema"}
                  </span>
                </div>
                {v.motivo && <div className="mt-2 text-xs"><b>Motivo:</b> {v.motivo}</div>}
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-background/60 p-2 text-[10px] font-mono">
                  {JSON.stringify(v.snapshot, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
