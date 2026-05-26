import { useState, useEffect } from "react";
import { useObraCustos } from "@/lib/repositories/use-obra-custos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export function ObraCustosCard({ obraId }: { obraId: string | undefined | null }) {
  const { data, loading, error, salvarCustoPrevisto } = useObraCustos(obraId);
  const [edit, setEdit] = useState(false);
  const [valor, setValor] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setValor(String(data.custo_previsto ?? 0));
  }, [data]);

  if (!obraId) return null;

  const previsto = data?.custo_previsto ?? 0;
  const realizado = data?.custo_realizado ?? 0;
  const saldo = data?.saldo_operacional ?? 0;
  const pct = data?.pct_consumido;

  const corSaldo =
    saldo < 0 ? "text-destructive" : saldo === 0 ? "text-muted-foreground" : "text-emerald-600";

  async function handleSalvar() {
    const num = Number(valor.replace(",", "."));
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Valor inválido", { description: "Informe um número >= 0" });
      return;
    }
    try {
      setSaving(true);
      await salvarCustoPrevisto(num);
      toast.success("Custo previsto atualizado");
      setEdit(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao salvar", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Bridge Financeiro · Obra</h4>
        {loading && <span className="text-[10px] text-muted-foreground">carregando…</span>}
      </div>

      {error && (
        <div className="mb-2 rounded bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-border/60 bg-background/60 p-2">
          <div className="text-[10px] uppercase text-muted-foreground">Previsto</div>
          {edit ? (
            <div className="mt-1 flex gap-1">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          ) : (
            <div className="mt-1 font-semibold">{fmt(previsto)}</div>
          )}
        </div>
        <div className="rounded border border-border/60 bg-background/60 p-2">
          <div className="text-[10px] uppercase text-muted-foreground">Realizado</div>
          <div className="mt-1 font-semibold">{fmt(realizado)}</div>
        </div>
        <div className="rounded border border-border/60 bg-background/60 p-2">
          <div className="text-[10px] uppercase text-muted-foreground">Saldo operacional</div>
          <div className={`mt-1 font-semibold ${corSaldo}`}>{fmt(saldo)}</div>
          {pct != null && (
            <div className="text-[10px] text-muted-foreground">{pct}% consumido</div>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        {edit ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => { setEdit(false); setValor(String(previsto)); }} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSalvar} disabled={saving}>
              {saving ? "Salvando…" : "Salvar previsto"}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
            Editar custo previsto
          </Button>
        )}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Realizado = soma de pagamentos de títulos PAGAR vinculados à obra (via PV ou contrato). Sem mock.
      </div>
    </div>
  );
}
