/**
 * Séries mensais reais para os gráficos do ERP (últimos 6 meses).
 *
 * Fontes oficiais (somente leitura, RLS aplicada):
 *  - movimentacoes_financeiras → realizado (entrada/saída) por mês
 *  - titulos_financeiros       → previsto (a receber / a pagar) por vencimento
 *  - contratos                 → vendas fechadas por mês + ranking de consultores
 *  - propostas                 → funil comercial por status
 *
 * Nunca há fallback mock: se a query falhar, a série vem vazia e a UI mostra
 * o estado "sem dados no período".
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PontoMes {
  label: string;
  mes: string; // YYYY-MM
  entradas: number;
  saidas: number;
  previstoReceber: number;
  previstoPagar: number;
  vendas: number;
  contratos: number;
}

export interface RankItem { label: string; valor: number; qtd: number }
export interface FunilItem { label: string; qtd: number }

export interface SeriesMensais {
  meses: PontoMes[];
  rankingConsultores: RankItem[];
  funilComercial: FunilItem[];
  distribuicaoStatusFin: { label: string; valor: number }[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const MES_LABEL = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function ultimosMeses(n: number): PontoMes[] {
  const hoje = new Date();
  const out: PontoMes[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    out.push({
      label: `${MES_LABEL[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      entradas: 0, saidas: 0, previstoReceber: 0, previstoPagar: 0, vendas: 0, contratos: 0,
    });
  }
  return out;
}

const chaveMes = (iso?: string | null) => (iso ? String(iso).slice(0, 7) : null);

export function useSeriesMensais(nMeses = 6): SeriesMensais {
  const [meses, setMeses] = useState<PontoMes[]>(() => ultimosMeses(nMeses));
  const [rankingConsultores, setRanking] = useState<RankItem[]>([]);
  const [funilComercial, setFunil] = useState<FunilItem[]>([]);
  const [distribuicaoStatusFin, setDistFin] = useState<{ label: string; valor: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const base = ultimosMeses(nMeses);
    const idx = new Map(base.map((m) => [m.mes, m]));
    const desde = `${base[0].mes}-01`;

    try {
      const [mov, tit, ctr, prop] = await Promise.all([
        supabase.from("movimentacoes_financeiras")
          .select("tipo,valor,data").gte("data", desde).limit(20000),
        supabase.from("titulos_financeiros")
          .select("tipo,status,saldo,valor_liquido,vencimento")
          .is("deleted_at", null).limit(20000),
        supabase.from("contratos")
          .select("valor_total,created_at,vendedor,status")
          .is("deleted_at", null).limit(5000),
        supabase.from("propostas")
          .select("status").is("deleted_at", null).limit(5000),
      ]);

      for (const m of (mov.data ?? []) as any[]) {
        const k = chaveMes(m.data);
        const p = k ? idx.get(k) : null;
        if (!p) continue;
        const v = Number(m.valor ?? 0);
        if (String(m.tipo).toUpperCase().includes("SAID") || String(m.tipo).toUpperCase() === "PAGAMENTO") p.saidas += v;
        else p.entradas += v;
      }

      const distFin = new Map<string, number>();
      for (const t of (tit.data ?? []) as any[]) {
        const saldo = Number(t.saldo ?? t.valor_liquido ?? 0);
        const st = String(t.status ?? "—");
        distFin.set(st, (distFin.get(st) ?? 0) + saldo);
        const k = chaveMes(t.vencimento);
        const p = k ? idx.get(k) : null;
        if (!p || saldo <= 0) continue;
        const tipo = String(t.tipo ?? "").toUpperCase();
        if (tipo.startsWith("PAG") || tipo === "AP") p.previstoPagar += saldo;
        else p.previstoReceber += saldo;
      }

      const rank = new Map<string, RankItem>();
      for (const c of (ctr.data ?? []) as any[]) {
        const valor = Number(c.valor_total ?? 0);
        const k = chaveMes(c.created_at);
        const p = k ? idx.get(k) : null;
        if (p) { p.vendas += valor; p.contratos += 1; }
        const nome = String(c.vendedor ?? "").trim() || "Sem consultor";
        const r = rank.get(nome) ?? { label: nome, valor: 0, qtd: 0 };
        r.valor += valor; r.qtd += 1;
        rank.set(nome, r);
      }

      const porStatus = new Map<string, number>();
      for (const p of (prop.data ?? []) as any[]) {
        const s = String(p.status ?? "RASCUNHO").toUpperCase();
        porStatus.set(s, (porStatus.get(s) ?? 0) + 1);
      }
      const totalProp = (prop.data ?? []).length;
      const soma = (...keys: string[]) => keys.reduce((s, k) => s + (porStatus.get(k) ?? 0), 0);

      setMeses(base);
      setRanking([...rank.values()].sort((a, b) => b.valor - a.valor).slice(0, 6));
      setDistFin([...distFin.entries()]
        .filter(([, v]) => v > 0)
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6));
      setFunil([
        { label: "Propostas criadas", qtd: totalProp },
        { label: "Enviadas ao cliente", qtd: soma("ENVIADA", "EM_ANALISE", "APROVADA", "ASSINADA", "CONTRATO_PENDENTE") },
        { label: "Aprovadas", qtd: soma("APROVADA", "ASSINADA", "CONTRATO_PENDENTE") },
        { label: "Contratos gerados", qtd: (ctr.data ?? []).length },
        { label: "Contratos assinados", qtd: ((ctr.data ?? []) as any[]).filter((c) => String(c.status ?? "").toUpperCase().includes("ASSIN")).length },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar séries.");
      setMeses(base);
    } finally {
      setLoading(false);
    }
  }, [nMeses]);

  useEffect(() => { void load(); }, [load]);

  return { meses, rankingConsultores, funilComercial, distribuicaoStatusFin, loading, error, reload: load };
}
