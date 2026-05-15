// ============================================================================
// Módulo de Propostas Fotovoltaicas — store reativo único (localStorage)
// Engloba cadastros auxiliares (cidades, concessionárias, módulos FV,
// inversores FV, distribuidores, parâmetros, custos) + propostas + helpers
// de cálculo (dimensionamento, precificação, custos sugeridos, margem).
// Padrão segue os demais stores do projeto: cache + listeners + write.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";
import { BASE_CIDADES, BASE_CONCESSIONARIAS } from "./base-real-cidades";

/* =============== Tipos =============== */

export type CidadeFV = {
  id: string;
  cidade: string;
  estado: string;
  concessionariaPadrao?: string;
  irradiacaoMedia: number;        // kWh/m².dia (média anual)
  mesMaiorIrradiacao?: string;
  mesMenorIrradiacao?: string;
  grupoTarifarioPadrao?: string;
  tarifaPadrao?: number;
  // Base local de irradiação solar (cidades_irradiacao)
  codigoIbge?: string;
  latitude?: number;
  longitude?: number;
  irradiacaoJaneiro?: number;
  irradiacaoFevereiro?: number;
  irradiacaoMarco?: number;
  irradiacaoAbril?: number;
  irradiacaoMaio?: number;
  irradiacaoJunho?: number;
  irradiacaoJulho?: number;
  irradiacaoAgosto?: number;
  irradiacaoSetembro?: number;
  irradiacaoOutubro?: number;
  irradiacaoNovembro?: number;
  irradiacaoDezembro?: number;
  irradiacaoMaxima?: number;
  irradiacaoMinima?: number;
  fonteDados?: string;
  dataUltimaAtualizacao?: string;
  ativo?: boolean;
};

/** Tarifa de energia oficial (tarifas_energia). */
export type TarifaEnergia = {
  id: string;
  concessionaria: string;
  uf: string;
  cidade?: string;
  grupoTarifario?: string;       // B1/B2/B3/A4...
  modalidadeTarifaria?: string;  // Convencional/Branca/Verde/Azul
  subgrupo?: string;
  tarifaKwh: number;
  dataUltimaAtualizacao?: string;
  ativo: boolean;
};

/** Histórico de atualizações da base de irradiação (historico_irradiacao). */
export type HistoricoIrradiacao = {
  id: string;
  cidade: string;
  uf: string;
  dataAtualizacao: string;
  fonteUsada?: string;
  valorAnterior?: number;
  valorNovo?: number;
  variacaoEncontrada?: number;
  usuarioResponsavel?: string;
  observacao?: string;
};

export type ConcessionariaFV = {
  id: string;
  nome: string;
  estado: string;
  tarifaPadrao?: number;
  taxaMinMonofasico?: number;     // kWh
  taxaMinBifasico?: number;
  taxaMinTrifasico?: number;
};

export type ModuloFV = {
  id: string;
  marca: string;
  modelo: string;
  potenciaWp: number;
  larguraM: number;
  alturaM: number;
  garantiaProduto?: number;       // anos
  garantiaPerformance?: number;   // anos
  ativo: boolean;
};

export type InversorFV = {
  id: string;
  marca: string;
  modelo: string;
  potenciaKw: number;
  tipo?: string;                  // String / Microinversor / Híbrido
  garantia?: number;
  ativo: boolean;
};

export type DistribuidorFV = {
  id: string;
  nome: string;
  telefone?: string;
  observacao?: string;
  ativo: boolean;
};

export type ParametroFV = {
  id: string;
  nome: string;
  valorPorKwp: number;
  tipoInstalacao?: string;        // RESIDENCIAL/COMERCIAL/...
  faixaInicio: number;            // kWp
  faixaFim: number;               // kWp
  ativo: boolean;
};

export type CustoFV = {
  id: string;
  nome: string;
  tipo: "MATERIAL" | "SERVICO" | "OUTRO";
  unidade: string;                // un, m, kWp, %, R$, módulo
  valorUnitario: number;
  regraCalculo?:
    | "fixo"
    | "por_modulo"
    | "x2_modulo"
    | "x35_modulo"
    | "div8_modulo"
    | "div4_modulo"
    | "x22_modulo"
    | "por_kwp"
    | "pct_valor"
    | "pct_lucro";
  fator?: number;                 // multiplicador adicional
  ativo: boolean;
};

