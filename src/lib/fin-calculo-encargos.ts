// ============================================================================
// Cálculo canônico de encargos sobre títulos em atraso.
// Usado pela simulação de renegociação e (futuramente) pela baixa atrasada.
// ============================================================================
import type { Titulo } from "@/lib/fin-titulos-store";
import type { ParametrosFinanceiros } from "@/lib/fin-parametros-financeiros-store";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type EncargosCalculados = {
  diasAtraso: number;
  diasCobraveis: number;       // após carência
  jurosSugerido: number;
  multaSugerida: number;
  saldoOriginal: number;
  valorComEncargos: number;    // saldo + juros + multa
};

function parseISO(d: string): Date {
  // YYYY-MM-DD ou ISO completo
  if (d.length === 10) {
    const [y, m, dd] = d.split("-").map(Number);
    return new Date(y, m - 1, dd);
  }
  return new Date(d);
}

function diasEntre(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86400000);
}

export function calcularEncargos(
  titulo: Pick<Titulo, "saldo" | "valorOriginal" | "vencimento" | "status">,
  dataRefISO: string,
  p: ParametrosFinanceiros,
): EncargosCalculados {
  const saldo = round2(titulo.saldo ?? titulo.valorOriginal);
  const venc = parseISO(titulo.vencimento);
  const ref = parseISO(dataRefISO);
  const diasAtraso = Math.max(0, diasEntre(venc, ref));

  const diasCobraveis = Math.max(0, diasAtraso - (p.carenciaDias ?? 0));

  // Juros
  let jurosSugerido = 0;
  if (diasCobraveis > 0 && saldo > 0) {
    if (p.jurosTipo === "percentual") {
      const taxaDia = p.jurosModo === "diario"
        ? p.jurosValor / 100
        : (p.jurosValor / 100) / 30;
      jurosSugerido = saldo * taxaDia * diasCobraveis;
    } else {
      const porDia = p.jurosModo === "diario" ? p.jurosValor : p.jurosValor / 30;
      jurosSugerido = porDia * diasCobraveis;
    }
  }

  // Multa
  let multaSugerida = 0;
  if (diasAtraso > (p.toleranciaAtrasoDias ?? 0) && saldo > 0) {
    multaSugerida = p.multaTipo === "percentual"
      ? saldo * (p.multaValor / 100)
      : p.multaValor;
  }

  jurosSugerido = round2(jurosSugerido);
  multaSugerida = round2(multaSugerida);

  return {
    diasAtraso,
    diasCobraveis,
    jurosSugerido,
    multaSugerida,
    saldoOriginal: saldo,
    valorComEncargos: round2(saldo + jurosSugerido + multaSugerida),
  };
}

export function nivelAprovacaoDesconto(
  descontoPct: number,
  p: ParametrosFinanceiros,
): "auto" | "financeiro" | "diretoria" {
  if (descontoPct <= 0) return "auto";
  if (descontoPct <= p.limiteDescontoSemAprovacao) return "auto";
  if (descontoPct <= p.limiteDescontoDiretoria) return "financeiro";
  return "diretoria";
}
