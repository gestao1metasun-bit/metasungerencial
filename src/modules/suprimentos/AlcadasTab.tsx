/**
 * D20.SUP.7 — Cadastro de Alçadas de Suprimentos.
 *
 * Grid enterprise + dialog de criação/edição. Requer permissão
 * `suprimentos.alcada.gerir` (RLS bloqueia tudo o resto).
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, RefreshCw } from "lucide-react";
import {
  useAlcadas, useUpsertAlcada, useToggleAlcada,
  type Alcada, type AlcadaEtapa, ETAPA_LABEL,
} from "@/lib/repositories/suprimentos-alcadas-repo";
import {
  useNaturezasFinanceiras, useCentrosCusto, useCentrosResultado, SETORES_OPTIONS,
} from "@/lib/repositories/suprimentos-requisicoes-repo";

const fmtBRL = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERMISSOES_SUGERIDAS = [
  "suprimentos.requisicao.aprovar",
  "suprimentos.cotacao.aprovar",
  "suprimentos.pedido.aprovar",
  "suprimentos.alcada.aplicar",
  "financeiro.aprovar",
] as const;

const ROLES_SUGERIDAS = ["admin_master", "admin_geral", "gerente", "coordenador", "diretor"] as const;

export function AlcadasTab() {
  const { data: lista = [], isLoading, refetch } = useAlcadas();
  const [editing, setEditing] = useState<Alcada | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const toggle = useToggleAlcada();

  return (
    <Card className="p-2">
      <EnterpriseRecordToolbar
        title="Alçadas de Suprimentos"
        subtitle="Regras corporativas por etapa, valor, natureza, CC, fornecedor e destino."
        onNew={() => setOpenNew(true)}
        onRefresh={() => refetch()}
      />

      {isLoading ? (
        <p className="text-[12px] text-muted-foreground p-3">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="p-6 text-center">
          <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-[12.5px]">Nenhuma alçada cadastrada.</p>
          <p className="text-[11px] text-muted-foreground">Cadastre uma regra para reger aprovações de Requisição, Cotação e Pedido.</p>
          <Button size="sm" className="mt-3" onClick={() => setOpenNew(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova alçada
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border mt-2">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-[10.5px] uppercase">
              <tr>
                <th className="px-2 py-1 text-left">Nome</th>
                <th className="px-2 py-1 text-left">Etapa</th>
                <th className="px-2 py-1 text-left">Tipo</th>
                <th className="px-2 py-1 text-right">Valor min</th>
                <th className="px-2 py-1 text-right">Valor max</th>
                <th className="px-2 py-1 text-left">Setor</th>
                <th className="px-2 py-1 text-left">Destino</th>
                <th className="px-2 py-1 text-left">Aprovador</th>
                <th className="px-2 py-1 text-center">Ativa</th>
                <th className="px-2 py-1 text-right">Pri.</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-2 py-1 font-medium">{a.nome}</td>
                  <td className="px-2 py-1">{ETAPA_LABEL[a.etapa]}</td>
                  <td className="px-2 py-1">{a.tipo ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(a.valor_min)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(a.valor_max)}</td>
                  <td className="px-2 py-1">{a.setor ?? "—"}</td>
                  <td className="px-2 py-1">{a.destino ?? "—"}</td>
                  <td className="px-2 py-1">
                    <Badge variant="outline" className="text-[10.5px]">
                      {a.aprovador_tipo}: {a.aprovador_valor}
                    </Badge>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <Switch
                      checked={a.ativo}
                      onCheckedChange={async (v) => {
                        try {
                          await toggle.mutateAsync({ id: a.id, ativo: v });
                          toast.success(v ? "Alçada ativada" : "Alçada desativada");
                        } catch (e) { toast.error((e as Error).message); }
                      }}
                    />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{a.prioridade}</td>
                  <td className="px-2 py-1">
                    <RowActions onEdit={() => setEditing(a)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlcadaDialog
        open={openNew || !!editing}
        initial={editing}
        onClose={() => { setEditing(null); setOpenNew(false); }}
      />
    </Card>
  );
}

function AlcadaDialog({ open, initial, onClose }: { open: boolean; initial: Alcada | null; onClose: () => void }) {
  const upsert = useUpsertAlcada();
  const { data: naturezas = [] } = useNaturezasFinanceiras();
  const { data: ccs = [] } = useCentrosCusto();
  const { data: crs = [] } = useCentrosResultado();

  const isEdit = !!initial;
  const [form, setForm] = useState<Partial<Alcada>>(() => initial ?? {
    nome: "", descricao: "", ativo: true, prioridade: 100,
    etapa: "REQUISICAO" as AlcadaEtapa,
    aprovador_tipo: "PERMISSAO", aprovador_valor: "suprimentos.requisicao.aprovar",
    exige_workflow: false, observacao_obrigatoria: false,
  });

  // Reset form when initial changes
  useMemo(() => { setForm(initial ?? form); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [initial?.id]);

  function up<K extends keyof Alcada>(k: K, v: Alcada[K] | null) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.nome || form.nome.trim().length < 3) {
      toast.error("Nome é obrigatório (≥3 caracteres)"); return;
    }
    if (!form.aprovador_valor || form.aprovador_valor.trim().length < 3) {
      toast.error("Informe a permissão ou role do aprovador"); return;
    }
    try {
      await upsert.mutateAsync(form as Alcada);
      toast.success(isEdit ? "Alçada atualizada" : "Alçada criada");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {isEdit ? `Editar alçada — ${initial?.nome}` : "Nova alçada de Suprimentos"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
          <div className="col-span-2"><Label className="text-[11px]">Nome *</Label>
            <Input className="h-8 text-[12px]" value={form.nome ?? ""} onChange={(e) => up("nome", e.target.value)} />
          </div>
          <div><Label className="text-[11px]">Etapa *</Label>
            <Select value={form.etapa ?? "REQUISICAO"} onValueChange={(v) => up("etapa", v as AlcadaEtapa)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="REQUISICAO">Requisição</SelectItem>
                <SelectItem value="COTACAO">Cotação</SelectItem>
                <SelectItem value="PEDIDO">Pedido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-[11px]">Prioridade</Label>
            <Input type="number" className="h-8 text-[12px]" value={form.prioridade ?? 100}
              onChange={(e) => up("prioridade", Number(e.target.value) as Alcada["prioridade"])} />
          </div>

          <div><Label className="text-[11px]">Tipo</Label>
            <Select value={form.tipo ?? "ALL"} onValueChange={(v) => up("tipo", v === "ALL" ? null : (v as "MATERIAL" | "SERVICO"))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="MATERIAL">Material</SelectItem>
                <SelectItem value="SERVICO">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-[11px]">Valor mínimo</Label>
            <Input type="number" step="0.01" className="h-8 text-[12px]" value={form.valor_min ?? ""}
              onChange={(e) => up("valor_min", e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div><Label className="text-[11px]">Valor máximo</Label>
            <Input type="number" step="0.01" className="h-8 text-[12px]" value={form.valor_max ?? ""}
              onChange={(e) => up("valor_max", e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div><Label className="text-[11px]">Prioridade da req</Label>
            <Select value={form.prioridade_req ?? "ALL"} onValueChange={(v) => up("prioridade_req", v === "ALL" ? null : (v as Alcada["prioridade_req"]))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="BAIXA">Baixa</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div><Label className="text-[11px]">Setor</Label>
            <Select value={form.setor ?? "ALL"} onValueChange={(v) => up("setor", v === "ALL" ? null : v)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {SETORES_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-[11px]">Destino</Label>
            <Select value={form.destino ?? "ALL"} onValueChange={(v) => up("destino", v === "ALL" ? null : (v as Alcada["destino"]))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ALMOXARIFADO">Almoxarifado</SelectItem>
                <SelectItem value="OS">O.S.</SelectItem>
                <SelectItem value="OBRA">Obra</SelectItem>
                <SelectItem value="PROJETO">Projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-[11px]">Natureza</Label>
            <Select value={form.natureza_id ?? "ALL"} onValueChange={(v) => up("natureza_id", v === "ALL" ? null : v)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {naturezas.map((n) => <SelectItem key={n.id} value={n.id}>{n.codigo} — {n.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-[11px]">Centro de Custo</Label>
            <Select value={form.centro_custo_id ?? "ALL"} onValueChange={(v) => up("centro_custo_id", v === "ALL" ? null : v)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {ccs.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-[11px]">Centro de Resultado</Label>
            <Select value={form.centro_resultado_id ?? "ALL"} onValueChange={(v) => up("centro_resultado_id", v === "ALL" ? null : v)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {crs.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div><Label className="text-[11px]">Aprovador (tipo) *</Label>
            <Select value={form.aprovador_tipo ?? "PERMISSAO"} onValueChange={(v) => up("aprovador_tipo", v as "PERMISSAO" | "ROLE")}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PERMISSAO">Permissão</SelectItem>
                <SelectItem value="ROLE">Papel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3"><Label className="text-[11px]">Aprovador (chave) *</Label>
            <Input className="h-8 text-[12px]" value={form.aprovador_valor ?? ""} list="alcada-sugest"
              onChange={(e) => up("aprovador_valor", e.target.value)} />
            <datalist id="alcada-sugest">
              {(form.aprovador_tipo === "ROLE" ? ROLES_SUGERIDAS : PERMISSOES_SUGERIDAS).map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={form.exige_workflow ?? false} onCheckedChange={(v) => up("exige_workflow", v)} />
            <Label className="text-[11px]">Exige workflow formal (D5.1)</Label>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={form.observacao_obrigatoria ?? false} onCheckedChange={(v) => up("observacao_obrigatoria", v)} />
            <Label className="text-[11px]">Observação obrigatória na decisão</Label>
          </div>
          <div className="col-span-4"><Label className="text-[11px]">Descrição</Label>
            <Textarea rows={2} className="text-[12px]" value={form.descricao ?? ""} onChange={(e) => up("descricao", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            {isEdit ? "Salvar" : "Criar alçada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
