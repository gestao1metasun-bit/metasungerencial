/**
 * D11.5 — Métricas Operacionais de Obras (Engenharia)
 *
 * Lê views v_eng_* + v_obra_custo_realizado.
 * Sem mock; sem fallback silencioso.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TAG = "[eng-metricas]";
const POLL_MS = 60_000;
const LIMIT = 100;

export interface EngResumo {
  total_obras: number;
  obras_ativas: number;
  obras_finalizadas: number;
  obras_atrasadas: number;
  obras_estouro_critico: number;
  modulos_instalados_total: number;
  kwp_instalado_total: number;
  kwp_backlog: number;
  tempo_medio_obra_geral: number | null;
}

export interface ObraAtrasadaRow {
  obra_id: string;
  codigo: string | null;
  equipe: string | null;
  status: string;
  modulos_qtde: number | null;
  data_inicio: string | null;
  dias_em_aberto: number;
  severidade: "MEDIA" | "ALTA" | "CRITICA";
}

export interface ProdutividadeEquipeRow {
  equipe: string;
  total_obras: number;
  obras_finalizadas: number;
  obras_em_andamento: number;
  modulos_instalados: number;
  kwp_instalado: number;
  tempo_medio_obra_dias: number | null;
  modulos_por_dia_medio: number | null;
  obras_atrasadas: number;
}

export interface DesvioCustoRow {
  obra_id: string;
  codigo: string | null;
  equipe: string | null;
  status: string;
  modulos_qtde: number | null;
  custo_previsto: number;
  custo_realizado: number;
  desvio_custo: number;
  desvio_pct: number | null;
  faixa: "ABAIXO" | "NO_ALVO" | "ESTOURO" | "ESTOURO_CRITICO" | "SEM_ORCAMENTO";
}

export interface BacklogEquipeRow {
  equipe: string;
  planejadas: number;
  em_andamento: number;
  modulos_pendentes: number;
  kwp_pendente: number;
}

export interface TempoPorFaixaRow {
  faixa_modulos: string;
  obras: number;
  tempo_medio_dias: number | null;
  tempo_min_dias: number | null;
  tempo_max_dias: number | null;
  modulos_dia_medio: number | null;
}

export interface EngMetricas {
  resumo: EngResumo | null;
  obrasAtrasadas: ObraAtrasadaRow[];
  produtividade: ProdutividadeEquipeRow[];
  desvioCusto: DesvioCustoRow[];
  backlog: BacklogEquipeRow[];
  tempoFaixa: TempoPorFaixaRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useEngMetricas(enabled: boolean = true): EngMetricas {
  const [state, setState] = useState<Omit<EngMetricas, "reload">>({
    resumo: null,
    obrasAtrasadas: [],
    produtividade: [],
    desvioCusto: [],
    backlog: [],
    tempoFaixa: [],
    loading: enabled,
    error: null,
  });

  const reload = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [resumo, atrasadas, prod, desvio, backlog, faixa] = await Promise.all([
        supabase.from("v_eng_metricas_resumo" as any).select("*").maybeSingle(),
        supabase.from("v_eng_obras_atrasadas" as any).select("*").order("dias_em_aberto", { ascending: false }).limit(LIMIT),
        supabase.from("v_eng_produtividade_equipe" as any).select("*").order("kwp_instalado", { ascending: false }).limit(LIMIT),
        supabase.from("v_eng_desvio_custo" as any).select("*").limit(LIMIT),
        supabase.from("v_eng_backlog_equipe" as any).select("*").order("kwp_pendente", { ascending: false }).limit(LIMIT),
        supabase.from("v_eng_tempo_por_faixa" as any).select("*"),
      ]);

      setState({
        resumo: (resumo.data as unknown as EngResumo) ?? null,
        obrasAtrasadas: (atrasadas.data as unknown as ObraAtrasadaRow[]) ?? [],
        produtividade: (prod.data as unknown as ProdutividadeEquipeRow[]) ?? [],
        desvioCusto: (desvio.data as unknown as DesvioCustoRow[]) ?? [],
        backlog: (backlog.data as unknown as BacklogEquipeRow[]) ?? [],
        tempoFaixa: (faixa.data as unknown as TempoPorFaixaRow[]) ?? [],
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
