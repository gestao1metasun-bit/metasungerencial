/**
 * D20.SUP.2.CLASS — Diálogo Nova Requisição com classificação obrigatória.
 *
 * Regras (espelham rpc_sup_requisicao_criar):
 *  - Natureza obrigatória
 *  - Setor obrigatório
 *  - Vínculo obrigatório: Projeto OR Obra OR O.S. — OU destino Almoxarifado
 *  - Se Almoxarifado: CC/CR preenchidos automaticamente com ALMOXARIFADO,
 *    e Projeto/Obra/O.S. ignorados.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, X, Warehouse } from "lucide-react";
import { toast } from "sonner";
import {
  useCriarRequisicao, PRIORIDADE_OPTIONS,
  useNaturezasFinanceiras, useCentrosCusto, useCentrosResultado, SETORES_OPTIONS,
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

type VinculoTipo = "PROJETO" | "OBRA" | "OS";

function useObras() {
  return useQuery({
    queryKey: ["obras-ativas-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, codigo, status")
        .is("deleted_at", null)
        .order("codigo", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function useOrdensServico() {
  return useQuery({
    queryKey: ["os-ativas-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_ordens")
        .select("id, codigo, status_codigo")
        .order("numero", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function useProjetos() {
  return useQuery({
    queryKey: ["projetos-ativos-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, codigo, status")
        .order("codigo", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function NovaRequisicaoDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const [tipo, setTipo] = useState<SupReqTipo>("MATERIAL");
  const [prioridade, setPrioridade] = useState<SupReqPrioridade>("NORMAL");
  const [setor, setSetor] = useState<string>("");
  const [naturezaId, setNaturezaId] = useState<string>("");
  const [centroCustoId, setCentroCustoId] = useState<string>("");
  const [centroResultadoId, setCentroResultadoId] = useState<string>("");
  const [destinoAlmox, setDestinoAlmox] = useState(false);
  const [vinculoTipo, setVinculoTipo] = useState<VinculoTipo>("OBRA");
  const [vinculoId, setVinculoId] = useState<string>("");
  const [dataNecessidade, setDataNecessidade] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [itens, setItens] = useState<ItemDraft[]>([{ ...ITEM_VAZIO }]);

  const naturezas = useNaturezasFinanceiras();
  const ccs = useCentrosCusto();
  const crs = useCentrosResultado();
  const obras = useObras();
  const oss = useOrdensServico();
  const projs = useProjetos();
  const criar = useCriarRequisicao();

  const naturezasFiltradas = useMemo(() => {
    const all = naturezas.data ?? [];
    // Heurística: requisições são saídas → exibir naturezas de DESPESA primeiro.
    // Mantemos todas, mas ordenamos DESPESA antes.
    return [...all].sort((a, b) => {
      if (a.tipo === b.tipo) return (a.codigo ?? "").localeCompare(b.codigo ?? "");
      return a.tipo === "DESPESA" ? -1 : 1;
    });
  }, [naturezas.data]);

  // Regra: Almoxarifado só faz sentido para MATERIAL → ao mudar tipo p/ SERVIÇO desliga o toggle.
  useEffect(() => {
    if (tipo === "SERVICO" && destinoAlmox) setDestinoAlmox(false);
  }, [tipo, destinoAlmox]);

  // Quando ativa Almoxarifado, força CC/CR ALMOXARIFADO e limpa vínculo
  useEffect(() => {
    if (!destinoAlmox) return;
    const ccAlmox = (ccs.data ?? []).find((c) => c.codigo === "ALMOXARIFADO");
    const crAlmox = (crs.data ?? []).find((c) => c.codigo === "ALMOXARIFADO");
    if (ccAlmox) setCentroCustoId(ccAlmox.id);
    if (crAlmox) setCentroResultadoId(crAlmox.id);
    setVinculoId("");
  }, [destinoAlmox, ccs.data, crs.data]);

  function reset() {
    setTipo("MATERIAL"); setPrioridade("NORMAL"); setSetor("");
    setNaturezaId(""); setCentroCustoId(""); setCentroResultadoId("");
    setDestinoAlmox(false); setVinculoTipo("OBRA"); setVinculoId("");
    setDataNecessidade(""); setJustificativa(""); setItens([{ ...ITEM_VAZIO }]);
  }

  function patchItem(idx: number, patch: Partial<ItemDraft>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function submeter() {
    if (!naturezaId) { toast.error("Selecione a Natureza."); return; }
    if (!setor.trim()) { toast.error("Selecione o Setor."); return; }
    if (!centroCustoId) { toast.error("Selecione o Centro de Custo."); return; }
    if (!centroResultadoId) { toast.error("Selecione o Centro de Resultado."); return; }
    if (destinoAlmox && tipo === "SERVICO") {
      toast.error("Almoxarifado é destino apenas para MATERIAL.");
      return;
    }
    if (!destinoAlmox && !vinculoId) {
      toast.error("Vincule a uma Obra/Projeto/O.S. — ou marque destino Almoxarifado.");
      return;
    }
    const itensValidos = itens.filter((i) => i.descricao.trim() && i.quantidade_solicitada > 0);
    if (itensValidos.length === 0) {
      toast.error("Inclua ao menos um item com descrição e quantidade > 0.");
      return;
    }

    const payload = {
      tipo,
      prioridade,
      setor: setor.trim(),
      natureza_id: naturezaId,
      destino_almoxarifado: destinoAlmox,
      centro_custo_id: centroCustoId || undefined,
      centro_resultado_id: centroResultadoId || undefined,
      projeto_id: !destinoAlmox && vinculoTipo === "PROJETO" ? vinculoId : undefined,
      obra_id:    !destinoAlmox && vinculoTipo === "OBRA"    ? vinculoId : undefined,
      os_id:      !destinoAlmox && vinculoTipo === "OS"      ? vinculoId : undefined,
      data_necessidade: dataNecessidade || undefined,
      justificativa: justificativa.trim() || undefined,
      itens: itensValidos.map((it) => ({
        descricao: it.descricao.trim(),
        unidade: it.unidade.trim() || "UN",
        quantidade_solicitada: Number(it.quantidade_solicitada),
        valor_estimado_unitario: Number(it.valor_estimado_unitario) || 0,
        observacao: it.observacao.trim() || undefined,
      })),
    };

    try {
      const res = await criar.mutateAsync(payload);
      toast.success(`Requisição #${(res as { numero?: number })?.numero ?? ""} criada.`);
      reset();
      onOpenChange(false);
      const id = (res as { id?: string })?.id ?? (typeof res === "string" ? res : undefined);
      if (id) onCreated?.(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar requisição.");
    }
  }

  const vinculoOptions = vinculoTipo === "OBRA" ? (obras.data ?? [])
    : vinculoTipo === "OS" ? (oss.data ?? []) : (projs.data ?? []);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[14px] flex items-center gap-2">
            Nova requisição
            {destinoAlmox && (
              <Badge variant="outline" className="text-[10.5px] bg-amber-50 text-amber-800 border-amber-300">
                <Warehouse className="h-3 w-3 mr-1" /> Almoxarifado
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Linha 1: tipo, prioridade, setor, data */}
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
            <Label className="text-[11px]">Setor *</Label>
            <Select value={setor} onValueChange={setSetor}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {SETORES_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Data necessária</Label>
            <Input type="date" className="h-8 text-[12px]" value={dataNecessidade} onChange={(e) => setDataNecessidade(e.target.value)} />
          </div>
        </div>

        {/* Linha 2: classificação contábil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <Label className="text-[11px]">Natureza *</Label>
            <Select value={naturezaId} onValueChange={setNaturezaId}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder={naturezas.isLoading ? "Carregando…" : "Selecione…"} /></SelectTrigger>
              <SelectContent>
                {naturezasFiltradas.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.codigo} — {n.nome} {n.tipo === "RECEITA" ? " (Receita)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Centro de Custo *</Label>
            <Select value={centroCustoId} onValueChange={setCentroCustoId} disabled={destinoAlmox}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {(ccs.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Centro de Resultado</Label>
            <Select value={centroResultadoId} onValueChange={setCentroResultadoId} disabled={destinoAlmox}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {(crs.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 3: destino */}
        <div className="border rounded p-2 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={destinoAlmox} onCheckedChange={setDestinoAlmox} id="almox-switch" />
              <Label htmlFor="almox-switch" className="text-[11.5px] cursor-pointer">
                Destino: <b>Almoxarifado</b> (reposição de estoque interno)
              </Label>
            </div>
            {destinoAlmox && (
              <span className="text-[10.5px] text-muted-foreground">
                Vínculo com Projeto/Obra/O.S. dispensado; CC/CR fixados em ALMOXARIFADO.
              </span>
            )}
          </div>

          {!destinoAlmox && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px]">Vincular a *</Label>
                <Select value={vinculoTipo} onValueChange={(v) => { setVinculoTipo(v as VinculoTipo); setVinculoId(""); }}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OBRA">Obra</SelectItem>
                    <SelectItem value="OS">O.S.</SelectItem>
                    <SelectItem value="PROJETO">Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[11px]">
                  {vinculoTipo === "OBRA" ? "Obra *" : vinculoTipo === "OS" ? "Ordem de Serviço *" : "Projeto *"}
                </Label>
                <Select value={vinculoId} onValueChange={setVinculoId}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {vinculoOptions.map((o) => {
                      const item = o as { id: string; codigo: string | null; status?: string | null; status_codigo?: string | null };
                      return (
                        <SelectItem key={item.id} value={item.id}>
                          {item.codigo ?? item.id.slice(0, 8)}{" "}
                          {item.status ? `· ${item.status}` : item.status_codigo ? `· ${item.status_codigo}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label className="text-[11px]">Justificativa</Label>
          <Textarea rows={2} className="text-[12px]" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Motivo da requisição…" />
        </div>

        {/* Itens */}
        <div className="border-t pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[12px] font-semibold">
              Itens * <span className="text-muted-foreground font-normal">({tipo === "MATERIAL" ? "Material" : "Serviço"})</span>
            </h3>
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
                    placeholder={tipo === "MATERIAL" ? "Ex.: Módulo 550W" : "Ex.: Instalação"} />
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