/* =============== Proposta =============== */

export type ConsumoMensal = Partial<Record<
  "jan" | "fev" | "mar" | "abr" | "mai" | "jun" |
  "jul" | "ago" | "set" | "out" | "nov" | "dez", number
>>;

export type InversorEscolhido = { inversorId: string; quantidade: number };

export type LinhaCusto = {
  id: string;
  nome: string;
  tipo: "MATERIAL" | "SERVICO" | "OUTRO";
  qtdSugerida: number;
  qtdReal: number;
  valorUnit: number;
  total: number;
};

export type StatusProposta =
  | "RASCUNHO" | "GERADA" | "ENVIADA" | "APROVADA"
  | "RECUSADA" | "VENCIDA" | "CANCELADA";

export type PropostaFV = {
  id: string;                     // PR-YYYY-####
  numero: string;
  status: StatusProposta;
  criadoEm: string;
  atualizadoEm: string;
  criadoPor?: string;
  validade: string;               // ISO

  // 1. Cliente
  clienteId?: string;
  clienteNome: string;
  clienteDoc?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  clienteEndereco?: string;
  // Endereço estruturado (CEP + ViaCEP)
  clienteCep?: string;
  clienteRua?: string;
  clienteNumero?: string;
  clienteComplemento?: string;
  clienteBairro?: string;
  clienteCidade?: string;
  clienteUf?: string;
  consultor?: string;

  // 2. Localização
  cidadeId?: string;
  cidade: string;
  estado: string;
  concessionaria?: string;
  grupoTarifario?: string;
  modalidadeTarifaria?: string;
  subgrupo?: string;
  irradiacaoMedia: number;
  mesMaior?: string;
  mesMenor?: string;
  irradiacaoMaxima?: number;     // snapshot — congelado na proposta
  irradiacaoMinima?: number;     // snapshot — congelado na proposta
  fonteIrradiacao?: string;      // ex.: "BASE INTERNA / NASA POWER"

  // 3. Fatura
  tipoInstalacao: "RESIDENCIAL" | "COMERCIAL" | "INDUSTRIAL" | "RURAL";
  tipoTelhado: string;
  padraoEntrada: "MONOFÁSICO" | "BIFÁSICO" | "TRIFÁSICO";
  tarifa: number;                 // R$/kWh
  taxaIluminacao: number;         // R$
  contaMinimaKwh: number;
  contaMediaAtual: number;        // R$

  // 4. Consumo
  modoConsumo: "MEDIA" | "MENSAL";
  consumoMedio: number;           // kWh/mês
  consumoMensal?: ConsumoMensal;

  // 5. Dimensionamento
  taxaSimultaneidade: number;     // 0..1
  fatorPerformance: number;       // 0..1 (legado — mantido p/ compat)
  fro?: number;                   // 0..1 — Fator de Rendimento Operacional (corrige PVOUT do Atlas)
  geracaoDesejada: number;        // kWh/mês
  ajusteManualModulos?: boolean;
  modulosManual?: number;

  // 6. Módulo
  moduloId?: string;
  moduloMarca?: string;
  moduloModelo?: string;
  moduloPotenciaWp: number;
  moduloLarguraM: number;
  moduloAlturaM: number;
  modulosQtd: number;             // qtd final usada

  // 7. Inversores
  inversores: InversorEscolhido[];
  distribuidor?: string;
  valorKit: number;

  // 8. Precificação
  parametroPorKwp: number;
  descontoPct: number;
  descontoValor: number;
  valorFinalManual?: number;

  // 9. Composição de custos
  custos: LinhaCusto[];

  // 11. Observações
  obsInternas?: string;
  obsCliente?: string;

  // Auditoria leve
  historico?: { data: string; quem?: string; acao: string; detalhe?: string }[];

  // Integração
  contratoGeradoId?: string;
};

