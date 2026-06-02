/**
 * D20.SUP.2.UI — Diálogo Nova Requisição
 *
 * Cabeçalho mínimo + múltiplos itens. Submete via rpc_sup_requisicao_criar.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCriarRequisicao, PRIORIDADE_OPTIONS,
  type SupReqTipo, type SupReqPrioridade,
} from "@/lib/repositories/suprimentos-requisicoes-repo";

type ItemDraft = {
  descricao: string;
  unidade: string;
  quantidade_solicitada: number;
  valor_estimado_unitario: number;
  observacao: string;
};

const ITEM_VAZIO: ItemDraft = {
  descricao: "", unidade: "UN", quantidade_solicitada: 1,
  valor_estimado_unitario: 0, observacao: "",
};

export function NovaRequisicaoDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const [tipo, setTipo] = useState<SupReqTipo>("MATERIAL");
  const [prioridade, setPrioridade] = useState<SupReqPrioridade>("NORMAL");
  const [setor, setSetor] = useState("");
  const [dataNecessidade, setDataNecessidade] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [itens, setItens] = useState<ItemDraft[]>([{ ...ITEM_VAZIO }]);

  const criar = useCriarRequisicao();

  function reset() {
    setTipo("MATERIAL"); setPrioridade("NORMAL"); setSetor("");
    setDataNecessidade(""); setJustificativa(""); setItens([{ ...ITEM_VAZIO }]);
  }

  function patchItem(idx: number, patch: Partial<ItemDraft>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function submeter() {
    const itensValidos = itens.filter((i) => i.descricao.trim() && i.quantidade_solicitada > 0);
    if (itensValidos.length === 0) {
      toast.error("Inclua ao menos um item com descrição e quantidade > 0.");
      return;
    }
    try {
      const res = await criar.mutateAsync({
        tipo,
        prioridade,
        setor: setor.trim() || undefined,
        data_necessidade: dataNecessidade || undefined,
        justificativa: justificativa.trim() || undefined,
        itens: itensValidos.map((it) => ({
          descricao: it.descricao.trim(),
          unidade: it.unidade.trim() || "UN",
          quantidade_solicitada: Number(it.quantidade_solicitada),
          valor_estimado_unitario: Number(it.valor_estimado_unitario) || 0,
          observacao: it.observacao.trim() || undefined,
        })),
      });
      toast.success(`Requisição #${res?.numero ?? ""} criada.`);
      reset();
      onOpenChange(false);
      if (res?.id) onCreated?.(res.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar requisição.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Nova requisição</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-[11px]">Tipo *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as SupReqTipo)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MATERIAL">Material</SelectItem>
                <SelectItem value="SERVICO">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as SupReqPrioridade)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORIDADE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Setor</Label>
            <Input className="h-8 text-[12px]" value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex.: Engenharia" />
          </div>
          <div>
            <Label className="text-[11px]">Data necessária</Label>
            <Input type="date" className="h-8 text-[12px]" value={dataNecessidade} onChange={(e) => setDataNecessidade(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-[11px]">Justificativa</Label>
          <Textarea rows={2} className="text-[12px]" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Motivo da requisição…" />
        </div>

        <div className="border-t pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[12px] font-semibold">Itens *</h3>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]"
              onClick={() => setItens((p) => [...p, { ...ITEM_VAZIO }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
            </Button>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {itens.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1.5 items-end border rounded p-1.5">
                <div className="col-span-5">
                  <Label className="text-[10.5px]">Descrição</Label>
                  <Input className="h-7 text-[12px]" value={it.descricao}
                    onChange={(e) => patchItem(idx, { descricao: e.target.value })}
                    placeholder={tipo === "MATERIAL" ? "Material" : "Serviço"} />
                </div>
                <div className="col-span-1">
                  <Label className="text-[10.5px]">Un.</Label>
                  <Input className="h-7 text-[12px]" value={it.unidade}
                    onChange={(e) => patchItem(idx, { unidade: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10.5px]">Qtd</Label>
                  <Input type="number" min={0} step="0.001" className="h-7 text-[12px] tabular-nums"
                    value={it.quantidade_solicitada}
                    onChange={(e) => patchItem(idx, { quantidade_solicitada: Number(e.target.value) })} />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10.5px]">Valor unit. estimado</Label>
                  <Input type="number" min={0} step="0.01" className="h-7 text-[12px] tabular-nums"
                    value={it.valor_estimado_unitario}
                    onChange={(e) => patchItem(idx, { valor_estimado_unitario: Number(e.target.value) })} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                    disabled={itens.length === 1}
                    onClick={() => setItens((p) => p.filter((_, i) => i !== idx))}
                    title="Excluir item">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
          <Button type="button" size="sm" className="h-8 text-[12px]" disabled={criar.isPending} onClick={submeter}>
            <Save className="h-3.5 w-3.5 mr-1" /> {criar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
