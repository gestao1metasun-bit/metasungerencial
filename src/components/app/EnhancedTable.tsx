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
};

const STORAGE_PREFIX = "tablePrefs:v1:";

function loadPrefs(id: string): Prefs {
  if (typeof window === "undefined") return { hidden: [], widths: {} };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return { hidden: [], widths: {} };
    const p = JSON.parse(raw);
    return { hidden: Array.isArray(p.hidden) ? p.hidden : [], widths: p.widths || {} };
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
  /** Posição do botão de ajustes. Default: top-right interno */
  buttonClassName?: string;
};

/**
 * Envolve qualquer <Table> shadcn e adiciona:
 * - Botão ⚙ pequeno para mostrar/ocultar colunas
 * - Redimensionamento por arrastar a borda direita do cabeçalho
 * - Persistência por tableId em localStorage
 *
 * Não requer refatorar a tabela: detecta <th> pelos textos do cabeçalho.
 */
export function EnhancedTable({ tableId, children, className, buttonClassName }: EnhancedTableProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(tableId));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // Aplica visibilidade + larguras no DOM
  const apply = useCallback(() => {
    const root = wrapRef.current;
    if (!root) return;
    const table = root.querySelector("table");
    if (!table) return;

    const ths = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
    if (!ths.length) return;

    // Atualiza labels se mudou
    const newLabels = ths.map((th, i) => {
      const txt = (th.textContent || "").replace(/\s+/g, " ").trim();
      return txt || `Coluna ${i + 1}`;
    });
    setLabels((prev) => {
      if (prev.length === newLabels.length && prev.every((v, i) => v === newLabels[i])) return prev;
      return newLabels;
    });

    const p = prefsRef.current;

    // table-layout fixed somente se há larguras customizadas
    if (Object.keys(p.widths).length > 0) {
      (table as HTMLTableElement).style.tableLayout = "fixed";
    } else {
      (table as HTMLTableElement).style.tableLayout = "";
    }

    // Aplica visibilidade e largura por índice
    ths.forEach((th, i) => {
      const hidden = p.hidden.includes(i);
      th.style.display = hidden ? "none" : "";
      const w = p.widths[i];
      if (w && !hidden) {
        th.style.width = `${w}px`;
        th.style.minWidth = `${w}px`;
        th.style.maxWidth = `${w}px`;
      } else {
        th.style.width = "";
        th.style.minWidth = "";
        th.style.maxWidth = "";
      }
      // Garantir handler de resize
      ensureResizer(th, i, tableId, () => prefsRef.current, (next) => {
        prefsRef.current = next;
        setPrefs(next);
        savePrefs(tableId, next);
      });
    });

    // Aplica display:none nas células do body por índice (ignorando colSpan>1)
    const rows = table.querySelectorAll<HTMLTableRowElement>("tbody tr");
    rows.forEach((row) => {
      const cells = Array.from(row.children) as HTMLTableCellElement[];
      let colIdx = 0;
      cells.forEach((cell) => {
        const span = cell.colSpan || 1;
        if (span === 1) {
          cell.style.display = p.hidden.includes(colIdx) ? "none" : "";
        }
        colIdx += span;
      });
    });
  }, [tableId]);

  useEffect(() => {
    apply();
    const root = wrapRef.current;
    if (!root) return;
    const obs = new MutationObserver(() => apply());
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [apply]);

  const toggle = (i: number) => {
    const hidden = prefs.hidden.includes(i)
      ? prefs.hidden.filter((x) => x !== i)
      : [...prefs.hidden, i];
    const next = { ...prefs, hidden };
    setPrefs(next);
    savePrefs(tableId, next);
  };

  const reset = () => {
    const next = { hidden: [], widths: {} };
    setPrefs(next);
    savePrefs(tableId, next);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className={cn("absolute right-1 top-1 z-20", buttonClassName)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
              title="Ajustar colunas"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 max-h-[60vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Colunas visíveis</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {labels.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{label}</span>
                <Switch checked={!prefs.hidden.includes(i)} onCheckedChange={() => toggle(i)} />
              </div>
            ))}
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

// ====== Resizer ======
const RESIZER_FLAG = "__et_resizer__";

function ensureResizer(
  th: HTMLTableCellElement,
  index: number,
  tableId: string,
  getPrefs: () => Prefs,
  setPrefs: (p: Prefs) => void,
) {
  if ((th as any)[RESIZER_FLAG]) return;
  (th as any)[RESIZER_FLAG] = true;

  // garantir posicionamento relativo para o handle
  const cs = window.getComputedStyle(th);
  if (cs.position === "static") th.style.position = "relative";

  const handle = document.createElement("div");
  handle.setAttribute("data-resizer", "1");
  Object.assign(handle.style, {
    position: "absolute",
    top: "0",
    right: "0",
    width: "5px",
    height: "100%",
    cursor: "col-resize",
    userSelect: "none",
    zIndex: "10",
  } as CSSStyleDeclaration);

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      const finalW = Math.round(th.getBoundingClientRect().width);
      const cur = getPrefs();
      setPrefs({ ...cur, widths: { ...cur.widths, [index]: finalW } });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  th.appendChild(handle);
}
