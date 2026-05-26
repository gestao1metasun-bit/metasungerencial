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

export function useObrasReais(enabled: boolean = true) {
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const r = await fetchAll();
    if (r.error) {
      console.warn(TAG, "reload erro (mantendo lista anterior)", r.error);
      setError(r.error);
    } else {
      setError(null);
      setObras(r.data ?? []);
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

    // invalidar em login/logout
    const { data: sub } = supabase.auth.onAuthStateChange(() => { reload(); });

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
  }, [enabled, reload]);

  return { obras, loading, error, reload };
}
