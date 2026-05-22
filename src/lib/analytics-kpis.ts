/**
 * Camada de cálculo de KPIs gerenciais (Analytics Amplo + Privado).
 *
 * Não persiste estado. Recebe os dados operacionais já carregados
 * (contratos, obras, lançamentos, fixas) e produz métricas + classificações
 * + parecer executivo baseado nas faixas configuráveis em
 * `gerencial_parametros` (bands).
 */

import type { Lancamento } from "@/lib/financeiro-store";

// ============== Bands (faixas padrão) ===============
export type Bands = Record<string, number>;

export const DEFAULT_BANDS: Record<string, Bands> = {
  "ebitda.bands": { critico: 0, muito_ruim: 5, fraco: 10, aceitavel: 15, bom: 25 },
  "roi.bands": { critico: 0, ruim: 10, aceitavel: 20, bom: 40 },
  "payback.bands": { excelente: 6, bom: 12, aceitavel: 24, atencao: 36 },
  "roce.bands": { ruim: 5, aceitavel: 10, bom: 20 },
  "margem_liq.bands": { prejuizo: 0, ruim: 5, aceitavel: 10, boa: 20 },
  "alavancagem.bands": { excelente: 1, saudavel: 2, atencao: 3 },
  "cobertura.bands": { critico: 1, atencao: 1.5, saudavel: 2 },
  "conversao.bands": { ruim: 10, aceitavel: 20, boa: 35 },
  "inadimplencia.bands": { excelente: 3, saudavel: 5, atencao: 10 },
  "capacidade.vendedor.mes": { valor: 4 },
  "capacidade.equipe.modulos_mes": { valor: 300 },
};

export type Classificacao = {
  label: string;
  tone: "critico" | "ruim" | "atencao" | "ok" | "bom" | "excelente";
  cor: string;
};

const TONE_COR: Record<Classificacao["tone"], string> = {
  critico: "text-destructive",
  ruim: "text-destructive",
  atencao: "text-amber-600",
  ok: "text-foreground",
  bom: "text-success",
  excelente: "text-emerald-600",
};

function tone(label: string, t: Classificacao["tone"]): Classificacao {
  return { label, tone: t, cor: TONE_COR[t] };
}

// ============== Classificadores ===============
export function classMargemEbitda(pct: number, bands: Bands = DEFAULT_BANDS["ebitda.bands"]): Classificacao {
  if (pct < bands.critico) return tone("Crítico", "critico");
  if (pct < bands.muito_ruim) return tone("Muito ruim", "ruim");
  if (pct < bands.fraco) return tone("Fraco", "atencao");
  if (pct < bands.aceitavel) return tone("Aceitável", "ok");
  if (pct < bands.bom) return tone("Bom", "bom");
  return tone("Excelente", "excelente");
}
export function classROI(pct: number, bands: Bands = DEFAULT_BANDS["roi.bands"]): Classificacao {
  if (pct < bands.critico) return tone("Crítico", "critico");
  if (pct < bands.ruim) return tone("Ruim", "ruim");
  if (pct < bands.aceitavel) return tone("Aceitável", "ok");
  if (pct < bands.bom) return tone("Bom", "bom");
  return tone("Excelente", "excelente");
}
export function classPayback(meses: number, bands: Bands = DEFAULT_BANDS["payback.bands"]): Classificacao {
  if (meses <= bands.excelente) return tone("Excelente", "excelente");
  if (meses <= bands.bom) return tone("Bom", "bom");
  if (meses <= bands.aceitavel) return tone("Aceitável", "ok");
  if (meses <= bands.atencao) return tone("Atenção", "atencao");
  return tone("Crítico", "critico");
}
export function classROCE(pct: number, bands: Bands = DEFAULT_BANDS["roce.bands"]): Classificacao {
  if (pct < bands.ruim) return tone("Ruim", "ruim");
  if (pct < bands.aceitavel) return tone("Aceitável", "ok");
  if (pct < bands.bom) return tone("Bom", "bom");
  return tone("Excelente", "excelente");
}
export function classMargemLiquida(pct: number, bands: Bands = DEFAULT_BANDS["margem_liq.bands"]): Classificacao {
  if (pct < bands.prejuizo) return tone("Prejuízo", "critico");
  if (pct < bands.ruim) return tone("Ruim", "ruim");
  if (pct < bands.aceitavel) return tone("Aceitável", "ok");
  if (pct < bands.boa) return tone("Boa", "bom");
  return tone("Excelente", "excelente");
}
export function classAlavancagem(div_ebitda: number, bands: Bands = DEFAULT_BANDS["alavancagem.bands"]): Classificacao {
  if (div_ebitda < bands.excelente) return tone("Excelente", "excelente");
  if (div_ebitda < bands.saudavel) return tone("Saudável", "bom");
  if (div_ebitda < bands.atencao) return tone("Atenção", "atencao");
  return tone("Risco alto", "critico");
}
export function classCobertura(cobertura: number, bands: Bands = DEFAULT_BANDS["cobertura.bands"]): Classificacao {
  if (cobertura < bands.critico) return tone("Crítico", "critico");
  if (cobertura < bands.atencao) return tone("Atenção", "atencao");
  if (cobertura < bands.saudavel) return tone("Saudável", "bom");
  return tone("Confortável", "excelente");
}
export function classConversao(pct: number, bands: Bands = DEFAULT_BANDS["conversao.bands"]): Classificacao {
  if (pct < bands.ruim) return tone("Ruim", "ruim");
  if (pct < bands.aceitavel) return tone("Aceitável", "ok");
  if (pct < bands.boa) return tone("Boa", "bom");
  return tone("Excelente", "excelente");
}
export function classInadimplencia(pct: number, bands: Bands = DEFAULT_BANDS["inadimplencia.bands"]): Classificacao {
  if (pct < bands.excelente) return tone("Excelente", "excelente");
  if (pct < bands.saudavel) return tone("Saudável", "bom");
  if (pct < bands.atencao) return tone("Atenção", "atencao");
  return tone("Crítico", "critico");
}
export function classCapitalGiro(cg: number): Classificacao {
  if (cg < 0) return tone("Crítico", "critico");
  if (cg < 10000) return tone("Atenção", "atencao");
  if (cg < 100000) return tone("Saudável", "bom");
  return tone("Folgado", "excelente");
}