/* =============== Seeds =============== */

const SEED_CIDADES: CidadeFV[] = BASE_CIDADES;

const SEED_CONCESSIONARIAS: ConcessionariaFV[] = BASE_CONCESSIONARIAS;

const SEED_TARIFAS: TarifaEnergia[] = [
  { id: "TAR-EQGO-B1", concessionaria: "EQUATORIAL GOIÁS", uf: "GO", grupoTarifario: "B1", modalidadeTarifaria: "Convencional", tarifaKwh: 0.92, ativo: true, dataUltimaAtualizacao: new Date().toISOString().slice(0,10) },
  { id: "TAR-NEDF-B1", concessionaria: "NEOENERGIA DF",    uf: "DF", grupoTarifario: "B1", modalidadeTarifaria: "Convencional", tarifaKwh: 0.95, ativo: true, dataUltimaAtualizacao: new Date().toISOString().slice(0,10) },
];

const SEED_MODULOS: ModuloFV[] = [
  { id: "MOD-CS-620", marca: "CANADIAN", modelo: "TOPCON 620W", potenciaWp: 620, larguraM: 1.134, alturaM: 2.382, garantiaProduto: 12, garantiaPerformance: 30, ativo: true },
  { id: "MOD-JA-580", marca: "JA SOLAR", modelo: "DEEP BLUE 580W", potenciaWp: 580, larguraM: 1.134, alturaM: 2.278, garantiaProduto: 12, garantiaPerformance: 25, ativo: true },
  { id: "MOD-TR-555", marca: "TRINA", modelo: "VERTEX S+ 555W", potenciaWp: 555, larguraM: 1.096, alturaM: 2.279, garantiaProduto: 12, garantiaPerformance: 25, ativo: true },
];

const SEED_INVERSORES: InversorFV[] = [
  { id: "INV-GW-5K",  marca: "GROWATT",  modelo: "MIN 5000TL-X",  potenciaKw: 5,  tipo: "STRING", garantia: 10, ativo: true },
  { id: "INV-GW-8K",  marca: "GROWATT",  modelo: "MIN 8000TL-X",  potenciaKw: 8,  tipo: "STRING", garantia: 10, ativo: true },
  { id: "INV-GW-10K", marca: "GROWATT",  modelo: "MIN 10000TL-X", potenciaKw: 10, tipo: "STRING", garantia: 10, ativo: true },
  { id: "INV-DY-15K", marca: "DEYE",     modelo: "SUN 15K-G",     potenciaKw: 15, tipo: "STRING", garantia: 10, ativo: true },
  { id: "INV-SU-50K", marca: "SUNGROW",  modelo: "SG50CX",        potenciaKw: 50, tipo: "STRING", garantia: 10, ativo: true },
];

const SEED_DISTRIBUIDORES: DistribuidorFV[] = [
  { id: "DIS-EDS",  nome: "EDELTEC",     telefone: "(62) 3000-0000", ativo: true },
  { id: "DIS-SOL",  nome: "SOLFÁCIL",    telefone: "(11) 3000-0000", ativo: true },
  { id: "DIS-AUR",  nome: "AURORA SOLAR",telefone: "(62) 3000-0000", ativo: true },
];

const SEED_PARAMETROS: ParametroFV[] = [
  { id: "PRM-RES-S",  nome: "RESIDENCIAL ATÉ 10 KWP", valorPorKwp: 3200, tipoInstalacao: "RESIDENCIAL", faixaInicio: 0,    faixaFim: 10,   ativo: true },
  { id: "PRM-RES-M",  nome: "RESIDENCIAL 10–20 KWP",  valorPorKwp: 2800, tipoInstalacao: "RESIDENCIAL", faixaInicio: 10.01, faixaFim: 20,  ativo: true },
  { id: "PRM-COM-M",  nome: "COMERCIAL 20–75 KWP",    valorPorKwp: 2500, tipoInstalacao: "COMERCIAL",   faixaInicio: 20.01, faixaFim: 75,  ativo: true },
  { id: "PRM-COM-G",  nome: "COMERCIAL 75–150 KWP",   valorPorKwp: 2300, tipoInstalacao: "COMERCIAL",   faixaInicio: 75.01, faixaFim: 150, ativo: true },
  { id: "PRM-IND-G",  nome: "INDUSTRIAL > 150 KWP",   valorPorKwp: 2100, tipoInstalacao: "INDUSTRIAL",  faixaInicio: 150.01,faixaFim: 9999,ativo: true },
];

