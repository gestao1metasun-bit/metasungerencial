import { useEffect, useRef, useState, useCallback } from "react";
import { Settings2, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Prefs = {
  hidden: number[];
  widths: Record<number, number>;
  /** Nova ordem das colunas: array de índices originais. Ex: [2,0,1,3] */
  order?: number[];
};

const STORAGE_PREFIX = "tablePrefs:v2:";

function loadPrefs(id: string): Prefs {
  if (typeof window === "undefined") return { hidden: [], widths: {} };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return { hidden: [], widths: {} };
    const p = JSON.parse(raw);
    return {
      hidden: Array.isArray(p.hidden) ? p.hidden : [],
      widths: p.widths || {},
      order: Array.isArray(p.order) ? p.order : undefined,
    };
  } catch {
    return { hidden: [], widths: {} };
  }
}

function savePrefs(id: string, prefs: Prefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(prefs));
  } catch {}
}

export type EnhancedTableProps = {
  tableId: string;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
};

export function EnhancedTable({ tableId, children, className, buttonClassName }: EnhancedTableProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(tableId));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const applyingRef = useRef(false);

  const setAndSave = useCallback(
    (next: Prefs) => {
      prefsRef.current = next;
      setPrefs(next);
      savePrefs(tableId, next);
      // re-aplica imediatamente
      requestAnimationFrame(() => apply());
    },
    [tableId],
  );

  const apply = useCallback(() => {
    const root = wrapRef.current;
    if (!root) return;
    const table = root.querySelector("table");
    if (!table) return;
    if (applyingRef.current) return;
    applyingRef.current = true;
    try {
      const thead = table.querySelector("thead");
      const headerRow = thead?.querySelector("tr");
      if (!headerRow) return;
      const ths = Array.from(headerRow.querySelectorAll<HTMLTableCellElement>("th"));
      if (!ths.length) return;

      const p = prefsRef.current;
      const originalCount = ths.length;

      // Marca índice original via data-attr (uma vez)
      ths.forEach((th, i) => {
        if (!th.dataset.origIndex) th.dataset.origIndex = String(i);
      });

      // Computa ordem efetiva (apenas se válida)
      let order = p.order && p.order.length === originalCount ? p.order.slice() : null;
      if (order) {
        const set = new Set(order);
        if (set.size !== originalCount || order.some((x) => x < 0 || x >= originalCount)) {
          order = null;
        }
      }

      // Reordena <th> conforme ordem
      if (order) {
        const byOrig = new Map<number, HTMLTableCellElement>();
        ths.forEach((th) => byOrig.set(Number(th.dataset.origIndex), th));
        order.forEach((origIdx) => {
          const th = byOrig.get(origIdx);
          if (th) headerRow.appendChild(th);
        });
      }

      // Re-lê na ordem visual atual
      const orderedThs = Array.from(headerRow.querySelectorAll<HTMLTableCellElement>("th"));
      const newLabels = orderedThs.map((th, i) => {
        const txt = (th.textContent || "").replace(/\s+/g, " ").trim();
        return txt || `Coluna ${i + 1}`;
      });
      setLabels((prev) =>
        prev.length === newLabels.length && prev.every((v, i) => v === newLabels[i])
          ? prev
          : newLabels,
      );

      // table-layout fixed se há larguras
      if (Object.keys(p.widths).length > 0) {
        (table as HTMLTableElement).style.tableLayout = "fixed";
      } else {
        (table as HTMLTableElement).style.tableLayout = "";
      }

      // Aplica visibilidade / larguras (por índice ORIGINAL) + handlers
      orderedThs.forEach((th, visualIdx) => {
        const origIdx = Number(th.dataset.origIndex);
        const hidden = p.hidden.includes(origIdx);
        th.style.display = hidden ? "none" : "";
        const w = p.widths[origIdx];
        if (w && !hidden) {
          th.style.width = `${w}px`;
          th.style.minWidth = `${w}px`;
          th.style.maxWidth = `${w}px`;
        } else {
          th.style.width = "";
          th.style.minWidth = "";
          th.style.maxWidth = "";
        }
        ensureHeaderHandlers(th, origIdx, () => prefsRef.current, setAndSave);
      });

      // Reordena células do body e aplica visibilidade
      const bodyRows = table.querySelectorAll<HTMLTableRowElement>("tbody tr");
      bodyRows.forEach((row) => {
        const cells = Array.from(row.children) as HTMLTableCellElement[];
        // Só reordena se a linha tem o mesmo número de células e nenhuma colSpan>1
        const hasSpan = cells.some((c) => (c.colSpan || 1) > 1);
        if (!hasSpan && cells.length === originalCount) {
          cells.forEach((cell, i) => {
            if (!cell.dataset.origIndex) cell.dataset.origIndex = String(i);
          });
          if (order) {
            const byOrig = new Map<number, HTMLTableCellElement>();
            cells.forEach((c) => byOrig.set(Number(c.dataset.origIndex), c));
            order.forEach((origIdx) => {
              const c = byOrig.get(origIdx);
              if (c) row.appendChild(c);
            });
          }
          const finalCells = Array.from(row.children) as HTMLTableCellElement[];
          finalCells.forEach((cell) => {
            const origIdx = Number(cell.dataset.origIndex);
            cell.style.display = p.hidden.includes(origIdx) ? "none" : "";
            const w = p.widths[origIdx];
            if (w && !p.hidden.includes(origIdx)) {
              cell.style.width = `${w}px`;
              cell.style.minWidth = `${w}px`;
              cell.style.maxWidth = `${w}px`;
            } else {
              cell.style.width = "";
              cell.style.minWidth = "";
              cell.style.maxWidth = "";
            }
          });
        } else {
          // Apenas visibilidade quando há colspan
          let colIdx = 0;
          cells.forEach((cell) => {
            const span = cell.colSpan || 1;
            if (span === 1) {
              cell.style.display = p.hidden.includes(colIdx) ? "none" : "";
            }
            colIdx += span;
          });
        }
      });
    } finally {
      applyingRef.current = false;
    }
  }, [setAndSave]);

  useEffect(() => {
    apply();
    const root = wrapRef.current;
    if (!root) return;
    const obs = new MutationObserver(() => apply());
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [apply]);

  const toggle = (visualIdx: number) => {
    // Converte visual -> original via DOM
    const root = wrapRef.current;
    const ths = root ? Array.from(root.querySelectorAll<HTMLTableCellElement>("thead th")) : [];
    const th = ths[visualIdx];
    const origIdx = th ? Number(th.dataset.origIndex) : visualIdx;
    const hidden = prefs.hidden.includes(origIdx)
      ? prefs.hidden.filter((x) => x !== origIdx)
      : [...prefs.hidden, origIdx];
    setAndSave({ ...prefs, hidden });
  };

  const reset = () => setAndSave({ hidden: [], widths: {}, order: undefined });

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className={cn("absolute right-1 top-1 z-20", buttonClassName)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
              title="Ajustar colunas (arraste o cabeçalho para reordenar, borda direita para redimensionar)"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-[60vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">
              Colunas visíveis
              <div className="mt-1 font-normal text-[10px] text-muted-foreground">
                Arraste o cabeçalho para reordenar. Arraste a borda direita para redimensionar.
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {labels.map((label, i) => {
              // Buscar estado de hidden via DOM->origIndex
              const root = wrapRef.current;
              const ths = root
                ? Array.from(root.querySelectorAll<HTMLTableCellElement>("thead th"))
                : [];
              const th = ths[i];
              const origIdx = th ? Number(th.dataset.origIndex) : i;
              const isHidden = prefs.hidden.includes(origIdx);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{label}</span>
                  <Switch checked={!isHidden} onCheckedChange={() => toggle(i)} />
                </div>
              );
            })}
            <DropdownMenuSeparator />
            <div className="p-1">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={reset}>
                <RotateCcw className="mr-2 h-3 w-3" /> Restaurar padrão
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
    </div>
  );
}

