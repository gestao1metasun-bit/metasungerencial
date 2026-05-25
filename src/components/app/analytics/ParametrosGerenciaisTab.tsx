import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, History, Plus, Trash2, Upload } from "lucide-react";
import {
  listarParametrosGerenciais,
  upsertParametroGerencial,
  removerParametroGerencial,
  listarHistoricoParametros,
  importarParametrosGerenciais,
} from "@/lib/parametros-gerenciais.functions";

const SETORES = ["__global__", "comercial", "engenharia", "financeiro", "posvenda", "estoque", "diretoria"];
const SETOR_LABEL: Record<string, string> = {
  __global__: "Global (padrão)",
  comercial: "Comercial",
  engenharia: "Engenharia",
  financeiro: "Financeiro",
  posvenda: "Pós-venda",
  estoque: "Estoque",
  diretoria: "Diretoria",
};

type Param = {
  id: string;
  chave: string;
  categoria: string;
  descricao: string | null;
  setor: string | null;
  valor: Record<string, number | string | boolean>;
  updated_at: string;
};

export function ParametrosGerenciaisTab() {
  const qc = useQueryClient();
  const [setorFiltro, setSetorFiltro] = useState<string>("__all__");
  const [busca, setBusca] = useState("");

  const { data: params = [], isLoading } = useQuery({
    queryKey: ["gerencial_parametros"],
    queryFn: () => listarParametrosGerenciais() as Promise<Param[]>,
  });

  const filtrados = useMemo(() => {
    return params.filter((p) => {
      const setorOk =
        setorFiltro === "__all__" ||
        (setorFiltro === "__global__" ? p.setor === null : p.setor === setorFiltro);
      const buscaOk =
        !busca ||
        p.chave.toLowerCase().includes(busca.toLowerCase()) ||
        (p.descricao ?? "").toLowerCase().includes(busca.toLowerCase());
      return setorOk && buscaOk;
    });
  }, [params, setorFiltro, busca]);

  type UpsertInput = {
    chave: string;
    setor?: string | null;
    categoria?: string;
    descricao?: string;
    valor: Record<string, number>;
    motivo?: string;
  };
  const upsert = useMutation({
    mutationFn: (v: UpsertInput) => upsertParametroGerencial({ data: v }),
    onSuccess: () => {
      toast.success("Parâmetro salvo.");
      qc.invalidateQueries({ queryKey: ["gerencial_parametros"] });
      qc.invalidateQueries({ queryKey: ["gerencial_parametros_hist"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerParametroGerencial({ data: { id, motivo: "remoção via UI" } }),
    onSuccess: () => {
      toast.success("Parâmetro removido.");
      qc.invalidateQueries({ queryKey: ["gerencial_parametros"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importar = useMutation({
    mutationFn: (itens: Param[]) =>
      importarParametrosGerenciais({
        data: {
          itens: itens.map((i) => ({
            chave: i.chave,
            setor: i.setor,
            categoria: i.categoria,
            descricao: i.descricao ?? undefined,
            valor: i.valor as Record<string, number>,
          })),
          motivo: "import via UI",
        },
      }),
    onSuccess: (r) => {
      toast.success(`${r.aplicados} parâmetro(s) importado(s).`);
      qc.invalidateQueries({ queryKey: ["gerencial_parametros"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportar = () => {
    const blob = new Blob([JSON.stringify(params, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parametros-gerenciais-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onArquivoImport = async (file: File) => {
    try {
      const txt = await file.text();
      const json = JSON.parse(txt);
      if (!Array.isArray(json)) throw new Error("Arquivo deve conter um array de parâmetros.");
      importar.mutate(json as Param[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Arquivo inválido.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return <Card className="p-6 text-sm text-muted-foreground">Carregando parâmetros…</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">Buscar</Label>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="chave ou descrição" />
          </div>
          <div className="min-w-[200px]">
            <Label className="text-xs">Setor</Label>
            <Select value={setorFiltro} onValueChange={setSetorFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {SETORES.map((s) => (
                  <SelectItem key={s} value={s}>{SETOR_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <NovoOverrideDialog
              chavesExistentes={Array.from(new Set(params.map((p) => p.chave)))}
              onSubmit={(v) => upsert.mutate(v)}
            />
            <HistoricoDialog />
            <Button variant="outline" size="sm" onClick={exportar}>
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onArquivoImport(f);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4 mr-1" /> Importar
              </span>
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Faixas e capacidades editáveis. Parâmetros globais (sem setor) servem de padrão; overrides por setor têm prioridade. Toda alteração é registrada no histórico.
        </p>
      </Card>

      {filtrados.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">Nenhum parâmetro encontrado.</Card>
      )}

      {filtrados.map((p) => (
        <ParametroCard
          key={p.id}
          param={p}
          onSave={(novo, motivo) =>
            upsert.mutate({
              chave: p.chave,
              setor: p.setor,
              categoria: p.categoria,
              descricao: p.descricao ?? undefined,
              valor: novo,
              motivo,
            })
          }
          onRemove={p.setor ? () => remover.mutate(p.id) : undefined}
        />
      ))}
    </div>
  );
}

function ParametroCard({
  param,
  onSave,
  onRemove,
}: {
  param: Param;
  onSave: (v: Record<string, number>, motivo?: string) => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>(
    Object.fromEntries(Object.entries(param.valor).map(([k, v]) => [k, Number(v) || 0])),
  );
  const [motivo, setMotivo] = useState("");

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {param.chave}
            {param.setor ? (
              <Badge variant="secondary">{SETOR_LABEL[param.setor] ?? param.setor}</Badge>
            ) : (
              <Badge variant="outline">Global</Badge>
            )}
            <Badge variant="outline">{param.categoria}</Badge>
          </div>
          <div className="text-sm">{param.descricao ?? "—"}</div>
        </div>
        <div className="flex gap-2">
          {onRemove && (
            <Button size="sm" variant="ghost" onClick={onRemove} title="Remover override">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={() => onSave(draft, motivo || undefined)}>Salvar</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Object.entries(draft).map(([k, v]) => (
          <div key={k}>
            <Label className="text-[11px] uppercase">{k}</Label>
            <Input
              type="number"
              step="0.1"
              value={v}
              onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Label className="text-[11px] uppercase">Motivo da alteração (opcional)</Label>
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: meta revisada para 2026" />
      </div>
    </Card>
  );
}

function NovoOverrideDialog({
  chavesExistentes,
  onSubmit,
}: {
  chavesExistentes: string[];
  onSubmit: (v: { chave: string; setor: string | null; valor: Record<string, number>; motivo?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [chave, setChave] = useState("");
  const [setor, setSetor] = useState<string>("__global__");
  const [valorTxt, setValorTxt] = useState('{"ruim": 10, "aceitavel": 20, "bom": 35}');
  const [motivo, setMotivo] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Novo / Override</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo parâmetro / override por setor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Chave</Label>
            <Input list="param-chaves" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="ex: conversao.bands" />
            <datalist id="param-chaves">
              {chavesExistentes.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <Label>Setor</Label>
            <Select value={setor} onValueChange={setSetor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SETORES.map((s) => (
                  <SelectItem key={s} value={s}>{SETOR_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (JSON)</Label>
            <Textarea rows={4} value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                try {
                  const valor = JSON.parse(valorTxt) as Record<string, number>;
                  if (!chave.trim()) return toast.error("Informe a chave.");
                  onSubmit({
                    chave: chave.trim(),
                    setor: setor === "__global__" ? null : setor,
                    valor,
                    motivo: motivo || undefined,
                  });
                  setOpen(false);
                } catch {
                  toast.error("JSON inválido.");
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoDialog() {
  const [open, setOpen] = useState(false);
  const { data: hist = [], isLoading } = useQuery({
    queryKey: ["gerencial_parametros_hist"],
    queryFn: () => listarHistoricoParametros({ data: { limit: 200 } }),
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><History className="h-4 w-4 mr-1" /> Histórico</Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico de alterações</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2 text-xs">
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {!isLoading && hist.length === 0 && <p className="text-muted-foreground">Sem registros.</p>}
          {hist.map((h) => (
            <div key={h.id} className="border-b border-border pb-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {h.chave}{" "}
                  {h.setor ? <Badge variant="secondary">{SETOR_LABEL[h.setor] ?? h.setor}</Badge> : <Badge variant="outline">Global</Badge>}
                </div>
                <div className="text-muted-foreground">
                  {new Date(h.created_at).toLocaleString("pt-BR")} — {h.changed_by_email ?? "—"}
                </div>
              </div>
              {h.motivo && <div className="text-muted-foreground italic">Motivo: {h.motivo}</div>}
              <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-[11px]">
                <pre className="bg-muted p-2 rounded overflow-x-auto">Antes: {JSON.stringify(h.valor_anterior)}</pre>
                <pre className="bg-muted p-2 rounded overflow-x-auto">Depois: {JSON.stringify(h.valor_novo)}</pre>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
