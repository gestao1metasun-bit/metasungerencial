// Componente genérico de Kanban com colunas editáveis pelo usuário.
// Cada quadro mantém em localStorage:
//   - lista de colunas (id, título, ativo, locked, tone)
//   - atribuição de cards (cardKey -> colId)
// Cards podem ser arrastados entre colunas. Itens novos caem na coluna padrão
// derivada do status do item (via getDefaultColId).
import * as React from "react";
import {
  ArrowDown, ArrowUp, Check, Columns3, GripVertical, Lock, Plus, Trash2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export type KCol = {
  id: string;
  titulo: string;
  ativo?: boolean;
  locked?: boolean;
  /** Classes Tailwind para colorir o cabeçalho da coluna. */
  tone?: string;
};

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeLS<T>(key: string, value: T) {
  try { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function useKanbanColumns(
  storageKey: string,
  defaultCols: KCol[],
) {
  const colsKey = `${storageKey}.cols.v1`;
  const assignKey = `${storageKey}.assign.v1`;

  const [cols, setColsRaw] = React.useState<KCol[]>(() => {
    const saved = readLS<KCol[]>(colsKey, []);
    return saved.length ? saved : defaultCols;
  });
  const [assign, setAssign] = React.useState<Record<string, string>>(
    () => readLS<Record<string, string>>(assignKey, {}),
  );

  React.useEffect(() => writeLS(colsKey, cols), [cols, colsKey]);
  React.useEffect(() => writeLS(assignKey, assign), [assign, assignKey]);

  const setCols = (updater: KCol[] | ((c: KCol[]) => KCol[])) => {
    setColsRaw((prev) => typeof updater === "function" ? (updater as (c: KCol[]) => KCol[])(prev) : updater);
  };

  return { cols, setCols, assign, setAssign };
}

/* ====================== ColunasManager ====================== */

export function ColunasManager({
  open, onOpenChange, cols, setCols,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cols: KCol[];
  setCols: (fn: (c: KCol[]) => KCol[]) => void;
}) {
  const [novoTitulo, setNovoTitulo] = React.useState("");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [tituloEdit, setTituloEdit] = React.useState("");

  const adicionar = () => {
    const t = novoTitulo.trim();
    if (!t) return;
    setCols((c) => [...c, { id: `col-${Date.now()}`, titulo: t, ativo: true }]);
    setNovoTitulo("");
  };
  const renomear = (id: string) => {
    const t = tituloEdit.trim();
    if (!t) return;
    setCols((c) => c.map((x) => (x.id === id ? { ...x, titulo: t } : x)));
    setEditId(null);
  };
  const toggleAtivo = (id: string) =>
    setCols((c) => c.map((x) => (x.id === id ? { ...x, ativo: x.ativo === false } : x)));
  const excluir = (id: string) => {
    if (cols.find((x) => x.id === id)?.locked) return toast.error("Esta coluna é fixa do sistema.");
    if (cols.length <= 1) return toast.error("Mantenha pelo menos uma coluna.");
    if (!confirm("Excluir esta coluna? Cards nela voltam para a coluna padrão.")) return;
    setCols((c) => c.filter((x) => x.id !== id));
  };
  const mover = (id: string, dir: -1 | 1) => {
    setCols((c) => {
      const i = c.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.length) return c;
      if (c[i].locked || c[j].locked) return c;
      const cp = [...c]; [cp[i], cp[j]] = [cp[j], cp[i]]; return cp;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5" /> Gerenciar colunas do Kanban
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2 rounded-md border bg-muted/30 p-2">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Nova coluna</label>
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionar()}
                placeholder="Ex.: Visita técnica"
                className="h-8"
              />
            </div>
            <Button size="sm" onClick={adicionar} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Colunas cadastradas</div>
            {cols.map((c, idx) => (
              <div key={c.id} className={`flex items-center gap-2 rounded-md border p-2 ${c.ativo === false ? "bg-muted/40 opacity-60" : "bg-card"} ${c.locked ? "border-success/50" : ""}`}>
                <GripVertical className={`h-4 w-4 ${c.locked ? "text-success/60" : "text-muted-foreground"}`} />
                {editId === c.id && !c.locked ? (
                  <>
                    <Input
                      autoFocus
                      value={tituloEdit}
                      onChange={(e) => setTituloEdit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && renomear(c.id)}
                      className="h-7 flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renomear(c.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { if (c.locked) return; setEditId(c.id); setTituloEdit(c.titulo); }}
                    className={`flex-1 truncate text-left text-sm font-medium ${c.locked ? "cursor-default" : ""}`}
                    title={c.locked ? "Coluna fixa do sistema" : "Clique para renomear"}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.locked && <Lock className="h-3 w-3 text-success" />}
                      {c.titulo}
                    </span>
                  </button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(c.id, -1)} disabled={idx === 0 || c.locked || cols[idx - 1]?.locked} title="Subir">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(c.id, 1)} disabled={idx === cols.length - 1 || c.locked || cols[idx + 1]?.locked} title="Descer">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[10px] uppercase text-muted-foreground">Ativa</span>
                  <Switch checked={c.ativo !== false} onCheckedChange={() => toggleAtivo(c.id)} disabled={c.locked} />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => excluir(c.id)} disabled={c.locked} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ====================== Botão "Colunas" pronto ====================== */

export function ColunasButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" className="gap-2" onClick={onClick}>
      <Columns3 className="h-4 w-4" /> Colunas do Kanban
    </Button>
  );
}

/* ====================== Kanban genérico (drag&drop) ====================== */

export type KItem<T> = {
  key: string;
  data: T;
  /** id da coluna padrão sugerida (usada se o usuário ainda não atribuiu). */
  defaultColId: string;
};

export function KanbanGeneric<T>({
  cols, items, assign, setAssign, renderCard, onCardDrop, columnMinWidth = 240, fullHeight = false,
}: {
  cols: KCol[];
  items: KItem<T>[];
  assign: Record<string, string>;
  setAssign: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  renderCard: (item: T, key: string) => React.ReactNode;
  /** Disparado quando um card é solto numa coluna. Útil pra refletir num estado externo (ex.: status). */
  onCardDrop?: (cardKey: string, colId: string) => void;
  columnMinWidth?: number;
  fullHeight?: boolean;
}) {
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const ativas = cols.filter((c) => c.ativo !== false);
  const colIds = new Set(ativas.map((c) => c.id));

  const colOf = (it: KItem<T>) => {
    const cur = assign[it.key];
    if (cur && colIds.has(cur)) return cur;
    return colIds.has(it.defaultColId) ? it.defaultColId : (ativas[0]?.id ?? "");
  };

  const drop = (colId: string) => {
    if (!dragKey) return;
    setAssign((prev) => ({ ...prev, [dragKey]: colId }));
    onCardDrop?.(dragKey, colId);
    setDragKey(null);
  };


  return (
    <div className={fullHeight ? "overflow-x-auto overflow-y-hidden h-[calc(100vh-230px)]" : "overflow-x-auto"}>
      <div className={"flex gap-3 pb-2 " + (fullHeight ? "h-full" : "")} style={{ minWidth: `${ativas.length * columnMinWidth}px` }}>
        {ativas.map((col) => {
          const its = items.filter((it) => colOf(it) === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(col.id)}
              className={"shrink-0 rounded-lg border bg-muted/20 p-2 " + (fullHeight ? "h-full overflow-y-auto" : "")}
              style={{ width: `${columnMinWidth}px` }}
            >
              <div className={"mb-2 flex items-center justify-between rounded-md border px-2 py-1 text-[11px] font-semibold " + (col.tone ?? "bg-background")}>
                <span className="truncate">{col.titulo}</span>
                <span className="rounded-full bg-background/70 px-1.5 tabular-nums">{its.length}</span>
              </div>
              <div className="space-y-2">
                {its.length === 0 ? (
                  <div className="rounded border border-dashed py-6 text-center text-[11px] text-muted-foreground">—</div>
                ) : its.map((it) => (
                  <div
                    key={it.key}
                    draggable
                    onDragStart={() => setDragKey(it.key)}
                    onDragEnd={() => setDragKey(null)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {renderCard(it.data, it.key)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
