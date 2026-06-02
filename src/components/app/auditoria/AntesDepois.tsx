// D24 — Diff visual ANTES → DEPOIS amigável.
// Renderiza dois cartões lado a lado, destacando campos alterados,
// removidos e adicionados. Fallback: JSON formatado.
import { ArrowRight, Plus, Minus, Pencil } from "lucide-react";

type Obj = Record<string, unknown>;

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function diff(a: Obj | null, b: Obj | null) {
  const ax = (a ?? {}) as Obj;
  const bx = (b ?? {}) as Obj;
  const keys = Array.from(new Set([...Object.keys(ax), ...Object.keys(bx)]));
  return keys.map((k) => {
    const va = ax[k];
    const vb = bx[k];
    const inA = k in ax;
    const inB = k in bx;
    let tipo: "add" | "remove" | "edit" | "same" = "same";
    if (inA && !inB) tipo = "remove";
    else if (!inA && inB) tipo = "add";
    else if (fmt(va) !== fmt(vb)) tipo = "edit";
    return { campo: k, va, vb, tipo };
  });
}

export function AntesDepois({
  antes, depois,
}: {
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
}) {
  if (!antes && !depois) {
    return <div className="text-sm text-muted-foreground">Sem diferença registrada.</div>;
  }
  const linhas = diff(antes ?? null, depois ?? null);

  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-[160px_1fr_24px_1fr] gap-2 font-medium text-xs text-muted-foreground">
        <div>Campo</div><div>Antes</div><div></div><div>Depois</div>
      </div>
      {linhas.map((l) => {
        const tone =
          l.tipo === "add" ? "bg-emerald-50 border-emerald-200"
          : l.tipo === "remove" ? "bg-rose-50 border-rose-200"
          : l.tipo === "edit" ? "bg-amber-50 border-amber-200"
          : "bg-slate-50 border-slate-200";
        const Icon = l.tipo === "add" ? Plus : l.tipo === "remove" ? Minus : l.tipo === "edit" ? Pencil : ArrowRight;
        return (
          <div key={l.campo} className={`grid grid-cols-[160px_1fr_24px_1fr] items-center gap-2 rounded-md border px-2 py-1 ${tone}`}>
            <div className="truncate font-mono text-xs flex items-center gap-1">
              <Icon className="h-3 w-3" /> {l.campo}
            </div>
            <div className="truncate font-mono text-xs">{fmt(l.va)}</div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <div className="truncate font-mono text-xs">{fmt(l.vb)}</div>
          </div>
        );
      })}
    </div>
  );
}