// ===========================================================================
// Header handlers: resize + reorder via drag
// ===========================================================================
const HANDLERS_FLAG = "__et_handlers__";

function ensureHeaderHandlers(
  th: HTMLTableCellElement,
  origIndex: number,
  getPrefs: () => Prefs,
  setPrefs: (p: Prefs) => void,
) {
  // Sempre atualiza o origIndex (pode mudar entre re-aplicações)
  (th as any).__et_origIndex = origIndex;
  if ((th as any)[HANDLERS_FLAG]) return;
  (th as any)[HANDLERS_FLAG] = true;

  const cs = window.getComputedStyle(th);
  if (cs.position === "static") th.style.position = "relative";
  th.style.cursor = "grab";
  th.setAttribute("draggable", "true");
  th.title = "Arraste para reordenar · arraste a borda direita para redimensionar";

  // ---- Resizer handle (visível no hover) ----
  const handle = document.createElement("div");
  handle.setAttribute("data-resizer", "1");
  Object.assign(handle.style, {
    position: "absolute",
    top: "0",
    right: "0",
    width: "8px",
    height: "100%",
    cursor: "col-resize",
    userSelect: "none",
    zIndex: "10",
    background: "transparent",
    transition: "background 120ms",
  } as CSSStyleDeclaration);
  handle.addEventListener("mouseenter", () => {
    handle.style.background = "hsl(var(--primary) / 0.4)";
  });
  handle.addEventListener("mouseleave", () => {
    handle.style.background = "transparent";
  });

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    th.setAttribute("draggable", "false");
    const startX = e.clientX;
    const startW = th.getBoundingClientRect().width;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(48, Math.round(startW + (ev.clientX - startX)));
      th.style.width = `${next}px`;
      th.style.minWidth = `${next}px`;
      th.style.maxWidth = `${next}px`;
      const table = th.closest("table") as HTMLTableElement | null;
      if (table) table.style.tableLayout = "fixed";
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      th.setAttribute("draggable", "true");
      const finalW = Math.round(th.getBoundingClientRect().width);
      const cur = getPrefs();
      const oi = (th as any).__et_origIndex as number;
      setPrefs({ ...cur, widths: { ...cur.widths, [oi]: finalW } });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  th.appendChild(handle);

  // ---- Drag & drop reorder ----
  th.addEventListener("dragstart", (e) => {
    const oi = (th as any).__et_origIndex as number;
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/x-et-col", String(oi));
    th.style.opacity = "0.4";
  });
  th.addEventListener("dragend", () => {
    th.style.opacity = "";
    th.style.borderLeft = "";
    th.style.borderRight = "";
  });
  th.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const rect = th.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    th.style.borderLeft = before ? "2px solid hsl(var(--primary))" : "";
    th.style.borderRight = !before ? "2px solid hsl(var(--primary))" : "";
  });
  th.addEventListener("dragleave", () => {
    th.style.borderLeft = "";
    th.style.borderRight = "";
  });
  th.addEventListener("drop", (e) => {
    e.preventDefault();
    th.style.borderLeft = "";
    th.style.borderRight = "";
    if (!e.dataTransfer) return;
    const fromStr = e.dataTransfer.getData("text/x-et-col");
    if (!fromStr) return;
    const from = Number(fromStr);
    const to = (th as any).__et_origIndex as number;
    if (from === to || Number.isNaN(from)) return;

    const rect = th.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;

    const headerRow = th.parentElement as HTMLTableRowElement | null;
    if (!headerRow) return;
    const ths = Array.from(headerRow.querySelectorAll<HTMLTableCellElement>("th"));
    const currentOrder = ths.map((x) => Number(x.dataset.origIndex));
    const fromPos = currentOrder.indexOf(from);
    let toPos = currentOrder.indexOf(to);
    if (fromPos < 0 || toPos < 0) return;
    currentOrder.splice(fromPos, 1);
    toPos = currentOrder.indexOf(to);
    currentOrder.splice(before ? toPos : toPos + 1, 0, from);

    const cur = getPrefs();
    setPrefs({ ...cur, order: currentOrder });
  });
}