// ============== Cálculos núcleo ===============
export type EbitdaInput = {
  receitaOperacional: number;
  custosOperacionais: number;
  despesasOperacionais: number;
};
export function calcEbitda({ receitaOperacional, custosOperacionais, despesasOperacionais }: EbitdaInput) {
  const ebitda = receitaOperacional - custosOperacionais - despesasOperacionais;
  const margem = receitaOperacional > 0 ? (ebitda / receitaOperacional) * 100 : 0;
  return { ebitda, margem };
}

export function calcROI(lucro: number, investimento: number) {
  if (investimento <= 0) return 0;
  return ((lucro - investimento) / investimento) * 100;
}
export function calcPayback(investimento: number, ganhoMensalLiquido: number) {
  if (ganhoMensalLiquido <= 0) return Number.POSITIVE_INFINITY;
  return investimento / ganhoMensalLiquido;
}
export function calcROCE(lucroOperacional: number, capitalEmpregado: number) {
  if (capitalEmpregado <= 0) return 0;
  return (lucroOperacional / capitalEmpregado) * 100;
}
export function calcMargemLiquida(lucroLiquido: number, receita: number) {
  if (receita <= 0) return 0;
  return (lucroLiquido / receita) * 100;
}
export function calcAlavancagem(dividaTotal: number, ebitda: number) {
  if (ebitda <= 0) return Number.POSITIVE_INFINITY;
  return dividaTotal / ebitda;
}
export function calcCobertura(ebitda: number, parcelas: number) {
  if (parcelas <= 0) return Number.POSITIVE_INFINITY;
  return ebitda / parcelas;
}
export function calcCapitalGiro(ativoCirc: number, passivoCirc: number) {
  return ativoCirc - passivoCirc;
}
export function calcConversao(assinados: number, gerados: number) {
  if (gerados <= 0) return 0;
  return (assinados / gerados) * 100;
}
export function calcInadimplencia(vencido: number, totalReceber: number) {
  if (totalReceber <= 0) return 0;
  return (vencido / totalReceber) * 100;
}

// ============== Aggregator a partir de Lançamentos ===============
export function agregarFinanceiro(lancs: Lancamento[], fixasMensais: number) {
  const receitas = lancs
    .filter((l) => l.tipo === "Entrada" && (l.camada === "Realizado" || l.camada === "Confirmado"))
    .reduce((s, l) => s + l.valor, 0);

  const custosObras = lancs
    .filter((l) => !!l.obra && l.tipo === "Saída")
    .reduce((s, l) => s + l.valor, 0);

  const despAdmin = lancs
    .filter((l) => !l.obra && l.tipo === "Saída")
    .reduce((s, l) => s + l.valor, 0) + fixasMensais;

  return { receitas, custosObras, despAdmin };
}

