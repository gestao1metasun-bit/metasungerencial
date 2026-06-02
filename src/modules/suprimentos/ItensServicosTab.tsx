/**
 * D20.SUP.6 — Aba "Itens & Serviços" em Suprimentos → Cadastros.
 *
 * Lista o catálogo unificado de itens MATERIAL/SERVIÇO (tabela `produtos`),
 * com criar / editar / inativar / reativar. Filtros estruturais por tipo,
 * status e busca textual.
 */
import { useMemo, useState } from "react";
import { Plus, Edit, Power, PowerOff, Save, X, Search } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useCatalogoItens, useUpsertItem, useToggleAtivoItem,
  type CatalogoItem, type ItemTipo, type ItemUpsertPayload,
} from "@/lib/repositories/suprimentos-itens-repo";

const TIPO_OPTS: { value: ItemTipo | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "MATERIAL", label: "Material" },
  { value: "SERVICO", label: "Serviço" },
];

const ATIVO_OPTS = [
  { value: "TODOS", label: "Todos" },
  { value: "ATIVO", label: "Ativos" },
  { value: "INATIVO", label: "Inativos" },
] as const;

const fmtMoney = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ItensServicosTab() {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<ItemTipo | "TODOS">("TODOS");
  const [ativoFiltro, setAtivoFiltro] = useState<(typeof ATIVO_OPTS)[number]["value"]>("ATIVO");
  const [editando, setEditando] = useState<CatalogoItem | null>(null);
  const [criarOpen, setCriarOpen] = useState(false);

  const ativoBool = ativoFiltro === "TODOS" ? "TODOS" : ativoFiltro === "ATIVO";
  const q = useCatalogoItens({
    search: busca,
    tipo,
    ativo: ativoBool === "TODOS" ? "TODOS" : (ativoBool as boolean),
  });
  const toggle = useToggleAtivoItem();

  const rows = q.data ?? [];
  const totais = useMemo(() => ({
    total: rows.length,
    material: rows.filter((r) => r.tipo_item === "MATERIAL").length,
    servico: rows.filter((r) => r.tipo_item === "SERVICO").length,
  }), [rows]);

  return (
    <div className="space-y-2">
      <Card className="p-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-[11px]">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="h-8 pl-7 text-[12px]" placeholder="Código, nome, categoria…"
                value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
          <div className="w-36">
            <Label className="text-[11px]">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ItemTipo | "TODOS")}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Label className="text-[11px]">Status</Label>
            <Select value={ativoFiltro} onValueChange={(v) => setAtivoFiltro(v as typeof ativoFiltro)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATIVO_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="h-8 text-[12px] bg-blue-600 hover:bg-blue-700"
            onClick={() => setCriarOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-[10.5px] uppercase">
              <tr>
                <th className="px-2 py-1 text-left">Código</th>
                <th className="px-2 py-1 text-left">Nome</th>
                <th className="px-2 py-1 text-left">Tipo</th>
                <th className="px-2 py-1 text-left">Un.</th>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Valor ref.</th>
                <th className="px-2 py-1 text-center">Estoque</th>
                <th className="px-2 py-1 text-center">Status</th>
                <th className="px-2 py-1 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr><td colSpan={9} className="px-2 py-4 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!q.isLoading && rows.length === 0 && (
                <tr><td colSpan={9} className="px-2 py-4 text-center text-muted-foreground">Nenhum item encontrado.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-2 py-1 tabular-nums font-mono text-[11px]">{r.codigo}</td>
                  <td className="px-2 py-1">{r.nome}</td>
                  <td className="px-2 py-1">
                    <Badge variant="outline" className={`text-[10px] ${r.tipo_item === "MATERIAL" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-indigo-50 text-indigo-800 border-indigo-300"}`}>
                      {r.tipo_item === "MATERIAL" ? "Material" : "Serviço"}
                    </Badge>
                  </td>
                  <td className="px-2 py-1">{r.unidade ?? "—"}</td>
                  <td className="px-2 py-1">{r.categoria ?? "—"}{r.subcategoria ? ` · ${r.subcategoria}` : ""}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtMoney(Number(r.valor_referencia ?? 0))}</td>
                  <td className="px-2 py-1 text-center">{r.controla_estoque ? "Sim" : "—"}</td>
                  <td className="px-2 py-1 text-center">
                    {r.ativo
                      ? <Badge className="bg-emerald-600 text-white text-[10px]">Ativo</Badge>
                      : <Badge variant="outline" className="text-[10px] bg-muted">Inativo</Badge>}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600" title="Editar"
                      onClick={() => setEditando(r)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${r.ativo ? "text-amber-600" : "text-emerald-600"}`}
                      title={r.ativo ? "Inativar" : "Ativar"}
                      onClick={async () => {
                        try {
                          await toggle.mutateAsync({ id: r.id, ativo: !r.ativo });
                          toast.success(r.ativo ? "Item inativado" : "Item ativado");
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}>
                      {r.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-2 py-1 text-[10.5px] text-muted-foreground border-t bg-muted/20">
          {totais.total} itens · {totais.material} material · {totais.servico} serviço
        </div>
      </Card>

      <ItemEditorDialog
        open={criarOpen || !!editando}
        initial={editando}
        onClose={() => { setCriarOpen(false); setEditando(null); }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ItemEditorDialog({
  open, initial, onClose,
}: { open: boolean; initial: CatalogoItem | null; onClose: () => void }) {
  const upsert = useUpsertItem();
  const editing = !!initial;

  const [codigo, setCodigo] = useState(initial?.codigo ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [tipoItem, setTipoItem] = useState<ItemTipo>(initial?.tipo_item ?? "MATERIAL");
  const [unidade, setUnidade] = useState(initial?.unidade ?? "UN");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [subcategoria, setSubcategoria] = useState(initial?.subcategoria ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [controlaEstoque, setControlaEstoque] = useState(initial?.controla_estoque ?? true);
  const [exigeFornecedor, setExigeFornecedor] = useState(initial?.exige_fornecedor ?? false);
  const [valorRef, setValorRef] = useState<number>(Number(initial?.valor_referencia ?? 0));
  const [observacao, setObservacao] = useState(initial?.observacao ?? "");

  // Reset quando abre com novo registro
  useMemo(() => {
    if (!open) return;
    setCodigo(initial?.codigo ?? "");
    setNome(initial?.nome ?? "");
    setDescricao(initial?.descricao ?? "");
    setTipoItem(initial?.tipo_item ?? "MATERIAL");
    setUnidade(initial?.unidade ?? "UN");
    setCategoria(initial?.categoria ?? "");
    setSubcategoria(initial?.subcategoria ?? "");
    setAtivo(initial?.ativo ?? true);
    setControlaEstoque(initial?.controla_estoque ?? true);
    setExigeFornecedor(initial?.exige_fornecedor ?? false);
    setValorRef(Number(initial?.valor_referencia ?? 0));
    setObservacao(initial?.observacao ?? "");
  }, [open, initial]);

  // Regra UI: SERVIÇO não controla estoque físico
  function onTipoChange(v: ItemTipo) {
    setTipoItem(v);
    if (v === "SERVICO") setControlaEstoque(false);
  }

  async function salvar() {
    if (!codigo.trim()) { toast.error("Código é obrigatório."); return; }
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    const payload: ItemUpsertPayload = {
      id: initial?.id,
      codigo: codigo.trim(),
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      tipo_item: tipoItem,
      unidade: unidade.trim() || null,
      categoria: categoria.trim() || null,
      subcategoria: subcategoria.trim() || null,
      ativo,
      controla_estoque: tipoItem === "SERVICO" ? false : controlaEstoque,
      exige_fornecedor: exigeFornecedor,
      valor_referencia: Number.isFinite(valorRef) ? valorRef : 0,
      observacao: observacao.trim() || null,
    };
    try {
      await upsert.mutateAsync(payload);
      toast.success(editing ? "Item atualizado" : "Item cadastrado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {editing ? "Editar item" : "Novo item"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-[11px]">Código *</Label>
            <Input className="h-8 text-[12px]" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Nome *</Label>
            <Input className="h-8 text-[12px]" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Tipo *</Label>
            <Select value={tipoItem} onValueChange={(v) => onTipoChange(v as ItemTipo)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MATERIAL">Material</SelectItem>
                <SelectItem value="SERVICO">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-[11px]">Unidade</Label>
            <Input className="h-8 text-[12px]" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Categoria</Label>
            <Input className="h-8 text-[12px]" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Subcategoria</Label>
            <Input className="h-8 text-[12px]" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Valor referência (R$)</Label>
            <Input type="number" min={0} step="0.01" className="h-8 text-[12px] tabular-nums"
              value={valorRef} onChange={(e) => setValorRef(Number(e.target.value))} />
          </div>
        </div>

        <div className="border rounded p-2 bg-muted/30 grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 text-[12px]">
            <Switch checked={ativo} onCheckedChange={setAtivo} /> Ativo
          </label>
          <label className={`flex items-center gap-2 text-[12px] ${tipoItem === "SERVICO" ? "opacity-60" : ""}`}>
            <Switch checked={controlaEstoque} onCheckedChange={setControlaEstoque}
              disabled={tipoItem === "SERVICO"} />
            Controla estoque
            {tipoItem === "SERVICO" && (
              <span className="text-[10.5px] text-amber-700">(Serviço não entra em estoque)</span>
            )}
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <Switch checked={exigeFornecedor} onCheckedChange={setExigeFornecedor} /> Exige fornecedor
          </label>
        </div>

        <div>
          <Label className="text-[11px]">Descrição</Label>
          <Textarea rows={2} className="text-[12px]" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div>
          <Label className="text-[11px]">Observação</Label>
          <Textarea rows={2} className="text-[12px]" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
          <Button size="sm" className="h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700"
            disabled={upsert.isPending} onClick={salvar}>
            <Save className="h-3.5 w-3.5 mr-1" /> {upsert.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
