// Cadastros financeiros: Fornecedores + Contas financeiras.
import { useState } from "react";
import { Plus, Trash2, SquarePen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFornecedores, upsertFornecedor, removeFornecedor, newFornecedorId, type Fornecedor } from "@/lib/fin-fornecedores-store";
import { useContasFinanceiras, upsertConta, removeConta, newContaId, type ContaFinanceira } from "@/lib/fin-contas-store";
import { toast } from "sonner";

export function FornecedoresTab() {
  const fornecedores = useFornecedores();
  const contas = useContasFinanceiras();
  const [editF, setEditF] = useState<Fornecedor | null>(null);
  const [editC, setEditC] = useState<ContaFinanceira | null>(null);
  const [novoF, setNovoF] = useState(false);
  const [novoC, setNovoC] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Fornecedores</div>
          <Dialog open={novoF} onOpenChange={setNovoF}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo</Button></DialogTrigger>
            <FornecedorDialog
              onSave={(f) => { upsertFornecedor({ ...f, id: newFornecedorId() }); toast.success("Fornecedor criado."); setNovoF(false); }}
              onCancel={() => setNovoF(false)}
            />
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Documento</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]" />
          </TableRow></TableHeader>
          <TableBody>
            {fornecedores.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell className="text-muted-foreground">{f.documento ?? "—"}</TableCell>
                <TableCell className="text-xs">{f.ativo ? "Ativo" : "Inativo"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setEditF(f)}><SquarePen className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => removeFornecedor(f.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={!!editF} onOpenChange={(o) => !o && setEditF(null)}>
          {editF && (
            <FornecedorDialog initial={editF}
              onSave={(f) => { upsertFornecedor({ ...editF, ...f }); toast.success("Atualizado."); setEditF(null); }}
              onCancel={() => setEditF(null)} />
          )}
        </Dialog>
      </Card>

      <Card className="p-5 bg-[image:var(--gradient-card)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Contas financeiras</div>
          <Dialog open={novoC} onOpenChange={setNovoC}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nova</Button></DialogTrigger>
            <ContaDialog
              onSave={(c) => { upsertConta({ ...c, id: newContaId() }); toast.success("Conta criada."); setNovoC(false); }}
              onCancel={() => setNovoC(false)} />
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]" />
          </TableRow></TableHeader>
          <TableBody>
            {contas.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-muted-foreground">{c.tipo}</TableCell>
                <TableCell className="text-xs">{c.ativo ? "Ativa" : "Inativa"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setEditC(c)}><SquarePen className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => removeConta(c.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={!!editC} onOpenChange={(o) => !o && setEditC(null)}>
          {editC && (
            <ContaDialog initial={editC}
              onSave={(c) => { upsertConta({ ...editC, ...c }); toast.success("Atualizada."); setEditC(null); }}
              onCancel={() => setEditC(null)} />
          )}
        </Dialog>
      </Card>
    </div>
  );
}

function FornecedorDialog({ initial, onSave, onCancel }: { initial?: Fornecedor; onSave: (f: Omit<Fornecedor, "id">) => void; onCancel: () => void }) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [documento, setDoc] = useState(initial?.documento ?? "");
  const [contato, setContato] = useState(initial?.contato ?? "");
  const [telefone, setTel] = useState(initial?.telefone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div><Label>Documento</Label><Input value={documento} onChange={(e) => setDoc(e.target.value)} /></div>
        <div><Label>Contato</Label><Input value={contato} onChange={(e) => setContato(e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTel(e.target.value)} /></div>
        <div><Label>E-mail</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="col-span-2 flex items-center gap-2"><Switch checked={ativo} onCheckedChange={setAtivo} /> <Label>Ativo</Label></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button onClick={() => nome.trim() ? onSave({ nome, documento, contato, telefone, email, ativo }) : toast.error("Nome obrigatório.")}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ContaDialog({ initial, onSave, onCancel }: { initial?: ContaFinanceira; onSave: (c: Omit<ContaFinanceira, "id">) => void; onCancel: () => void }) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [tipo, setTipo] = useState<ContaFinanceira["tipo"]>(initial?.tipo ?? "Banco");
  const [banco, setBanco] = useState(initial?.banco ?? "");
  const [agencia, setAg] = useState(initial?.agencia ?? "");
  const [conta, setCC] = useState(initial?.conta ?? "");
  const [saldoInicial, setSI] = useState<number>(initial?.saldoInicial ?? 0);
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar conta" : "Nova conta financeira"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["Banco","Caixa","PIX","Cartão"] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Banco</Label><Input value={banco} onChange={(e) => setBanco(e.target.value)} /></div>
        <div><Label>Agência</Label><Input value={agencia} onChange={(e) => setAg(e.target.value)} /></div>
        <div><Label>Conta</Label><Input value={conta} onChange={(e) => setCC(e.target.value)} /></div>
        <div><Label>Saldo inicial</Label><Input type="number" step="0.01" value={saldoInicial} onChange={(e) => setSI(Number(e.target.value))} /></div>
        <div className="col-span-2 flex items-center gap-2"><Switch checked={ativo} onCheckedChange={setAtivo} /> <Label>Ativa</Label></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button onClick={() => nome.trim() ? onSave({ nome, tipo, banco, agencia, conta, saldoInicial, ativo }) : toast.error("Nome obrigatório.")}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