// ============== Simulador de Financiamento ===============
export type SimFinInput = {
  valor: number;
  taxaMensal: number; // em %, ex: 1.49
  prazoMeses: number;
  carenciaMeses?: number;
};
export function simularFinanciamento({ valor, taxaMensal, prazoMeses, carenciaMeses = 0 }: SimFinInput) {
  const i = taxaMensal / 100;
  // Price (PMT) - simplificado, com carência apenas adiando início
  let parcela = 0;
  if (i === 0) parcela = valor / prazoMeses;
  else parcela = (valor * i) / (1 - Math.pow(1 + i, -prazoMeses));
  const custoTotal = parcela * prazoMeses;
  const juros = custoTotal - valor;
  return {
    parcela,
    custoTotal,
    juros,
    carenciaMeses,
    prazoMeses,
  };
}

// ============== Necessidade de vendedores / equipes ===============
export function necessidadeVendedores(demandaContratosMes: number, capacidadeContratosMes: number) {
  if (capacidadeContratosMes <= 0) return 0;
  return Math.ceil(demandaContratosMes / capacidadeContratosMes);
}
export function necessidadeEquipes(demandaModulosMes: number, capacidadeModulosMes: number) {
  if (capacidadeModulosMes <= 0) return 0;
  return Math.ceil(demandaModulosMes / capacidadeModulosMes);
}

// ============== Parecer Executivo (regras locais) ===============
export type Parecer = {
  codigo: string;
  titulo: string;
  mensagem: string;
  severidade: "info" | "atencao" | "critico" | "ok";
};

export function gerarParecer(metrics: {
  margemEbitda: number;
  alavancagem: number;
  cobertura: number;
  capitalGiro: number;
  inadimplencia: number;
  conversao: number;
}): Parecer[] {
  const out: Parecer[] = [];
  if (metrics.margemEbitda < 5) out.push({ codigo: "EBITDA_BAIXO", titulo: "Margem EBITDA crítica", mensagem: "A geração operacional está abaixo do mínimo saudável. Reveja preços, custos diretos e estrutura.", severidade: "critico" });
  else if (metrics.margemEbitda >= 15) out.push({ codigo: "EBITDA_OK", titulo: "EBITDA saudável para expansão", mensagem: "A operação gera caixa suficiente para sustentar crescimento moderado sem dependência exclusiva de capital de terceiros.", severidade: "ok" });

  if (metrics.alavancagem > 3) out.push({ codigo: "ALAVANCAGEM_ALTA", titulo: "Endividamento acima do ideal", mensagem: "Dívida/EBITDA acima de 3x. Novos financiamentos não recomendados nesse momento.", severidade: "critico" });
  if (metrics.cobertura < 1) out.push({ codigo: "COBERTURA_BAIXA", titulo: "Fluxo não cobre parcelas", mensagem: "EBITDA atual não cobre as parcelas financeiras. Renegociar prazos ou cortar despesas.", severidade: "critico" });

  if (metrics.capitalGiro < 0) out.push({ codigo: "CG_NEGATIVO", titulo: "Capital de giro negativo", mensagem: "Passivo circulante maior que ativo circulante. Risco de descumprimento de compromissos.", severidade: "critico" });

  if (metrics.inadimplencia > 10) out.push({ codigo: "INAD_ALTA", titulo: "Inadimplência crítica", mensagem: "Reforce cobrança e revise crédito concedido.", severidade: "critico" });
  if (metrics.conversao < 10) out.push({ codigo: "CONV_BAIXA", titulo: "Conversão comercial fraca", mensagem: "Conversão abaixo de 10% — avaliar qualificação de leads e treinamento da equipe.", severidade: "atencao" });

  if (out.length === 0) out.push({ codigo: "OK", titulo: "Indicadores dentro do esperado", mensagem: "Operação sem alertas críticos no momento.", severidade: "ok" });
  return out;
}

export const fmtPct = (v: number, casas = 1) =>
  Number.isFinite(v) ? `${v.toFixed(casas)}%` : "—";
export const fmtNum = (v: number, casas = 2) =>
  Number.isFinite(v) ? v.toFixed(casas) : "—";
export const fmtMeses = (v: number) =>
  Number.isFinite(v) ? `${v.toFixed(1)} meses` : "—";