const SEED_CUSTOS: CustoFV[] = [
  { id: "CUS-CABO-PRT", nome: "CABO SOLAR PRETO",      tipo: "MATERIAL", unidade: "m",      valorUnitario: 9.5,  regraCalculo: "x35_modulo", ativo: true },
  { id: "CUS-CABO-VRM", nome: "CABO SOLAR VERMELHO",   tipo: "MATERIAL", unidade: "m",      valorUnitario: 9.5,  regraCalculo: "x35_modulo", ativo: true },
  { id: "CUS-MC4",      nome: "CONECTOR MC4 (PAR)",    tipo: "MATERIAL", unidade: "par",    valorUnitario: 25,   regraCalculo: "div8_modulo", ativo: true },
  { id: "CUS-INTER",    nome: "GRAMPO INTERMEDIÁRIO",  tipo: "MATERIAL", unidade: "un",     valorUnitario: 8,    regraCalculo: "x2_modulo",   ativo: true },
  { id: "CUS-FINAL",    nome: "GRAMPO FINAL",          tipo: "MATERIAL", unidade: "un",     valorUnitario: 9,    regraCalculo: "por_modulo",  ativo: true },
  { id: "CUS-HOOK",     nome: "HOOK / GANCHO",         tipo: "MATERIAL", unidade: "un",     valorUnitario: 12,   regraCalculo: "x2_modulo",   ativo: true },
  { id: "CUS-TRILHO",   nome: "TRILHO 4,2M",           tipo: "MATERIAL", unidade: "barra",  valorUnitario: 110,  regraCalculo: "por_modulo",  ativo: true },
  { id: "CUS-MINI",     nome: "MINITRILHO",            tipo: "MATERIAL", unidade: "un",     valorUnitario: 18,   regraCalculo: "x22_modulo",  ativo: true },
  { id: "CUS-SOLO",     nome: "ESTRUTURA SOLO",        tipo: "MATERIAL", unidade: "kit",    valorUnitario: 850,  regraCalculo: "div4_modulo", ativo: true },
  { id: "CUS-MO-INST",  nome: "MÃO DE OBRA INSTALAÇÃO",tipo: "SERVICO",  unidade: "kWp",    valorUnitario: 220,  regraCalculo: "por_kwp",     ativo: true },
  { id: "CUS-FRETE",    nome: "FRETE",                 tipo: "SERVICO",  unidade: "fixo",   valorUnitario: 600,  regraCalculo: "fixo",        ativo: true },
  { id: "CUS-ART",      nome: "ART/TRT + ENGENHARIA",  tipo: "SERVICO",  unidade: "fixo",   valorUnitario: 450,  regraCalculo: "fixo",        ativo: true },
  { id: "CUS-COM-VEND", nome: "COMISSÃO VENDEDOR",     tipo: "OUTRO",    unidade: "%",      valorUnitario: 3,    regraCalculo: "pct_valor",   ativo: true },
  { id: "CUS-COM-GER",  nome: "COMISSÃO GERENTE",      tipo: "OUTRO",    unidade: "%",      valorUnitario: 1,    regraCalculo: "pct_valor",   ativo: true },
  { id: "CUS-RISCO",    nome: "RISCO DA OPERAÇÃO",     tipo: "OUTRO",    unidade: "%",      valorUnitario: 2,    regraCalculo: "pct_valor",   ativo: true },
];

/* =============== Genérico p/ stores =============== */

