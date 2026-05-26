/**
 * D10.6 — Painéis de Pendências Estoque
 *
 * Lê views v_pend_* e v_estoque_pendencias_resumo.
 * Sem mock; sem fallback silencioso.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TAG = "[estoque-pendencias]";
const POLL_MS = 60_000;

export interface PendenciasResumo {
  estoque_baixo: number;
  reservas_atrasadas: number;
  entregas_pendentes: number;
  oc_atrasada: number;
  material_parado: number;
  valor_parado_total: number;
  obra_sem_reserva: number;
}

export interface EstoqueBaixoRow {
  produto_id: string;
  codigo: string;
  nome: string;
  unidade: string;
  estoque_minimo: number;
  saldo_fisico: number;
  saldo_reservado: number;
  saldo_disponivel: number;
  deficit: number;
}

export interface ReservaAtrasadaRow {
  reserva_id: string;
  produto_codigo: string;
  produto_nome: string;
  quantidade_pendente: number;
  status: string;
  dias_aberta: number;
  created_at: string;
}

export interface EntregaPendenteRow {
  entrega_id: string;
  produto_codigo: string;
  produto_nome: string;
  quantidade: number;
  status: string;
  dias_pendente: number;
  created_at: string;
}

export interface OcAtrasadaRow {
  ordem_id: string;
  codigo: string | null;
  fornecedor_nome: string | null;
  valor_total: number;
  data_prevista: string;
  dias_atraso: number;
}

export interface MaterialParadoRow {
  produto_id: string;
  codigo: string;
  nome: string;
  saldo_fisico: number;
  valor_parado: number;
  dias_parado: number;
  ultimo_movimento: string | null;
}

export interface ObraSemReservaRow {
  obra_id: string;
  codigo: string | null;
  status: string;
  data_inicio: string | null;
  dias_desde_criacao: number;
}

export interface EstoquePendencias {
  resumo: PendenciasResumo | null;
  estoqueBaixo: EstoqueBaixoRow[];
  reservasAtrasadas: ReservaAtrasadaRow[];
  entregasPendentes: EntregaPendenteRow[];
  ocAtrasada: OcAtrasadaRow[];
  materialParado: MaterialParadoRow[];
  obraSemReserva: ObraSemReservaRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const LIMIT = 100;

export function useEstoquePendencias(enabled: boolean = true): EstoquePendencias {
  const [state, setState] = useState<Omit<EstoquePendencias, "reload">>({
    resumo: null,
    estoqueBaixo: [],
    reservasAtrasadas: [],
    entregasPendentes: [],
    ocAtrasada: [],
    materialParado: [],
    obraSemReserva: [],
    loading: enabled,
    error: null,
  });

  const reload = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [resumo, eb, ra, ep, oc, mp, osr] = await Promise.all([
        supabase.from("v_estoque_pendencias_resumo" as any).select("*").maybeSingle(),
        supabase.from("v_pend_estoque_baixo" as any).select("*").order("deficit", { ascending: false }).limit(LIMIT),
        supabase.from("v_pend_reservas_atrasadas" as any).select("*").order("dias_aberta", { ascending: false }).limit(LIMIT),
        supabase.from("v_pend_entregas_pendentes" as any).select("*").order("dias_pendente", { ascending: false }).limit(LIMIT),
        supabase.from("v_pend_oc_atrasada" as any).select("*").order("dias_atraso", { ascending: false }).limit(LIMIT),
        supabase.from("v_pend_material_parado" as any).select("*").order("valor_parado", { ascending: false }).limit(LIMIT),
        supabase.from("v_pend_obra_sem_reserva" as any).select("*").order("dias_desde_criacao", { ascending: false }).limit(LIMIT),
      ]);

      setState({
        resumo: (resumo.data as unknown as PendenciasResumo) ?? null,
        estoqueBaixo: (eb.data as unknown as EstoqueBaixoRow[]) ?? [],
        reservasAtrasadas: (ra.data as unknown as ReservaAtrasadaRow[]) ?? [],
        entregasPendentes: (ep.data as unknown as EntregaPendenteRow[]) ?? [],
        ocAtrasada: (oc.data as unknown as OcAtrasadaRow[]) ?? [],
        materialParado: (mp.data as unknown as MaterialParadoRow[]) ?? [],
        obraSemReserva: (osr.data as unknown as ObraSemReservaRow[]) ?? [],
        loading: false,
        error: null,
      });
    } catch (e: any) {
      console.warn(TAG, "reload:err", e?.message);
      setState((s) => ({ ...s, loading: false, error: e?.message ?? "erro" }));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    (async () => {
      await reload();
      if (!alive) return;
      timer = setInterval(reload, POLL_MS);
    })();
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [enabled, reload]);

  return { ...state, reload };
}
