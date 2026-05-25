// ============================================================================
// Fluxo de caixa: Caixa Real (baixas confirmadas) vs Caixa Previsto
// (baixas + saldos abertos projetados pelo vencimento).
// Curva acumulada estilo banco — entradas (AR) somam, saídas (AP) subtraem.
// ============================================================================
import { useMemo } from "react";
import { useTitulos, type Titulo } from "@/lib/fin-titulos-store";

export type FluxoPonto = {
  dia: string;                  // YYYY-MM-DD
  diaLabel: string;             // DD/MM/AAAA
  entradaReal: number;
  saidaReal: number;
  entradaPrevista: number;
  saidaPrevista: number;
  diffReal: number;             // entradaReal - saidaReal
  diffPrevisto: number;         // entradaPrevista - saidaPrevista
  caixaReal: number;            // acumulado
  caixaPrevisto: number;        // acumulado
};

export type UseFluxoArgs = {
  dataInicio: string;   // YYYY-MM-DD
  dataFim: string;      // YYYY-MM-DD
  contaId?: string;     // filtro opcional (texto livre — match contaFinanceira)
  saldoInicial?: number;
};

function diasEntre(ini: string, fim: string): string[] {
  const dias: string[] = [];
  const d = new Date(ini + "T00:00:00");
  const end = new Date(fim + "T00:00:00");
  while (d <= end) {
    dias.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

function fmtBR(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

export function calcularFluxo(titulos: Titulo[], args: UseFluxoArgs): FluxoPonto[] {
  const { dataInicio, dataFim, contaId, saldoInicial = 0 } = args;
  const dias = diasEntre(dataInicio, dataFim);
  const map = new Map<string, FluxoPonto>();
  dias.forEach((d) => {
    map.set(d, {
      dia: d, diaLabel: fmtBR(d),
      entradaReal: 0, saidaReal: 0,
      entradaPrevista: 0, saidaPrevista: 0,
      diffReal: 0, diffPrevisto: 0,
      caixaReal: 0, caixaPrevisto: 0,
    });
  });

  const matchConta = (v?: string) => !contaId || (v ?? "").toLowerCase().includes(contaId.toLowerCase());

  titulos.forEach((t) => {
    if (t.status === "cancelado") return;
    // REAL: movimentos efetivamente registrados
    t.movimentos.forEach((m) => {
      if (m.estornado) return;
      if (!map.has(m.data)) return;
      if (!matchConta(m.contaFinanceira ?? t.contaFinanceira)) return;
      const b = map.get(m.data)!;
      if (t.tipo === "AR") b.entradaReal += m.valor;
      else b.saidaReal += m.valor;
    });

    // PREVISTO: saldo aberto projetado pelo vencimento + também conta o realizado já ocorrido
    if (matchConta(t.contaFinanceira)) {
      const venc = t.vencimentoReal ?? t.vencimento;
      if (t.saldo > 0.001 && map.has(venc)) {
        const b = map.get(venc)!;
        if (t.tipo === "AR") b.entradaPrevista += t.saldo;
        else b.saidaPrevista += t.saldo;
      }
    }
  });

  // Previsto inclui o realizado também — caixa previsto é a melhor estimativa
  let accReal = saldoInicial;
  let accPrev = saldoInicial;
  const out: FluxoPonto[] = [];
  for (const d of dias) {
    const b = map.get(d)!;
    b.diffReal = Math.round((b.entradaReal - b.saidaReal) * 100) / 100;
    b.entradaPrevista += b.entradaReal;
    b.saidaPrevista += b.saidaReal;
    b.diffPrevisto = Math.round((b.entradaPrevista - b.saidaPrevista) * 100) / 100;
    accReal += b.diffReal;
    accPrev += b.diffPrevisto;
    b.caixaReal = Math.round(accReal * 100) / 100;
    b.caixaPrevisto = Math.round(accPrev * 100) / 100;
    out.push(b);
  }
  return out;
}

export function useFluxoCaixa(args: UseFluxoArgs): FluxoPonto[] {
  const titulos = useTitulos();
  return useMemo(() => calcularFluxo(titulos, args), [titulos, args.dataInicio, args.dataFim, args.contaId, args.saldoInicial]);
}