function makeStore<T>(key: string, seed: () => T[]) {
  const listeners = new Set<() => void>();
  let cache: T[] | null = null;
  function read(): T[] {
    if (cache) return cache;
    if (typeof window === "undefined") { cache = seed(); return cache; }
    try {
      const raw = localStorage.getItem(key);
      if (raw) { cache = JSON.parse(raw); return cache!; }
    } catch {}
    cache = seed();
    try { localStorage.setItem(key, JSON.stringify(cache)); } catch {}
    return cache;
  }
  function write(next: T[]) {
    cache = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    listeners.forEach((l) => l());
  }
  function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
  function getSnap() { return read(); }
  function getServerSnap() { return seed(); }
  function useList(): T[] {
    const list = useSyncExternalStore(subscribe, getSnap, getServerSnap);
    useEffect(() => { read(); }, []);
    return list;
  }
  return { read, write, useList };
}

const cidadesS = makeStore<CidadeFV>("ms.fv.cidades.v3", () => SEED_CIDADES);
const concsS   = makeStore<ConcessionariaFV>("ms.fv.concs.v3", () => SEED_CONCESSIONARIAS);
const modsS    = makeStore<ModuloFV>("ms.fv.modulos.v1", () => SEED_MODULOS);
const invsS    = makeStore<InversorFV>("ms.fv.inversores.v1", () => SEED_INVERSORES);
const distsS   = makeStore<DistribuidorFV>("ms.fv.distribs.v1", () => SEED_DISTRIBUIDORES);
const paramsS  = makeStore<ParametroFV>("ms.fv.params.v1", () => SEED_PARAMETROS);
const custosS  = makeStore<CustoFV>("ms.fv.custos.v1", () => SEED_CUSTOS);
const propsS   = makeStore<PropostaFV>("ms.fv.propostas.v1", () => []);
const tarifasS = makeStore<TarifaEnergia>("ms.fv.tarifas.v1", () => SEED_TARIFAS);
const histIrrS = makeStore<HistoricoIrradiacao>("ms.fv.hist_irradiacao.v1", () => []);

export const useCidadesFV       = cidadesS.useList;
export const useConcessionarias = concsS.useList;
export const useModulosFV       = modsS.useList;
export const useInversoresFV    = invsS.useList;
export const useDistribuidoresFV= distsS.useList;
export const useParametrosFV    = paramsS.useList;
export const useCustosFV        = custosS.useList;
export const usePropostas       = propsS.useList;
export const useTarifasEnergia  = tarifasS.useList;
export const useHistoricoIrradiacao = histIrrS.useList;

/* CRUD genérico ----------------------------------------------------------- */

function upsertOf<T extends { id: string }>(store: { read: () => T[]; write: (n: T[]) => void }) {
  return (item: T) => {
    const cur = store.read();
    const idx = cur.findIndex((x) => x.id === item.id);
    if (idx >= 0) { const n = [...cur]; n[idx] = item; store.write(n); }
    else store.write([item, ...cur]);
  };
}
function removeOf<T extends { id: string }>(store: { read: () => T[]; write: (n: T[]) => void }) {
  return (id: string) => store.write(store.read().filter((x) => x.id !== id));
}

export const upsertCidadeFV         = upsertOf(cidadesS);
export const removeCidadeFV         = removeOf(cidadesS);
export const upsertConcessionariaFV = upsertOf(concsS);
export const removeConcessionariaFV = removeOf(concsS);
export const upsertModuloFV         = upsertOf(modsS);
export const removeModuloFV         = removeOf(modsS);
export const upsertInversorFV       = upsertOf(invsS);
export const removeInversorFV       = removeOf(invsS);
export const upsertDistribuidorFV   = upsertOf(distsS);
export const removeDistribuidorFV   = removeOf(distsS);
export const upsertParametroFV      = upsertOf(paramsS);
export const removeParametroFV      = removeOf(paramsS);
export const upsertCustoFV          = upsertOf(custosS);
export const removeCustoFV          = removeOf(custosS);
export const upsertProposta         = upsertOf(propsS);
export const removeProposta         = removeOf(propsS);
export const upsertTarifaEnergia    = upsertOf(tarifasS);
export const removeTarifaEnergia    = removeOf(tarifasS);
export const addHistoricoIrradiacao = (h: HistoricoIrradiacao) => upsertOf(histIrrS)(h);

