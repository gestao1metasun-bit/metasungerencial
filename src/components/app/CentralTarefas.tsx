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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { listarTarefas, criarTarefa, concluirTarefa, gerarTarefasAutomaticas } from "@/lib/tarefas.functions";

const MODULOS = ["comercial","financeiro","financiamentos","engenharia","posvenda","estoque","admin"];
const PRIORIDADES = ["baixa","media","alta","urgente"] as const;

export function CentralTarefas() {
  const fnListar = useServerFn(listarTarefas);
  const fnConcluir = useServerFn(concluirTarefa);
  const fnGerar = useServerFn(gerarTarefasAutomaticas);
  const qc = useQueryClient();

  const [status, setStatus] = useState<"pendente"|"em_andamento"|"concluida"|"todas">("pendente");
  const [modulo, setModulo] = useState<string>("__all");
  const [apenasMinhas, setApenasMinhas] = useState(true);

  const { data = [], isLoading } = useQuery({
    queryKey: ["tarefas", status, modulo, apenasMinhas],
    queryFn: () => fnListar({ data: { status, modulo: modulo === "__all" ? undefined : modulo, apenasMinhas } }),
  });

  const mutConcluir = useMutation({
    mutationFn: (id: string) => fnConcluir({ data: { id } }),
    onSuccess: () => { toast.success("Tarefa concluída"); qc.invalidateQueries({ queryKey: ["tarefas"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const mutGerar = useMutation({
    mutationFn: () => fnGerar({ data: {} }),
    onSuccess: (r: any) => {
      toast.success(`Geradas: ${r?.obras_atrasadas ?? 0} obras atrasadas, ${r?.contratos_sem_obra ?? 0} contratos sem obra`);
      qc.invalidateQueries({ queryKey: ["tarefas"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Central de tarefas</h2>
          <p className="text-xs text-muted-foreground">Pendências atribuídas a você ou geradas automaticamente.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-40">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Label className="text-xs">Módulo</Label>
            <Select value={modulo} onValueChange={setModulo}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {MODULOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setApenasMinhas((v) => !v)}>
            {apenasMinhas ? "Minhas" : "Todas que vejo"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => mutGerar.mutate()} disabled={mutGerar.isPending}>
            <Zap className="h-3.5 w-3.5" /> Gerar automáticas
          </Button>
          <NovaTarefaDialog onCreated={() => qc.invalidateQueries({ queryKey: ["tarefas"] })} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">Nenhuma tarefa</TableCell></TableRow>
            ) : data.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium text-sm">{t.titulo}</div>
                  {t.descricao && <div className="text-[11px] text-muted-foreground">{t.descricao}</div>}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{t.modulo}</Badge></TableCell>
                <TableCell><PrioBadge p={t.prioridade} /></TableCell>
                <TableCell className="text-xs">{t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{t.origem}</Badge></TableCell>
                <TableCell className="text-right">
                  {t.status !== "concluida" && (
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => mutConcluir.mutate(t.id)}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Concluir
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function PrioBadge({ p }: { p: string }) {
  const map: Record<string,string> = {
    baixa: "bg-muted text-muted-foreground",
    media: "bg-primary/15 text-primary",
    alta: "bg-amber-500/20 text-amber-600",
    urgente: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${map[p] ?? ""}`}>{p}</span>;
}

function NovaTarefaDialog({ onCreated }: { onCreated: () => void }) {
  const fnCriar = useServerFn(criarTarefa);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modulo, setModulo] = useState("comercial");
  const [prioridade, setPrioridade] = useState<typeof PRIORIDADES[number]>("media");
  const [dueDate, setDueDate] = useState("");

  const salvar = async () => {
    if (titulo.trim().length < 2) { toast.error("Informe um título"); return; }
    try {
      await fnCriar({ data: {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        modulo, prioridade,
        due_date: dueDate || null,
      }});
      toast.success("Tarefa criada");
      setOpen(false); setTitulo(""); setDescricao(""); setDueDate("");
      onCreated();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1"><Plus className="h-3.5 w-3.5" /> Nova</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Módulo</Label>
              <Select value={modulo} onValueChange={setModulo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
