/**
 * Onda D4.6 — Hooks de hardening / alertas operacionais.
 * Lê v_hardening_report e v_alertas_operacionais (RLS via security_invoker).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/observability";

export type HardeningRow = {
  categoria: string;
  severidade: "baixo" | "medio" | "alto";
  qtd: number;
  descricao: string;
};

export type AlertaRow = {
  tipo: string;
  severidade: string;
  entidade_id: string;
  referencia: string | null;
  mensagem: string;
  consultor_id: string | null;
};

export function useHardeningReport(poll = false) {
  const [rows, setRows] = useState<HardeningRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_hardening_report" as any)
      .select("*");
    if (error) {
      setError(error.message);
      logger.error("hardening", "load_report", error.message);
      setRows(null);
    } else {
      setError(null);
      setRows((data ?? []) as HardeningRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!poll) return;
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [poll]);

  return { rows, loading, error, refresh: load };
}

export function useAlertasOperacionais() {
  const [rows, setRows] = useState<AlertaRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from("v_alertas_operacionais" as any)
        .select("*")
        .limit(100);
      if (cancel) return;
      if (error) logger.warn("hardening", "load_alertas", error.message);
      setRows((data ?? []) as AlertaRow[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);
  return { rows, loading };
}

/** Dispara recálculo de status vencidos (RPC). Admin-friendly. */
export async function recalcularVencidos() {
  const { data, error } = await supabase.rpc("recalcular_status_vencidos" as any);
  if (error) {
    logger.error("hardening", "recalc_vencidos", error.message);
    throw error;
  }
  logger.info("hardening", "recalc_vencidos", "ok", { result: data });
  return data;
}