/* =============== Última cidade selecionada (preferência local) =============== */

const LAST_CIDADE_KEY = "ms.fv.lastCidadeId.v1";
export function getLastCidadeId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(LAST_CIDADE_KEY); } catch { return null; }
}
export function setLastCidadeId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(LAST_CIDADE_KEY, id);
    else localStorage.removeItem(LAST_CIDADE_KEY);
  } catch {}
}

/* =============== Lookup de tarifa =============== */

/** Procura tarifa oficial mais específica para uma combinação concessionária/uf/grupo/cidade. */
export function buscarTarifa(
  lista: TarifaEnergia[],
  filtro: { concessionaria?: string; uf?: string; cidade?: string; grupo?: string; modalidade?: string },
): TarifaEnergia | undefined {
  const ativos = lista.filter((t) => t.ativo);
  const score = (t: TarifaEnergia) => {
    let s = 0;
    if (filtro.concessionaria && t.concessionaria?.toUpperCase() === filtro.concessionaria.toUpperCase()) s += 8;
    if (filtro.uf && t.uf?.toUpperCase() === filtro.uf.toUpperCase()) s += 4;
    if (filtro.cidade && t.cidade?.toUpperCase() === filtro.cidade.toUpperCase()) s += 4;
    if (filtro.grupo && t.grupoTarifario === filtro.grupo) s += 2;
    if (filtro.modalidade && t.modalidadeTarifaria === filtro.modalidade) s += 1;
    return s;
  };
  const ranked = ativos
    .map((t) => ({ t, s: score(t) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.t;
}

/* =============== Helpers de cálculo =============== */

export const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
export const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtNum = (v: number, d = 2) =>
  (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Soma do consumo mês a mês (12 meses). */
export function somaMensal(m?: ConsumoMensal): number {
  if (!m) return 0;
  return Object.values(m).reduce((s, v) => s + (Number(v) || 0), 0);
}

/** Consumo médio efetivo segundo o modo escolhido. */
export function consumoEfetivo(p: Pick<PropostaFV, "modoConsumo" | "consumoMedio" | "consumoMensal">): number {
  if (p.modoConsumo === "MENSAL") {
    const total = somaMensal(p.consumoMensal);
    return total > 0 ? total / 12 : 0;
  }
  return p.consumoMedio || 0;
}

/** Resultado completo do dimensionamento.
 *  Fórmula:
 *    Parâmetro de irradiação (BASE REAL, kWh/kWp/mês) = produtividade real corrigida
 *    Consumo desejado ÷ produtividade real corrigida = kWp necessário
 *    kWp necessário ÷ potência do módulo (kW) = quantidade de módulos (arredondar p/ cima)
 */
export function calcDimensionamento(p: PropostaFV) {
  const consumo = consumoEfetivo(p);
  const simult = Math.min(Math.max(p.taxaSimultaneidade || 0, 0), 1);
  const fro = Math.min(Math.max((p.fro ?? p.fatorPerformance ?? 0.75) || 0.75, 0.1), 1);

  // Parâmetro de irradiação vem da BASE REAL (kWh/kWp/mês), já corrigido por FRO da fonte.
  const produtividadeReal = Math.max(p.irradiacaoMedia || 0, 0.1);
  // Mantido por compat. com telas legadas; não é mais usado no cálculo principal.
  const pvoutMensal = produtividadeReal;

  const consumoInstantaneo = consumo * simult;
  const geracaoInjetada = Math.max(0, consumo - consumoInstantaneo);
  const geracaoDesejada = p.geracaoDesejada > 0 ? p.geracaoDesejada : consumo;

  // kWp necessário a partir da produtividade real corrigida.
  const potenciaNecKwp = produtividadeReal > 0 ? geracaoDesejada / produtividadeReal : 0;
  const potModW = p.moduloPotenciaWp || 0;
  const potModKw = potModW / 1000;
  const qtdCalc = potModKw > 0 ? Math.ceil(potenciaNecKwp / potModKw) : 0;
  const qtdFinal = p.ajusteManualModulos && p.modulosManual ? p.modulosManual : qtdCalc;
  const potenciaFinalKwp = qtdFinal * potModKw;

  const areaPorModulo = (p.moduloLarguraM || 0) * (p.moduloAlturaM || 0);
  const areaTotal = areaPorModulo * qtdFinal;

  // geração estimada usando potência final × produtividade real corrigida
  const geracaoMensalKwh = potenciaFinalKwp * produtividadeReal;
  const geracaoAnualKwh = geracaoMensalKwh * 12;

  return {
    consumoMedio: consumo,
    consumoInstantaneo,
    geracaoInjetada,
    geracaoDesejada,
    pvoutMensal,
    fro,
    produtividadeReal,
    potenciaNecKwp,
    qtdCalc,
    qtdFinal,
    potenciaFinalKwp,
    areaPorModulo,
    areaTotal,
    geracaoMensalKwh,
    geracaoAnualKwh,
  };
}

/** Soma da potência dos inversores escolhidos (kW). */
export function potenciaInversores(p: PropostaFV, listaInversores: InversorFV[]): number {
  return p.inversores.reduce((s, e) => {
    const inv = listaInversores.find((i) => i.id === e.inversorId);
    return s + (inv ? inv.potenciaKw * (e.quantidade || 0) : 0);
  }, 0);
}

/** Sugere parâmetro com base na faixa de potência + tipo. */
export function sugerirParametro(potKwp: number, tipo: string, lista: ParametroFV[]): ParametroFV | undefined {
  return lista
    .filter((p) => p.ativo)
    .filter((p) => !p.tipoInstalacao || p.tipoInstalacao === tipo)
    .find((p) => potKwp >= p.faixaInicio && potKwp <= p.faixaFim);
}

/** Precificação. */
export function calcPrecificacao(p: PropostaFV) {
  const dim = calcDimensionamento(p);
  const valorBruto = dim.potenciaFinalKwp * (p.parametroPorKwp || 0);
  let valorComDesc = valorBruto;
  if (p.descontoValor && p.descontoValor > 0) valorComDesc -= p.descontoValor;
  if (p.descontoPct && p.descontoPct > 0) valorComDesc -= (valorBruto * p.descontoPct) / 100;
  const valorFinal = p.valorFinalManual && p.valorFinalManual > 0 ? p.valorFinalManual : Math.max(0, valorComDesc);
  const parametroReal = dim.potenciaFinalKwp > 0 ? valorFinal / dim.potenciaFinalKwp : 0;
  return { valorBruto, valorFinal, parametroReal };
}

/** Quantidade sugerida segundo regra de cálculo do custo. */
export function qtdSugeridaCusto(c: Pick<CustoFV, "regraCalculo" | "fator">, ctx: { modulos: number; kwp: number }): number {
  const m = ctx.modulos || 0;
  switch (c.regraCalculo) {
    case "por_modulo":  return m;
    case "x2_modulo":   return m * 2;
    case "x35_modulo":  return m * 3.5;
    case "x22_modulo":  return m * 2.2;
    case "div8_modulo": return Math.ceil(m / 8);
    case "div4_modulo": return Math.ceil(m / 4);
    case "por_kwp":     return ctx.kwp;
    case "fixo":        return 1;
    case "pct_valor":
    case "pct_lucro":   return 1; // tratado de forma especial
    default:            return 1;
  }
}

/** Gera linhas de custo sugeridas. */
export function gerarCustosSugeridos(p: PropostaFV, custosBase: CustoFV[]): LinhaCusto[] {
  const dim = calcDimensionamento(p);
  return custosBase.filter((c) => c.ativo).map((c) => {
    const qtd = qtdSugeridaCusto(c, { modulos: dim.qtdFinal, kwp: dim.potenciaFinalKwp });
    return {
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      qtdSugerida: qtd,
      qtdReal: qtd,
      valorUnit: c.valorUnitario,
      total: round2(qtd * c.valorUnitario),
    };
  });
}

/** Resultado / margem. */
export function calcResultado(p: PropostaFV) {
  const { valorFinal } = calcPrecificacao(p);
  const dim = calcDimensionamento(p);
  // custos percentuais (comissão, risco) baseiam-se no valorFinal
  // custos com regra pct_valor recebem total = valorUnit% * valorFinal
  // Mas como o usuário pode editar custos manualmente, respeitamos os totais já gravados.
  const custoTotal = p.custos.reduce((s, l) => s + (Number(l.total) || 0), 0);
  const lucroBruto = valorFinal - custoTotal;
  const margemPct = valorFinal > 0 ? (lucroBruto / valorFinal) * 100 : 0;
  const custoPorKwp = dim.potenciaFinalKwp > 0 ? custoTotal / dim.potenciaFinalKwp : 0;
  const resultadoPorKwp = dim.potenciaFinalKwp > 0 ? lucroBruto / dim.potenciaFinalKwp : 0;
  return { valorFinal, custoTotal, lucroBruto, margemPct, custoPorKwp, resultadoPorKwp };
}

/** Gera próximo número de proposta no padrão "PROPOSTA NNN/YYYY". */
export function proximoNumeroProposta(lista: PropostaFV[]): string {
  const ano = new Date().getFullYear();
  const reNovo = new RegExp(`^PROPOSTA\\s+(\\d+)\\/${ano}$`, "i");
  const reAntigo = new RegExp(`^PR-${ano}-(\\d+)$`);
  const seqs = lista
    .map((p) => {
      const n = (p.numero || "").trim();
      const m1 = n.match(reNovo); if (m1) return parseInt(m1[1], 10);
      const m2 = n.match(reAntigo); if (m2) return parseInt(m2[1], 10);
      return NaN;
    })
    .filter((n) => !isNaN(n));
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `PROPOSTA ${String(next).padStart(3, "0")}/${ano}`;
}

/** Cria objeto de proposta vazio com defaults sensatos. */
export function novaPropostaVazia(numero: string): PropostaFV {
  const hoje = new Date().toISOString().slice(0, 10);
  const validade = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  return {
    id: `PRID-${Date.now()}`,
    numero,
    status: "RASCUNHO",
    criadoEm: hoje,
    atualizadoEm: hoje,
    validade,
    clienteNome: "", cidade: "", estado: "",
    irradiacaoMedia: 5.4,
    tipoInstalacao: "RESIDENCIAL",
    tipoTelhado: "CERÂMICO",
    padraoEntrada: "BIFÁSICO",
    tarifa: 0.92,
    taxaIluminacao: 0,
    contaMinimaKwh: 50,
    contaMediaAtual: 0,
    modoConsumo: "MEDIA",
    consumoMedio: 0,
    taxaSimultaneidade: 0.3,
    fatorPerformance: 0.75,
    fro: 0.75,
    geracaoDesejada: 0,
    moduloPotenciaWp: 620,
    moduloLarguraM: 1.134,
    moduloAlturaM: 2.382,
    modulosQtd: 0,
    inversores: [],
    valorKit: 0,
    parametroPorKwp: 2800,
    descontoPct: 0,
    descontoValor: 0,
    custos: [],
    historico: [],
  };
}

/** Validações antes de gerar/aprovar. */
export function validarParaGeracao(p: PropostaFV): string[] {
  const e: string[] = [];
  if (!p.clienteNome?.trim()) e.push("Cliente");
  if (!p.cidade?.trim()) e.push("Cidade");
  if (!consumoEfetivo(p)) e.push("Consumo médio ou mensal");
  if (!p.moduloPotenciaWp) e.push("Módulo selecionado");
  const dim = calcDimensionamento(p);
  if (!dim.qtdFinal) e.push("Quantidade de módulos");
  if (!dim.potenciaFinalKwp) e.push("Potência final");
  const { valorFinal } = calcPrecificacao(p);
  if (!valorFinal) e.push("Valor da proposta");
  if (!p.validade) e.push("Validade");
  if (!p.inversores.length) e.push("Pelo menos 1 inversor");
  return e;
}
