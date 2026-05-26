import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ObraCustos = {
  obra_id: string;
  custo_previsto: number;
  custo_realizado: number;
  saldo_operacional: number;
  pct_consumido: number | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useObraCustos(obraId: string | undefined | null) {
  const [data, setData] = useState<ObraCustos | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!obraId || !UUID_RE.test(obraId)) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: row, error: err } = await supabase
      .from("v_saldo_operacional_obra" as never)
      .select("obra_id,custo_previsto,custo_realizado,saldo_operacional,pct_consumido")
      .eq("obra_id", obraId)
      .maybeSingle();
    if (err) {
      setError(err.message);
      setData(null);
    } else if (row) {
      const r = row as unknown as ObraCustos;
      setData({
        obra_id: r.obra_id,
        custo_previsto: Number(r.custo_previsto ?? 0),
        custo_realizado: Number(r.custo_realizado ?? 0),
        saldo_operacional: Number(r.saldo_operacional ?? 0),
        pct_consumido: r.pct_consumido == null ? null : Number(r.pct_consumido),
      });
    }
    setLoading(false);
  }, [obraId]);

  useEffect(() => { void load(); }, [load]);

  const salvarCustoPrevisto = useCallback(async (valor: number) => {
    if (!obraId || !UUID_RE.test(obraId)) {
      throw new Error("Obra sem UUID real (registro mock). Salve a obra no banco antes de editar custo previsto.");
    }
    const { error: err } = await supabase
      .from("obras")
      .update({ custo_previsto: valor })
      .eq("id", obraId);
    if (err) throw err;
    await load();
  }, [obraId, load]);

  return { data, loading, error, reload: load, salvarCustoPrevisto };
}
