/**
 * Hook Supabase-first para obras reais.
 *
 * Onda B — Engenharia Real.
 *
 * Comportamento:
 *  - lê todas as obras vivas (RLS filtra por consultor/admin);
 *  - revalida em foco / a cada 30s;
 *  - retorna lista + status de loading + erro.
 *
 * Bridge UUID: cada `ObraRow` carrega `dados.projeto_contrato_id`, o que
 * permite deduplicar contra obras-mock que tenham origem em projeto real.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchAll, type ObraRow } from "@/lib/repositories/obras-repo";
import { supabase } from "@/integrations/supabase/client";

const TAG = "[obras-hook]";
const POLL_MS = 30_000;
const DEBUG_OBRA_CODIGO = "OBR-20260526-710ec4";

function debugRows(rows: ObraRow[]) {
  return rows.map((row) => ({
    obra_id: row.id ?? null,
    codigo: row.codigo ?? null,
    status: row.status ?? null,
    etapa: row.status ?? null,
    projeto_contrato_id: row.dados?.projeto_contrato_id ?? null,
    cliente_id: row.cliente_id ?? null,
    contrato_id: row.contrato_id ?? null,
  }));
}

export function useObrasReais(enabled: boolean = true) {
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    console.info(TAG, "reload:start", { enabled });
    const r = await fetchAll();
    if (r.error) {
      console.warn(TAG, "reload erro (mantendo lista anterior)", r.error);
      setError(r.error);
    } else {
      setError(null);
      setObras(r.data ?? []);
      console.info(TAG, "reload:success", {
        total: (r.data ?? []).length,
        target: (r.data ?? []).find((row) => row.codigo === DEBUG_OBRA_CODIGO)
          ? debugRows((r.data ?? []).filter((row) => row.codigo === DEBUG_OBRA_CODIGO))
          : null,
        rows: debugRows(r.data ?? []),
      });
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setObras([]);
      setLoading(false);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      await reload();
      if (!alive) return;
      timer = setInterval(reload, POLL_MS);
    })();

    const onFocus = () => { reload(); };
    window.addEventListener("focus", onFocus);

    // invalidar em login/logout sem bloquear o callback de auth
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        void reload();
      }, 0);
    });

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
  }, [enabled, reload]);

  return { obras, loading, error, reload };
}
