import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsAccess = {
  loading: boolean;
  amplo: boolean;
  privado: boolean;
};

/**
 * Verifica via RPC `has_permission` se o usuário pode ver o
 * Analytics Amplo (gerentes/supervisores) e/ou Privado (CFO/diretoria).
 */
export function useAnalyticsAccess(): AnalyticsAccess {
  const [state, setState] = useState<AnalyticsAccess>({ loading: true, amplo: false, privado: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) { if (alive) setState({ loading: false, amplo: false, privado: false }); return; }
      const [amplo, privado] = await Promise.all([
        supabase.rpc("has_permission", { _user_id: uid, _perm: "analytics.amplo" }),
        supabase.rpc("has_permission", { _user_id: uid, _perm: "analytics.privado" }),
      ]);
      if (!alive) return;
      setState({
        loading: false,
        amplo: Boolean(amplo.data),
        privado: Boolean(privado.data),
      });
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
