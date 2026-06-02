/**
 * E.OS.4.b — SignaturePad
 *
 * Canvas simples para captura de assinatura. Exporta PNG via `toBlob`.
 * Sem dependências externas. Usa pointer events (mouse + touch + caneta).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

export interface SignaturePadProps {
  width?: number;
  height?: number;
  disabled?: boolean;
  onSave: (blob: Blob, dataUrl: string) => void | Promise<void>;
}

export function SignaturePad({ width = 480, height = 160, disabled, onSave }: SignaturePadProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  const clear = useCallback(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setEmpty(true);
  }, []);

  useEffect(() => { clear(); }, [clear]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const ctx = ref.current?.getContext("2d"); if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (last.current) ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  }
  function onUp() { drawing.current = false; last.current = null; }

  async function handleSave() {
    const c = ref.current; if (!c || empty) return;
    setSaving(true);
    try {
      const dataUrl = c.toDataURL("image/png");
      const blob: Blob = await new Promise((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("Falha gerar PNG"))), "image/png"),
      );
      await onSave(blob, dataUrl);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-1">
      <canvas
        ref={ref}
        width={width}
        height={height}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="w-full border rounded bg-white touch-none cursor-crosshair"
        style={{ aspectRatio: `${width} / ${height}` }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {empty ? "Desenhe sua assinatura acima." : "Assinatura capturada."}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7" onClick={clear} disabled={disabled || saving}>
            <Eraser className="h-3.5 w-3.5 mr-1" />Limpar
          </Button>
          <Button type="button" size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSave} disabled={disabled || empty || saving}>
            <Check className="h-3.5 w-3.5 mr-1" />{saving ? "Salvando…" : "Salvar assinatura"}
          </Button>
        </div>
      </div>
    </div>
  );
}
