/**
 * Onda D4.5 — KPIs reais consolidados.
 *
 * Lê dados transacionais reais das tabelas/views da D1–D4.4:
 *  - Financeiro: titulos_financeiros + movimentacoes_financeiras
 *  - Engenharia: obras + v_saldo_operacional_obra
 *  - Estoque:   estoque_movimentos + estoque_reservas + estoque_entregas
 *  - Comercial: pedidos_venda + contratos
 *
 * Política D4.5:
 *  - dado real SEMPRE vence mock;
 *  - se a query falhar (ex.: sem sessão), retorna `disponivel=false`
 *    e a UI exibe badge "Modo mock — fallback DEV ONLY".
 *  - nunca há merge silencioso.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TAG = "[kpis-reais]";
const POLL_MS = 60_000;

export interface FinanceiroKpis {
  totalTitulos: number;
  pendentes: number;
  recebidos: number;
  atrasados: number;
  valorPendente: number;
  valorRecebido: number;
  valorAtrasado: number;
  fluxoPrevisto: number;
  fluxoRealizado: number;
  saldoOperacional: number;
}

export interface EngenhariaKpis {
  totalObras: number;
  obrasAtivas: number;
  obrasFinalizadas: number;
  custoPrevisto: number;
  custoRealizado: number;
  consumoPct: number;
}

export interface EstoqueKpis {
  saldoFisico: number;
  reservado: number;
  disponivel: number;
  entregasPendentes: number;
  custoEstoque: number;
}

export interface ComercialKpis {
  totalPv: number;
  pvAprovados: number;
  pvExecucao: number;
  pvRascunho: number;
  ticketMedio: number;
  valorTotalPv: number;
  totalContratos: number;
}

export interface KpisReais {
  financeiro: FinanceiroKpis | null;
  engenharia: EngenhariaKpis | null;
  estoque: EstoqueKpis | null;
  comercial: ComercialKpis | null;
  loading: boolean;
  error: string | null;
  disponivel: boolean;
  reload: () => Promise<void>;
}

const ZERO_FIN: FinanceiroKpis = {
  totalTitulos: 0, pendentes: 0, recebidos: 0, atrasados: 0,
  valorPendente: 0, valorRecebido: 0, valorAtrasado: 0,
  fluxoPrevisto: 0, fluxoRealizado: 0, saldoOperacional: 0,
};

async function loadFinanceiro(): Promise<FinanceiroKpis | null> {
  const { data: titulos, error } = await supabase
    .from("titulos_financeiros")
    .select("status,tipo,valor_liquido,saldo,vencimento")
    .is("deleted_at", null)
    .limit(5000);
  if (error) { console.warn(TAG, "fin err", error.message); return null; }

  const hoje = new Date().toISOString().slice(0, 10);
  const k = { ...ZERO_FIN };
  for (const t of titulos ?? []) {
    k.totalTitulos += 1;
    const valor = Number(t.valor_liquido ?? 0);
    const saldo = Number(t.saldo ?? 0);
    if (t.status === "BAIXADO" || t.status === "QUITADO") {
      k.recebidos += 1;
      k.valorRecebido += valor;
      if (t.tipo === "RECEBER" || t.tipo === "AR") k.fluxoRealizado += valor;
    } else if (t.status === "PENDENTE" || t.status === "PARCIAL") {
      k.pendentes += 1;
      k.valorPendente += saldo;
      if (t.tipo === "RECEBER" || t.tipo === "AR") k.fluxoPrevisto += saldo;
      if (t.vencimento && t.vencimento < hoje) {
        k.atrasados += 1;
        k.valorAtrasado += saldo;
      }
    }
  }
  k.saldoOperacional = k.valorRecebido - k.valorPendente;
  return k;
}

async function loadEngenharia(): Promise<EngenhariaKpis | null> {
  const { data: obras, error: e1 } = await supabase
    .from("obras")
    .select("id,status,custo_previsto")
    .is("deleted_at", null)
    .limit(5000);
  if (e1) { console.warn(TAG, "eng obras err", e1.message); return null; }

  const k: EngenhariaKpis = {
    totalObras: 0, obrasAtivas: 0, obrasFinalizadas: 0,
    custoPrevisto: 0, custoRealizado: 0, consumoPct: 0,
  };
  for (const o of obras ?? []) {
    k.totalObras += 1;
    k.custoPrevisto += Number(o.custo_previsto ?? 0);
    if (o.status === "Finalizada" || o.status === "Concluida") k.obrasFinalizadas += 1;
    else k.obrasAtivas += 1;
  }

  const { data: saldos } = await supabase
    .from("v_saldo_operacional_obra" as any)
    .select("custo_realizado")
    .limit(5000);
  for (const s of (saldos ?? []) as any[]) {
    k.custoRealizado += Number(s.custo_realizado ?? 0);
  }
  k.consumoPct = k.custoPrevisto > 0
    ? Math.round((k.custoRealizado / k.custoPrevisto) * 100)
    : 0;
  return k;
}

async function loadEstoque(): Promise<EstoqueKpis | null> {
  const { data: movs, error: e1 } = await supabase
    .from("estoque_movimentos")
    .select("tipo,quantidade,custo_total")
    .limit(10000);
  if (e1) { console.warn(TAG, "estq mov err", e1.message); return null; }

  let saldoFisico = 0;
  let custoEstoque = 0;
  for (const m of movs ?? []) {
    const q = Number(m.quantidade ?? 0);
    const c = Number(m.custo_total ?? 0);
    if (m.tipo === "ENTRADA") { saldoFisico += q; custoEstoque += c; }
    else if (m.tipo === "SAIDA" || m.tipo === "BAIXA") { saldoFisico -= q; custoEstoque -= c; }
  }

  const { data: reservas } = await supabase
    .from("estoque_reservas")
    .select("quantidade_reservada,quantidade_entregue,status")
    .eq("status", "ATIVA")
    .limit(5000);
  let reservado = 0;
  for (const r of reservas ?? []) {
    reservado += Number(r.quantidade_reservada ?? 0) - Number(r.quantidade_entregue ?? 0);
  }

  const { count: pendentes } = await supabase
    .from("estoque_entregas")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDENTE");

  return {
    saldoFisico,
    reservado,
    disponivel: Math.max(0, saldoFisico - reservado),
    entregasPendentes: pendentes ?? 0,
    custoEstoque: Math.max(0, custoEstoque),
  };
}

async function loadComercial(): Promise<ComercialKpis | null> {
  const { data: pvs, error } = await supabase
    .from("pedidos_venda")
    .select("status,valor_total")
    .is("deleted_at", null)
    .limit(5000);
  if (error) { console.warn(TAG, "pv err", error.message); return null; }

  const k: ComercialKpis = {
    totalPv: 0, pvAprovados: 0, pvExecucao: 0, pvRascunho: 0,
    ticketMedio: 0, valorTotalPv: 0, totalContratos: 0,
  };
  let aprovValor = 0;
  for (const p of pvs ?? []) {
    k.totalPv += 1;
    const v = Number(p.valor_total ?? 0);
    k.valorTotalPv += v;
    if (p.status === "APROVADO") { k.pvAprovados += 1; aprovValor += v; }
    else if (p.status === "EM_EXECUCAO" || p.status === "ENVIADO_ENGENHARIA") k.pvExecucao += 1;
    else if (p.status === "RASCUNHO") k.pvRascunho += 1;
  }
  k.ticketMedio = k.pvAprovados > 0 ? aprovValor / k.pvAprovados : 0;

  const { count } = await supabase
    .from("contratos")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  k.totalContratos = count ?? 0;
  return k;
}

export function useKpisReais(enabled: boolean = true): KpisReais {
  const [state, setState] = useState<Omit<KpisReais, "reload">>({
    financeiro: null, engenharia: null, estoque: null, comercial: null,
    loading: enabled, error: null, disponivel: false,
  });

  const reload = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const [fin, eng, est, com] = await Promise.all([
        loadFinanceiro(), loadEngenharia(), loadEstoque(), loadComercial(),
      ]);
      const disponivel = !!(fin || eng || est || com);
      console.info(TAG, "reload:ok", {
        fin: !!fin, eng: !!eng, est: !!est, com: !!com,
      });
      setState({
        financeiro: fin, engenharia: eng, estoque: est, comercial: com,
        loading: false, error: null, disponivel,
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
    const onFocus = () => { reload(); };
    window.addEventListener("focus", onFocus);
    const { data: sub } = supabase.auth.onAuthStateChange(() => { reload(); });
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
  }, [enabled, reload]);

  return { ...state, reload };
}
