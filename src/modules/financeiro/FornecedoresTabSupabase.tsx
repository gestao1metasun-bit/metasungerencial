/**
 * D15.3.d — FornecedoresTab Supabase
 * Lista, cria, edita e remove fornecedores via Supabase oficial.
 */
import { useMemo, useState } from "react";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  useFornecedoresSupabase,
  useUpsertFornecedor,
  useSoftDeleteFornecedor,
  type Fornecedor,
} from "@/lib/repositories/fornecedores-repo";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

type Draft = Partial<Fornecedor> & { nome: string };
const EMPTY: Draft = { nome: "", tipo_pessoa: "PJ", ativo: true };

const PREF_KEY = "ui.fin.fornecedores.v1";
function loadPref() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch { return {}; }
}
function savePref(p: Record<string, unknown>) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function FornecedoresTabSupabase() {
  const pref = loadPref();
  const [busca, setBusca] = useState<string>(pref.busca ?? "");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data: fornecedores = [], isLoading } = useFornecedoresSupabase();
  const upsert = useUpsertFornecedor();
  const remove = useSoftDeleteFornecedor();

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return fornecedores;
    return fornecedores.filter(
      (f) =>
        f.nome.toLowerCase().includes(q) ||
        (f.documento ?? "").toLowerCase().includes(q) ||
        (f.codigo ?? "").toLowerCase().includes(q),
    );
  }, [fornecedores, busca]);

  function novo() {
    setDraft(EMPTY);
    setOpen(true);
  }
  function editar(f: Fornecedor) {
    setDraft(f);
    setOpen(true);
  }

  async function salvar() {
    if (!draft.nome.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    try {
      await upsert.mutateAsync(draft);
      toast.success("Fornecedor salvo");
      setOpen(false);
      setDraft(EMPTY);
    } catch (e) {
      toast.error("Falha ao salvar: " + (e as Error).message);
    }
  }

  async function excluir(f: Fornecedor) {
    const motivo = prompt("Motivo da exclusão (mín. 5 caracteres):");
    if (!motivo || motivo.trim().length < 5) return;
    try {
      await remove.mutateAsync({ id: f.id, motivo });
      toast.success("Fornecedor removido");
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    }
  }

  const qc = useQueryClient();
  return (
    <div className="space-y-3">
      <RmTabHeader
        entityType="fornecedores"
        search={busca}
        onSearchChange={(v) => { setBusca(v); savePref({ ...pref, busca: v }); }}
        searchPlaceholder="Buscar por nome, CPF/CNPJ ou código…"
        onNovo={novo}
        onAtualizar={() => qc.invalidateQueries({ queryKey: ["fornecedores-supabase"] })}
      />
      <Card className="p-4 space-y-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <span className="hidden" />
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Editar" : "Novo"} fornecedor</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome*</Label>
                <Input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={draft.tipo_pessoa ?? "PJ"}
                  onValueChange={(v) => setDraft({ ...draft, tipo_pessoa: v as "PJ" | "PF" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="PF">PF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CPF / CNPJ</Label>
                <Input value={draft.documento ?? ""} onChange={(e) => setDraft({ ...draft, documento: e.target.value })} />
              </div>
              <div>
                <Label>Código</Label>
                <Input value={draft.codigo ?? ""} onChange={(e) => setDraft({ ...draft, codigo: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={draft.telefone ?? ""} onChange={(e) => setDraft({ ...draft, telefone: e.target.value })} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={draft.cidade ?? ""} onChange={(e) => setDraft({ ...draft, cidade: e.target.value })} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={draft.uf ?? ""} maxLength={2} onChange={(e) => setDraft({ ...draft, uf: e.target.value.toUpperCase() })} />
              </div>
              <div className="col-span-2">
                <Label>PIX</Label>
                <Input value={draft.pix_chave ?? ""} onChange={(e) => setDraft({ ...draft, pix_chave: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={draft.ativo ?? true} onCheckedChange={(v) => setDraft({ ...draft, ativo: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={upsert.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <div className="text-xs text-muted-foreground">
        {isLoading ? "Carregando…" : `${filtrados.length} fornecedor(es) — fonte oficial: Supabase`}
      </div>


      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtrados.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.nome}</TableCell>
              <TableCell>{f.tipo_pessoa}</TableCell>
              <TableCell className="font-mono text-xs">{f.documento ?? "—"}</TableCell>
              <TableCell>{[f.cidade, f.uf].filter(Boolean).join("/") || "—"}</TableCell>
              <TableCell>
                <span className={f.ativo ? "text-emerald-600" : "text-muted-foreground"}>
                  {f.ativo ? "Ativo" : "Inativo"}
                </span>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => editar(f)}><SquarePen className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => excluir(f)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {filtrados.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum fornecedor.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      </Card>
    </div>
  );
}
