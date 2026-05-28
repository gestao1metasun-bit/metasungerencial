#!/usr/bin/env bun
/**
 * D15.1.a.0.ii — Dry-Run Enterprise (comparador read-only) — v2 AMPLIADO
 * ----------------------------------------------------------------------------
 * Consome o snapshot canônico LS (gerado por scripts/d15-snapshot-export.js v2)
 * e produz relatório enterprise de migrabilidade contra o esquema oficial
 * Supabase, COM PARIDADE POR DOMÍNIO.
 *
 * Cobre 10 domínios (alinhado ao snapshot v2 ampliado):
 *   1. Financeiro (Onda 1.A/1.B/1.C)
 *   2. Lançamentos derivados (Onda 1.A)
 *   3. Auditoria (Onda 5)
 *   4. Comercial — contratos, propostas, leads, aditivos (Onda 3)
 *   5. Clientes (Onda 2 + 3)
 *   6. Cadastros — consultores/gerentes/equipes/bancos/perfis/usuários (Onda 2)
 *   7. Estoque (futura)
 *   8. Engenharia/Obras (futura)
 *   9. Pós-venda (futura)
 *  10. FV / UI (diagnóstico)
 *
 * GARANTIAS:
 *   - Read-only sobre o snapshot (apenas parse).
 *   - NÃO acessa Supabase em runtime (baselines já capturadas).
 *   - NÃO escreve em LS / tabelas / storage.
 *   - NÃO altera UI nem executa RPCs transacionais.
 *
 * USO:
 *   bun run scripts/d15-dry-run-compare.ts docs/d15-1-a-0-ii-snapshot-<arq>.json
 *
 * SAÍDA:
 *   - docs/d15-1-a-0-ii-dry-run-report-{YYYYMMDD-HHmm}.md      (humano)
 *   - docs/d15-1-a-0-ii-dry-run-detail-{YYYYMMDD-HHmm}.json    (máquina)
 *   - exit 0 se readiness ≥ 95% e zero bloqueantes; senão 1
 *
 * Spec: docs/d15-1-a-0-ii-dry-run-spec.md
 * Checklist Passo 4: docs/d15-1-a-0-ii-passo4-checklist.md
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// ============================================================================
// Tipos e categorias canônicas
// ============================================================================

type Categoria =
  // Genéricas
  | 'OK' | 'CONVERTIDO' | 'DIVERGENTE' | 'ORFAO' | 'INCOMPATIVEL' | 'DUPLICIDADE'
  | 'STATUS_INVALIDO' | 'NATUREZA_INVALIDA' | 'CENTRO_RESULTADO_INVALIDO'
  | 'ANEXO_QUEBRADO' | 'VINCULO_AUSENTE' | 'SEM_DESTINO' | 'TRUNCADO'
  | 'INVALIDO' | 'PERDA_POTENCIAL' | 'SALDO_DIVERGENTE'
  | 'RENEGOCIACAO_INCONSISTENTE'
  // Camada 4 — Lançamentos
  | 'CONVERTIVEL_TITULO_RECEBER' | 'CONVERTIVEL_TITULO_PAGAR'
  | 'CONVERTIVEL_MOVIMENTACAO_REALIZADA' | 'CONVERTIVEL_MOVIMENTACAO_PREVISTA'
  | 'CONVERTIVEL_RECORRENTE' | 'LANCAMENTO_SEM_TITULO'
  | 'DATA_INVALIDA' | 'VALOR_INVALIDO' | 'OBRA_INVALIDA' | 'DUPLICIDADE_POTENCIAL'
  // Camada 5 — Auditoria (Onda 5)
  | 'AUDIT_EVENTO_SEM_ENTIDADE' | 'AUDIT_EVENTO_SEM_ACAO'
  | 'AUDIT_EVENTO_SEM_TIMESTAMP' | 'AUDIT_EVENTO_SEM_ATOR'
  // Camada 6 — Comercial (Onda 3)
  | 'CONTRATO_SEM_CLIENTE' | 'CONTRATO_SEM_VALOR' | 'CONTRATO_DUPLICADO'
  | 'PROPOSTA_SEM_CLIENTE' | 'PROPOSTA_ORFA'
  | 'LEAD_SEM_COLUNA' | 'LEAD_DUPLICADO'
  | 'ADITIVO_ORFAO'
  // Cliente (Onda 2/3)
  | 'CLIENTE_DUPLICADO' | 'CLIENTE_SEM_DOCUMENTO'
  // Cadastros (Onda 2)
  | 'CADASTRO_DUPLICADO' | 'CADASTRO_INCOMPLETO'
  // Estoque
  | 'ESTOQUE_ITEM_SEM_CODIGO' | 'ESTOQUE_MOV_ORFA' | 'ESTOQUE_SALDO_NEGATIVO'
  // Engenharia/Obras
  | 'OBRA_SEM_CONTRATO' | 'OBRA_STATUS_INVALIDO'
  // Pós-venda
  | 'POSVENDA_SEM_TIPO' | 'POSVENDA_ORFAO';

interface Finding {
  store: string;
  dominio: string;
  ref_id: string | number;
  categoria: Categoria;
  detalhe: string;
}

interface DominioResumo {
  total_chaves_esperadas: number;
  chaves_presentes: number;
  chaves_ausentes: string[];
  total_registros: number;
  bytes: number;
  findings_count: number;
  bloqueantes: number;
  ajustaveis: number;
  ok: number;
}

// ============================================================================
// Catálogo de chaves por domínio (espelha snapshot v2)
// ============================================================================

const CHAVES_POR_DOMINIO = {
  financeiro: [
    'fin-titulos', 'fin-renegociacao', 'fin-estornos', 'fin-adiantamentos',
    'fin-compras', 'fin-conciliacao',
    'ms.fin.titulos.v1', 'ms.fin.renegociacoes.v1', 'ms.fin.rescisoes.v1',
    'ms.fin.adiantamentos.v1', 'ms.fin.compras.v1', 'ms.fin.conciliacao.v1',
    'ms.fin.fornecedores.v1', 'ms.fin.pendencias.v1',
    'ms.fin.fechamentos.v1', 'ms.fin.fechamentos.v2',
    'ms.fin.contas.v1', 'ms.fin.contas.v2', 'ms.fin.centros.v2',
    'ms.fin.naturezas.v2', 'ms.fin.grupos.v1', 'ms.fin.subgrupos.v1',
    'ms.fin.meios.v1', 'ms.fin.tipos-aplicacao.v1', 'ms.fin.parametros.v1',
    'fin-parametros',
    'metasun.fin.lancamentos.v1', 'metasun.fin.recorrentes.v1',
    'metasun.fin.centros.v1', 'metasun.fin.naturezas.v1',
  ],
  auditoria: ['ms.audit.v1'],
  comercial_contratos: [
    'ms.contratos.v2', 'ms.contratos.lastSync', 'contrato-base-overrides-v1',
    'ms.aditivos.v1',
    'ms.fv.propostas.v1', 'ms.fv.proposta_config.v1',
    'ms.fv.kanban.cols.v5', 'ms.fv.kanban.assign-leads.v1',
    'ms.clientes.full.v1', 'ms.clientes.extra.v1',
  ],
  engenharia_obras: [
    'ms.engenharia.obras.kanban', 'ms.engenharia.obras.snapshot.v1',
    'ms.obras.finalizacao.v1',
  ],
  estoque: [
    'ms.estoque.itens.v1', 'ms.estoque.mov.v1', 'ms.estoque.log.v1',
    'ms.estoque.necessidades.v1', 'ms.estoque.compras.transito.v1',
  ],
  posvenda: [
    'ms.posvenda.chamados.v1', 'ms.posvenda.tipos.v1',
    'ms.posvenda.gatilhos.v1', 'ms.posvenda.seq.v1',
  ],
  cadastros_identidade: [
    'ms.consultores.v1', 'ms.gerentes.v1', 'ms.equipes.v1', 'ms.bancos.v1',
    'ms.perfis.v1', 'ms.usuarios.v1', 'ms.usuarioAtual.v1',
  ],
  engenharia_fv: [
    'ms.fv.params.v1', 'ms.fv.modulos.v1', 'ms.fv.inversores.v2',
    'ms.fv.tarifas.v1', 'ms.fv.hist_irradiacao.v1', 'ms.fv.cidades.v3',
    'ms.fv.concs.v3', 'ms.fv.distribs.v1', 'ms.fv.custos.v1',
    'ms.fv.origens-captacao.v1',
  ],
  ui_preferencias: [
    'ms.fv.propostas.view', 'ms.fv.propostas.tabela.hidden.v2',
    'ms.fv.propostas.tabela.order.v2', 'ms.fv.propostas.tabela.widths.v2',
  ],
} as const;

const STATUS_OFICIAL_TITULO = new Set(['ABERTO', 'PARCIAL', 'PAGO', 'VENCIDO', 'CANCELADO', 'RENEGOCIADO']);
const TIPO_OFICIAL_TITULO = new Set(['RECEBER', 'PAGAR']);

const STATUS_OBRA_ENUM = new Set([
  'PLANEJADA', 'EM_ANDAMENTO', 'PAUSADA', 'CONCLUIDA', 'CANCELADA', 'AGUARDANDO',
  'ABERTA', 'FINALIZADA',
]);

const BASELINE_SUPABASE = {
  titulos_total: 0, parcelas_total: 0, movimentacoes: 0, adiantamentos: 0,
  abatimentos: 0, taxas: 0, renegociacoes: 0, boletos: 0, fornecedores: 0,
  extrato_linhas: 0, anexos_titulos: 0,
  audit_eventos: 0,
  contratos: 0, propostas: 0, leads: 0, aditivos: 0, clientes: 0,
  estoque_itens: 0, estoque_mov: 0, obras: 0, chamados_posvenda: 0,
};

// ============================================================================
// CLI / leitura do snapshot
// ============================================================================

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: bun run scripts/d15-dry-run-compare.ts <snapshot.json>');
  process.exit(2);
}

let snapshot: any;
try {
  snapshot = JSON.parse(readFileSync(arquivo, 'utf8'));
} catch (e) {
  console.error(`[INVALIDO] Falha ao ler/parsear snapshot: ${(e as Error).message}`);
  process.exit(2);
}

// Detecta versão do snapshot (v1 flat ou v2 ampliado)
const SNAPSHOT_VERSION: 'v1' | 'v2' =
  snapshot?.integrity?.schema_version === 'd15-snapshot/v2-ampliado'
    || snapshot?.stores_por_dominio
    || snapshot?.stores_extras
    ? 'v2'
    : 'v1';

const findings: Finding[] = [];

// Helper unificado: pega store por chave (compat v1/v2)
function getStoreEntry(key: string): { present: boolean; raw_bytes: number; parsed: any } | null {
  if (SNAPSHOT_VERSION === 'v2') {
    // procura em cada domínio
    for (const dom of Object.keys(snapshot.stores_por_dominio ?? {})) {
      const entry = snapshot.stores_por_dominio[dom]?.[key];
      if (entry) return entry;
    }
    // catch-all
    if (snapshot.stores_extras?.[key]) return snapshot.stores_extras[key];
    return null;
  }
  // v1: shape antigo era { [key]: { raw_bytes, parsed } }
  const e = snapshot.stores?.[key];
  if (!e) return null;
  return { present: e != null, raw_bytes: e.raw_bytes ?? 0, parsed: e.parsed };
}

const arr = (key: string): any[] => {
  const e = getStoreEntry(key);
  const p = e?.parsed;
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object') return Object.values(p);
  return [];
};

const obj = (key: string): Record<string, any> => {
  const e = getStoreEntry(key);
  const p = e?.parsed;
  if (p && typeof p === 'object' && !Array.isArray(p)) return p;
  return {};
};

const norm = (s: any) => String(s ?? '').trim().toLowerCase();
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(String(s));

// ============================================================================
// CAMADA 1 — Integridade do snapshot
// ============================================================================

const layer1: Record<string, any> = {};
layer1.parse_ok = true;
layer1.snapshot_version = SNAPSHOT_VERSION;
layer1.operador = snapshot?.manifest?.operador?.nome ?? '(ausente)';
layer1.fonte_canonica = layer1.operador === 'Renan Barcelos';
layer1.wave_correta = snapshot?.manifest?.wave === 'D15.1.a.0.ii';

const stableStringify = (o: any): string => {
  const seen = new WeakSet();
  const sort = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(sort);
    return Object.keys(v).sort().reduce((acc: any, k) => { acc[k] = sort(v[k]); return acc; }, {});
  };
  return JSON.stringify(sort(o));
};
const { integrity, ...envelope } = snapshot;
const recomputed = createHash('sha256').update(stableStringify(envelope)).digest('hex');
layer1.hash_declarado = integrity?.hash_full ?? '(ausente)';
layer1.hash_recomputado = recomputed;
layer1.hash_confere = integrity?.hash_full === recomputed;

// ============================================================================
// COBERTURA POR DOMÍNIO (calculada uma vez, usada em vários lugares)
// ============================================================================

const cobertura: Record<string, DominioResumo> = {};
for (const [dom, chaves] of Object.entries(CHAVES_POR_DOMINIO)) {
  const r: DominioResumo = {
    total_chaves_esperadas: chaves.length,
    chaves_presentes: 0,
    chaves_ausentes: [],
    total_registros: 0,
    bytes: 0,
    findings_count: 0,
    bloqueantes: 0,
    ajustaveis: 0,
    ok: 0,
  };
  for (const k of chaves) {
    const e = getStoreEntry(k);
    if (!e?.present) { r.chaves_ausentes.push(k); continue; }
    r.chaves_presentes++;
    r.bytes += e.raw_bytes ?? 0;
    const items = arr(k);
    r.total_registros += items.length || (e.parsed && typeof e.parsed === 'object' ? Object.keys(e.parsed).length : (e.parsed ? 1 : 0));
  }
  cobertura[dom] = r;
}

// Catch-all (v2)
const chavesExtras = SNAPSHOT_VERSION === 'v2'
  ? Object.keys(snapshot.stores_extras ?? {})
  : [];

// ============================================================================
// CAMADA 2 — Financeiro tradicional (LS ↔ LS) — INTOCADO
// ============================================================================

const layer2: Record<string, number> = {};
const titulos   = arr('fin-titulos');
const renegs    = arr('fin-renegociacao');
const estornos  = arr('fin-estornos');
const adiants   = arr('fin-adiantamentos');
const compras   = arr('fin-compras');
const concilia  = arr('fin-conciliacao');

layer2.titulos_count = titulos.length;
layer2.renegs_count = renegs.length;
layer2.estornos_count = estornos.length;
layer2.adiants_count = adiants.length;
layer2.compras_count = compras.length;
layer2.concilia_count = concilia.length;

const tituloIds = new Set<string>();
const parcelaIds = new Set<string>();
const adiantIds = new Set<string>();

for (const t of titulos) {
  const id = String(t?.id ?? '');
  if (!id) { findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: t?.codigo ?? '(s/ id)', categoria: 'INVALIDO', detalhe: 'título sem id' }); continue; }
  if (tituloIds.has(id)) findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'DUPLICIDADE', detalhe: 'id duplicado' });
  tituloIds.add(id);
  for (const p of (Array.isArray(t?.parcelas) ? t.parcelas : [])) {
    const pid = String(p?.id ?? '');
    if (pid) parcelaIds.add(pid);
  }
}
for (const a of adiants) { const id = String(a?.id ?? ''); if (id) adiantIds.add(id); }

let titulosOrfaosVinculo = 0, titulosStatusInvalido = 0, titulosTipoInvalido = 0;
let titulosSaldoDivergente = 0, parcelasOrfas = 0, movsOrfasParcela = 0;

for (const t of titulos) {
  const id = String(t?.id ?? '(s/ id)');
  const tipo = String(t?.tipo ?? '').toUpperCase();
  const status = String(t?.status ?? '').toUpperCase();

  if (tipo && !TIPO_OFICIAL_TITULO.has(tipo)) {
    titulosTipoInvalido++;
    findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'INCOMPATIVEL', detalhe: `tipo '${tipo}' fora do enum oficial` });
  }
  if (status && !STATUS_OFICIAL_TITULO.has(status)) {
    titulosStatusInvalido++;
    findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'STATUS_INVALIDO', detalhe: `status '${status}'` });
  }
  if (!t?.natureza_financeira_id && !t?.natureza_id && !t?.natureza) {
    findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'NATUREZA_INVALIDA', detalhe: 'natureza ausente' });
  }
  if (!t?.centro_resultado_id && !t?.cr_id && !t?.centro_id) {
    findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'CENTRO_RESULTADO_INVALIDO', detalhe: 'centro de resultado ausente' });
  }
  if (tipo === 'RECEBER' && !t?.cliente_id && !t?.contrato_id && !t?.pv_id) {
    titulosOrfaosVinculo++;
    findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'VINCULO_AUSENTE', detalhe: 'RECEBER sem cliente/contrato/PV' });
  }
  if (tipo === 'PAGAR' && !t?.fornecedor_id && !t?.fornecedor && !t?.fornecedor_nome) {
    titulosOrfaosVinculo++;
    findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'VINCULO_AUSENTE', detalhe: 'PAGAR sem fornecedor' });
  }

  const parcelas = Array.isArray(t?.parcelas) ? t.parcelas : [];
  const movs = Array.isArray(t?.movimentacoes) ? t.movimentacoes : Array.isArray(t?.baixas) ? t.baixas : [];
  const valor = Number(t?.valor ?? 0);
  const totalPago = movs.reduce((s: number, m: any) => s + Number(m?.valor ?? 0), 0);
  if (valor > 0 && totalPago > valor + 0.01) {
    titulosSaldoDivergente++;
    findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: id, categoria: 'SALDO_DIVERGENTE', detalhe: `pago ${totalPago.toFixed(2)} > valor ${valor.toFixed(2)}` });
  }
  for (const p of parcelas) {
    const ptid = String(p?.titulo_id ?? id);
    if (!tituloIds.has(ptid)) {
      parcelasOrfas++;
      findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: p?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `parcela aponta para titulo_id ${ptid} inexistente` });
    }
  }
  for (const m of movs) {
    const mpid = m?.parcela_id ? String(m.parcela_id) : null;
    if (mpid && !parcelaIds.has(mpid)) {
      movsOrfasParcela++;
      findings.push({ store: 'fin-titulos', dominio: 'financeiro', ref_id: m?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `movimentação aponta para parcela_id ${mpid} inexistente` });
    }
  }
}

let renegsOrfas = 0;
for (const r of renegs) {
  const tid = String(r?.titulo_id ?? r?.titulo_origem_id ?? '');
  if (tid && !tituloIds.has(tid)) {
    renegsOrfas++;
    findings.push({ store: 'fin-renegociacao', dominio: 'financeiro', ref_id: r?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `renegociação aponta para titulo_id ${tid} inexistente` });
  }
  const itens = Array.isArray(r?.itens) ? r.itens : Array.isArray(r?.novas_parcelas) ? r.novas_parcelas : [];
  const somaItens = itens.reduce((s: number, i: any) => s + Number(i?.valor ?? 0), 0);
  const valorTotal = Number(r?.valor_total ?? r?.valor ?? 0);
  if (valorTotal > 0 && Math.abs(somaItens - valorTotal) > 0.05) {
    findings.push({ store: 'fin-renegociacao', dominio: 'financeiro', ref_id: r?.id ?? '(s/ id)', categoria: 'RENEGOCIACAO_INCONSISTENTE', detalhe: `soma itens ${somaItens.toFixed(2)} ≠ valor_total ${valorTotal.toFixed(2)}` });
  }
}
for (const e of estornos) {
  const tid = String(e?.titulo_id ?? '');
  if (tid && !tituloIds.has(tid)) findings.push({ store: 'fin-estornos', dominio: 'financeiro', ref_id: e?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `estorno aponta para titulo_id ${tid} inexistente` });
  if (!e?.motivo && !e?.observacao) findings.push({ store: 'fin-estornos', dominio: 'financeiro', ref_id: e?.id ?? '(s/ id)', categoria: 'INCOMPATIVEL', detalhe: 'estorno sem motivo (obrigatório no esquema oficial)' });
}
for (const a of adiants) {
  const id = String(a?.id ?? '(s/ id)');
  const valor = Number(a?.valor ?? 0);
  const abatimentos = Array.isArray(a?.abatimentos) ? a.abatimentos : Array.isArray(a?.aplicacoes) ? a.aplicacoes : [];
  const somaAbat = abatimentos.filter((b: any) => !b?.estornado).reduce((s: number, b: any) => s + Number(b?.valor ?? 0), 0);
  const saldoDecl = Number(a?.saldo ?? (valor - somaAbat));
  const saldoCalc = valor - somaAbat;
  if (valor > 0 && Math.abs(saldoDecl - saldoCalc) > 0.05) {
    findings.push({ store: 'fin-adiantamentos', dominio: 'financeiro', ref_id: id, categoria: 'SALDO_DIVERGENTE', detalhe: `saldo declarado ${saldoDecl.toFixed(2)} ≠ calculado ${saldoCalc.toFixed(2)}` });
  }
  if (!a?.direcao && !a?.tipo) findings.push({ store: 'fin-adiantamentos', dominio: 'financeiro', ref_id: id, categoria: 'INCOMPATIVEL', detalhe: 'direcao (RECEBIDO/PAGO) ausente' });
  for (const b of abatimentos) {
    const aid = String(b?.adiantamento_id ?? id);
    if (!adiantIds.has(aid)) findings.push({ store: 'fin-adiantamentos', dominio: 'financeiro', ref_id: b?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `abatimento aponta para adiantamento_id ${aid} inexistente` });
  }
}
const fornecsVistos = new Map<string, number>();
for (const c of compras) {
  const id = String(c?.id ?? '(s/ id)');
  const fk = String(c?.fornecedor_doc ?? c?.documento ?? c?.fornecedor_nome ?? '').toLowerCase().trim();
  if (fk) fornecsVistos.set(fk, (fornecsVistos.get(fk) ?? 0) + 1);
  else findings.push({ store: 'fin-compras', dominio: 'financeiro', ref_id: id, categoria: 'VINCULO_AUSENTE', detalhe: 'compra sem identificação de fornecedor' });
  if (!(Array.isArray(c?.itens) ? c.itens.length : 0)) findings.push({ store: 'fin-compras', dominio: 'financeiro', ref_id: id, categoria: 'PERDA_POTENCIAL', detalhe: 'compra sem itens detalhados' });
}
const hashLinhasVistos = new Set<string>();
for (const l of concilia) {
  const id = String(l?.id ?? '(s/ id)');
  const h = String(l?.hash_linha ?? l?.hash ?? '');
  if (h) {
    if (hashLinhasVistos.has(h)) findings.push({ store: 'fin-conciliacao', dominio: 'financeiro', ref_id: id, categoria: 'DUPLICIDADE', detalhe: `hash_linha ${h} duplicado` });
    hashLinhasVistos.add(h);
  } else findings.push({ store: 'fin-conciliacao', dominio: 'financeiro', ref_id: id, categoria: 'PERDA_POTENCIAL', detalhe: 'linha sem hash_linha (dedup impossível)' });
  if (!l?.conta_id) findings.push({ store: 'fin-conciliacao', dominio: 'financeiro', ref_id: id, categoria: 'INCOMPATIVEL', detalhe: 'conta_id ausente' });
}

layer2.titulos_orfaos_vinculo = titulosOrfaosVinculo;
layer2.titulos_status_invalido = titulosStatusInvalido;
layer2.titulos_tipo_invalido = titulosTipoInvalido;
layer2.titulos_saldo_divergente = titulosSaldoDivergente;
layer2.parcelas_orfas = parcelasOrfas;
layer2.movs_orfas_parcela = movsOrfasParcela;
layer2.renegs_orfas = renegsOrfas;
layer2.fornecedores_unicos = fornecsVistos.size;

// ============================================================================
// CAMADA 4 — Lançamentos derivados — INTOCADO
// ============================================================================

const lancamentos = arr('metasun.fin.lancamentos.v1');
const recorrentes = arr('metasun.fin.recorrentes.v1');
const centrosCat = arr('metasun.fin.centros.v1');
const naturezasCat = arr('metasun.fin.naturezas.v1');

const centrosValidos = new Set(centrosCat.map((c: any) => norm(c?.nome)));
const naturezasValidas = new Set(naturezasCat.map((n: any) => norm(n?.nome)));

const CAMADA_REALIZADA = new Set(['realizado', 'confirmado', 'pago', 'recebido']);
const CAMADA_PREVISTA = new Set(['previsto', 'a realizar', 'a pagar', 'a receber', 'orçado futuro', 'orcado futuro', 'orçado', 'orcado']);
const TIPO_ENTRADA = new Set(['entrada', 'receita', 'crédito', 'credito', 'recebimento']);
const TIPO_SAIDA = new Set(['saída', 'saida', 'despesa', 'débito', 'debito', 'pagamento']);

type LancRow = { id: string; categoria_dominante: Categoria; tipo: string; camada: string; valor: number; natureza_ok: boolean; centro_ok: boolean; obra_match: boolean | null; flags: string[] };

const lancResumo = {
  total: 0, entrada: 0, saida: 0, realizado: 0, previsto: 0,
  saldo_bruto_entradas: 0, saldo_bruto_saidas: 0,
  natureza_invalida: 0, centro_invalido: 0, obra_invalida: 0,
  status_invalido: 0, valor_invalido: 0, data_invalida: 0,
  duplicidade_potencial: 0, sem_destino: 0, lancamento_sem_titulo: 0,
  convertivel_titulo_receber: 0, convertivel_titulo_pagar: 0,
  convertivel_mov_realizada: 0, convertivel_mov_prevista: 0,
  convertivel_recorrente: recorrentes.length, perda_potencial: 0,
};
const lancRows: LancRow[] = [];
const dupKey = new Map<string, number>();

for (const l of lancamentos) {
  const id = String(l?.id ?? '(s/ id)');
  lancResumo.total++;
  const tipoRaw = norm(l?.tipo);
  const camadaRaw = norm(l?.camada);
  const valor = Number(l?.valor ?? 0);
  const flags: string[] = [];

  let categoria_dominante: Categoria = 'SEM_DESTINO';
  const isEntrada = TIPO_ENTRADA.has(tipoRaw);
  const isSaida = TIPO_SAIDA.has(tipoRaw);
  const isReal = CAMADA_REALIZADA.has(camadaRaw);
  const isPrev = CAMADA_PREVISTA.has(camadaRaw);

  if (!isISODate(l?.data ?? '')) { lancResumo.data_invalida++; flags.push('DATA_INVALIDA'); findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'DATA_INVALIDA', detalhe: `data '${l?.data}' não ISO YYYY-MM-DD` }); }
  if (!(valor > 0)) { lancResumo.valor_invalido++; flags.push('VALOR_INVALIDO'); findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'VALOR_INVALIDO', detalhe: `valor inválido (${l?.valor})` }); }
  if (!isEntrada && !isSaida) { lancResumo.status_invalido++; flags.push('TIPO_INVALIDO'); findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'STATUS_INVALIDO', detalhe: `tipo '${l?.tipo}' fora do enum` }); }
  if (!isReal && !isPrev) { lancResumo.status_invalido++; flags.push('CAMADA_INVALIDA'); findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'STATUS_INVALIDO', detalhe: `camada '${l?.camada}' fora do enum` }); }

  const natOk = !!l?.natureza && naturezasValidas.has(norm(l.natureza));
  const ccOk = !!l?.centroCusto && centrosValidos.has(norm(l.centroCusto));
  if (!natOk) { lancResumo.natureza_invalida++; flags.push('NATUREZA_INVALIDA'); findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'NATUREZA_INVALIDA', detalhe: `natureza '${l?.natureza}' fora do catálogo` }); }
  if (!ccOk) { lancResumo.centro_invalido++; flags.push('CENTRO_RESULTADO_INVALIDO'); findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'CENTRO_RESULTADO_INVALIDO', detalhe: `centroCusto '${l?.centroCusto}' fora do catálogo` }); }
  let obraMatch: boolean | null = null;
  if (l?.obra != null && String(l.obra).trim() !== '') {
    obraMatch = /^OB-?\d+/i.test(String(l.obra));
    if (!obraMatch) { lancResumo.obra_invalida++; flags.push('OBRA_INVALIDA'); findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'OBRA_INVALIDA', detalhe: `obra '${l?.obra}' fora do padrão OB-####` }); }
  }

  const dk = `${norm(l?.data)}|${valor}|${tipoRaw}|${norm(l?.natureza)}`;
  dupKey.set(dk, (dupKey.get(dk) ?? 0) + 1);

  if (isEntrada) { lancResumo.entrada++; lancResumo.saldo_bruto_entradas += valor; }
  if (isSaida)   { lancResumo.saida++;   lancResumo.saldo_bruto_saidas   += valor; }
  if (isReal)    lancResumo.realizado++;
  if (isPrev)    lancResumo.previsto++;

  if (isEntrada && isPrev) categoria_dominante = 'CONVERTIVEL_TITULO_RECEBER';
  else if (isSaida && isPrev) categoria_dominante = 'CONVERTIVEL_TITULO_PAGAR';
  else if (isReal && (isEntrada || isSaida)) {
    categoria_dominante = 'CONVERTIVEL_MOVIMENTACAO_REALIZADA';
    lancResumo.lancamento_sem_titulo++; flags.push('LANCAMENTO_SEM_TITULO');
    findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'LANCAMENTO_SEM_TITULO', detalhe: 'realizado sem título-pai (RPC criar-título+baixa atômica)' });
  } else { categoria_dominante = 'SEM_DESTINO'; lancResumo.sem_destino++; findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: id, categoria: 'SEM_DESTINO', detalhe: `não classificável (tipo=${l?.tipo}, camada=${l?.camada})` }); }

  lancRows.push({ id, categoria_dominante, tipo: l?.tipo ?? '', camada: l?.camada ?? '', valor, natureza_ok: natOk, centro_ok: ccOk, obra_match: obraMatch, flags });
}
for (const [k, n] of dupKey.entries()) {
  if (n > 1) { lancResumo.duplicidade_potencial += n; findings.push({ store: 'metasun.fin.lancamentos.v1', dominio: 'financeiro', ref_id: k, categoria: 'DUPLICIDADE_POTENCIAL', detalhe: `${n} lançamentos com mesma data+valor+tipo+natureza` }); }
}
for (const r of recorrentes) {
  const id = String(r?.id ?? '(s/ id)');
  const natOk = !!r?.natureza && naturezasValidas.has(norm(r.natureza));
  const ccOk = !!r?.centroCusto && centrosValidos.has(norm(r.centroCusto));
  if (!natOk) findings.push({ store: 'metasun.fin.recorrentes.v1', dominio: 'financeiro', ref_id: id, categoria: 'NATUREZA_INVALIDA', detalhe: `natureza '${r?.natureza}' fora do catálogo` });
  if (!ccOk) findings.push({ store: 'metasun.fin.recorrentes.v1', dominio: 'financeiro', ref_id: id, categoria: 'CENTRO_RESULTADO_INVALIDO', detalhe: `centroCusto '${r?.centroCusto}' fora do catálogo` });
  if (!(Number(r?.valor) > 0)) findings.push({ store: 'metasun.fin.recorrentes.v1', dominio: 'financeiro', ref_id: id, categoria: 'VALOR_INVALIDO', detalhe: 'recorrente com valor inválido' });
}

// ============================================================================
// CAMADA 5 — AUDITORIA (Onda 5)
// ============================================================================

const auditEventos = arr('ms.audit.v1');
const audit = {
  total: auditEventos.length,
  entidades_distintas: new Set<string>(),
  acoes_distintas: new Set<string>(),
  atores_distintos: new Set<string>(),
  sem_entidade: 0, sem_acao: 0, sem_timestamp: 0, sem_ator: 0,
  data_min: null as string | null, data_max: null as string | null,
};
for (const ev of auditEventos) {
  const id = String(ev?.id ?? '(s/ id)');
  const entidade = ev?.entidade ?? ev?.entity ?? ev?.entityType ?? ev?.target;
  const acao = ev?.acao ?? ev?.action ?? ev?.evento ?? ev?.tipo;
  const ts = ev?.timestamp ?? ev?.ts ?? ev?.data ?? ev?.criadoEm ?? ev?.created_at;
  const ator = ev?.ator ?? ev?.usuario ?? ev?.user ?? ev?.userId ?? ev?.userName;
  if (entidade) audit.entidades_distintas.add(String(entidade)); else { audit.sem_entidade++; findings.push({ store: 'ms.audit.v1', dominio: 'auditoria', ref_id: id, categoria: 'AUDIT_EVENTO_SEM_ENTIDADE', detalhe: 'evento sem entidade' }); }
  if (acao) audit.acoes_distintas.add(String(acao)); else { audit.sem_acao++; findings.push({ store: 'ms.audit.v1', dominio: 'auditoria', ref_id: id, categoria: 'AUDIT_EVENTO_SEM_ACAO', detalhe: 'evento sem ação' }); }
  if (ator) audit.atores_distintos.add(String(ator)); else { audit.sem_ator++; findings.push({ store: 'ms.audit.v1', dominio: 'auditoria', ref_id: id, categoria: 'AUDIT_EVENTO_SEM_ATOR', detalhe: 'evento sem ator' }); }
  if (ts) {
    const s = String(ts);
    if (!audit.data_min || s < audit.data_min) audit.data_min = s;
    if (!audit.data_max || s > audit.data_max) audit.data_max = s;
  } else { audit.sem_timestamp++; findings.push({ store: 'ms.audit.v1', dominio: 'auditoria', ref_id: id, categoria: 'AUDIT_EVENTO_SEM_TIMESTAMP', detalhe: 'evento sem timestamp' }); }
}

// ============================================================================
// CAMADA 6 — COMERCIAL (Onda 3): contratos, propostas, leads, aditivos, clientes
// ============================================================================

const contratos = arr('ms.contratos.v2');
const aditivos = arr('ms.aditivos.v1');
const propostas = arr('ms.fv.propostas.v1');
const kanbanCols = obj('ms.fv.kanban.cols.v5');
const kanbanAssign = obj('ms.fv.kanban.assign-leads.v1');
const clientesFull = arr('ms.clientes.full.v1');
const clientesExtra = obj('ms.clientes.extra.v1');

const contratoIds = new Set<string>();
const contratoNumeros = new Map<string, number>();
const comercial = {
  contratos_total: contratos.length,
  contratos_sem_cliente: 0, contratos_sem_valor: 0, contratos_duplicados: 0,
  propostas_total: propostas.length,
  propostas_sem_cliente: 0, propostas_orfas: 0,
  leads_total: 0,
  leads_sem_coluna: 0, leads_duplicados: 0,
  kanban_colunas: Array.isArray(kanbanCols) ? kanbanCols.length : Object.keys(kanbanCols).length,
  aditivos_total: aditivos.length, aditivos_orfaos: 0,
  clientes_total: clientesFull.length,
  clientes_sem_documento: 0, clientes_duplicados: 0,
};

for (const c of contratos) {
  const id = String(c?.id ?? c?.numero ?? c?.codigo ?? '(s/ id)');
  if (contratoIds.has(id)) { comercial.contratos_duplicados++; findings.push({ store: 'ms.contratos.v2', dominio: 'comercial_contratos', ref_id: id, categoria: 'CONTRATO_DUPLICADO', detalhe: 'id duplicado' }); }
  contratoIds.add(id);
  const num = String(c?.numero ?? c?.codigo ?? '');
  if (num) contratoNumeros.set(num, (contratoNumeros.get(num) ?? 0) + 1);
  if (!c?.cliente_id && !c?.cliente && !c?.clienteNome && !c?.cliente_nome) {
    comercial.contratos_sem_cliente++;
    findings.push({ store: 'ms.contratos.v2', dominio: 'comercial_contratos', ref_id: id, categoria: 'CONTRATO_SEM_CLIENTE', detalhe: 'contrato sem cliente' });
  }
  const val = Number(c?.valor ?? c?.valorTotal ?? c?.valor_total ?? 0);
  if (!(val > 0)) {
    comercial.contratos_sem_valor++;
    findings.push({ store: 'ms.contratos.v2', dominio: 'comercial_contratos', ref_id: id, categoria: 'CONTRATO_SEM_VALOR', detalhe: 'contrato sem valor positivo' });
  }
}
for (const [num, n] of contratoNumeros.entries()) {
  if (n > 1) findings.push({ store: 'ms.contratos.v2', dominio: 'comercial_contratos', ref_id: num, categoria: 'CONTRATO_DUPLICADO', detalhe: `${n} contratos com mesmo número` });
}

// Propostas + leads (kanban). Propostas são leads ao mesmo tempo (col/stage define).
const propostasIds = new Set<string>();
const colKeys = new Set<string>();
if (Array.isArray(kanbanCols)) {
  for (const c of kanbanCols) colKeys.add(String(c?.id ?? c?.key ?? c?.nome ?? ''));
} else {
  for (const k of Object.keys(kanbanCols)) colKeys.add(k);
}
const assignedLeadIds = new Set<string>(Object.keys(kanbanAssign));

for (const p of propostas) {
  const id = String(p?.id ?? '(s/ id)');
  if (propostasIds.has(id)) findings.push({ store: 'ms.fv.propostas.v1', dominio: 'comercial_contratos', ref_id: id, categoria: 'LEAD_DUPLICADO', detalhe: 'proposta/lead com id duplicado' });
  propostasIds.add(id);
  if (!p?.cliente_id && !p?.cliente && !p?.clienteNome && !p?.cliente_nome) {
    comercial.propostas_sem_cliente++;
    findings.push({ store: 'ms.fv.propostas.v1', dominio: 'comercial_contratos', ref_id: id, categoria: 'PROPOSTA_SEM_CLIENTE', detalhe: 'proposta sem cliente' });
  }
  const col = String(p?.colId ?? p?.coluna ?? p?.col ?? p?.stage ?? p?.status ?? '');
  if (col && colKeys.size && !colKeys.has(col)) {
    comercial.leads_sem_coluna++;
    findings.push({ store: 'ms.fv.propostas.v1', dominio: 'comercial_contratos', ref_id: id, categoria: 'LEAD_SEM_COLUNA', detalhe: `coluna '${col}' não existe no kanban` });
  }
}
comercial.leads_total = propostas.length; // leads vivem como propostas no kanban
comercial.leads_duplicados = propostas.length - propostasIds.size;
// assignedLeadIds referenciando proposta inexistente
for (const lid of assignedLeadIds) {
  if (!propostasIds.has(lid)) findings.push({ store: 'ms.fv.kanban.assign-leads.v1', dominio: 'comercial_contratos', ref_id: lid, categoria: 'LEAD_SEM_COLUNA', detalhe: 'assign aponta para lead/proposta inexistente' });
}

// Aditivos
for (const ad of aditivos) {
  const id = String(ad?.id ?? '(s/ id)');
  const cid = String(ad?.contrato_id ?? ad?.contratoId ?? '');
  if (!cid || !contratoIds.has(cid)) {
    comercial.aditivos_orfaos++;
    findings.push({ store: 'ms.aditivos.v1', dominio: 'comercial_contratos', ref_id: id, categoria: 'ADITIVO_ORFAO', detalhe: `aditivo sem contrato válido (${cid || 'vazio'})` });
  }
}

// Clientes
const clienteDocs = new Map<string, number>();
const clienteIds = new Set<string>();
for (const cli of clientesFull) {
  const id = String(cli?.id ?? '(s/ id)');
  if (clienteIds.has(id)) { comercial.clientes_duplicados++; findings.push({ store: 'ms.clientes.full.v1', dominio: 'comercial_contratos', ref_id: id, categoria: 'CLIENTE_DUPLICADO', detalhe: 'id duplicado' }); }
  clienteIds.add(id);
  const doc = String(cli?.cpfCnpj ?? cli?.cnpj ?? cli?.cpf ?? cli?.documento ?? '').replace(/\D/g, '');
  if (!doc) {
    comercial.clientes_sem_documento++;
    findings.push({ store: 'ms.clientes.full.v1', dominio: 'comercial_contratos', ref_id: id, categoria: 'CLIENTE_SEM_DOCUMENTO', detalhe: 'cliente sem CPF/CNPJ' });
  } else {
    clienteDocs.set(doc, (clienteDocs.get(doc) ?? 0) + 1);
  }
}
for (const [doc, n] of clienteDocs.entries()) {
  if (n > 1) { comercial.clientes_duplicados += n - 1; findings.push({ store: 'ms.clientes.full.v1', dominio: 'comercial_contratos', ref_id: doc, categoria: 'CLIENTE_DUPLICADO', detalhe: `${n} clientes com mesmo CPF/CNPJ` }); }
}

// ============================================================================
// CAMADA 7 — CADASTROS (Onda 2)
// ============================================================================

const cadastros = {
  consultores: arr('ms.consultores.v1').length,
  gerentes:    arr('ms.gerentes.v1').length,
  equipes:     arr('ms.equipes.v1').length,
  bancos:      arr('ms.bancos.v1').length,
  perfis:      arr('ms.perfis.v1').length,
  usuarios:    arr('ms.usuarios.v1').length,
  usuario_atual_ok: !!getStoreEntry('ms.usuarioAtual.v1')?.present,
  fornecedores_legado: arr('ms.fin.fornecedores.v1').length,
  duplicados: 0,
};

const dedupCadastro = (key: string, dominioCat: 'cadastros_identidade') => {
  const items = arr(key);
  const visto = new Set<string>();
  for (const it of items) {
    const id = String(it?.id ?? '(s/ id)');
    if (visto.has(id)) { cadastros.duplicados++; findings.push({ store: key, dominio: dominioCat, ref_id: id, categoria: 'CADASTRO_DUPLICADO', detalhe: 'id duplicado' }); }
    visto.add(id);
    const nome = it?.nome ?? it?.name ?? it?.razao_social;
    if (!nome) findings.push({ store: key, dominio: dominioCat, ref_id: id, categoria: 'CADASTRO_INCOMPLETO', detalhe: 'sem nome' });
  }
};
['ms.consultores.v1', 'ms.gerentes.v1', 'ms.equipes.v1', 'ms.bancos.v1', 'ms.perfis.v1', 'ms.usuarios.v1']
  .forEach((k) => dedupCadastro(k, 'cadastros_identidade'));

// ============================================================================
// CAMADA 8 — ESTOQUE
// ============================================================================

const estoqueItens = arr('ms.estoque.itens.v1');
const estoqueMov = arr('ms.estoque.mov.v1');
const estoqueLog = arr('ms.estoque.log.v1');
const estoqueNec = arr('ms.estoque.necessidades.v1');
const estoqueTransito = arr('ms.estoque.compras.transito.v1');

const itemCodigos = new Set<string>();
let itensSemCodigo = 0, saldosNegativos = 0;
for (const it of estoqueItens) {
  const id = String(it?.id ?? '(s/ id)');
  const cod = String(it?.codigo ?? it?.sku ?? '');
  if (!cod) { itensSemCodigo++; findings.push({ store: 'ms.estoque.itens.v1', dominio: 'estoque', ref_id: id, categoria: 'ESTOQUE_ITEM_SEM_CODIGO', detalhe: 'item sem código/sku' }); }
  else itemCodigos.add(cod);
  const saldo = Number(it?.saldo ?? it?.quantidade ?? 0);
  if (saldo < 0) { saldosNegativos++; findings.push({ store: 'ms.estoque.itens.v1', dominio: 'estoque', ref_id: id, categoria: 'ESTOQUE_SALDO_NEGATIVO', detalhe: `saldo ${saldo}` }); }
}
let movsOrfasEstoque = 0;
for (const m of estoqueMov) {
  const id = String(m?.id ?? '(s/ id)');
  const cod = String(m?.codigo ?? m?.sku ?? m?.itemCodigo ?? '');
  if (cod && itemCodigos.size && !itemCodigos.has(cod)) {
    movsOrfasEstoque++;
    findings.push({ store: 'ms.estoque.mov.v1', dominio: 'estoque', ref_id: id, categoria: 'ESTOQUE_MOV_ORFA', detalhe: `movimento aponta para item '${cod}' inexistente` });
  }
}
const estoque = {
  itens_total: estoqueItens.length, movimentos_total: estoqueMov.length,
  log_total: estoqueLog.length, necessidades_total: estoqueNec.length,
  transito_total: estoqueTransito.length,
  itens_sem_codigo: itensSemCodigo, saldos_negativos: saldosNegativos,
  movs_orfas: movsOrfasEstoque,
};

// ============================================================================
// CAMADA 9 — ENGENHARIA / OBRAS
// ============================================================================

const obrasKanban = arr('ms.engenharia.obras.kanban');
const obrasSnap = arr('ms.engenharia.obras.snapshot.v1');
const obrasFinaliz = arr('ms.obras.finalizacao.v1');

let obrasSemContrato = 0, obrasStatusInvalido = 0;
const obrasSrc = obrasSnap.length ? obrasSnap : obrasKanban;
for (const o of obrasSrc) {
  const id = String(o?.id ?? o?.codigo ?? '(s/ id)');
  if (!o?.contrato_id && !o?.contratoId && !o?.contrato && !o?.numero_contrato) {
    obrasSemContrato++;
    findings.push({ store: 'ms.engenharia.obras.snapshot.v1', dominio: 'engenharia_obras', ref_id: id, categoria: 'OBRA_SEM_CONTRATO', detalhe: 'obra sem contrato vinculado' });
  }
  const status = String(o?.status ?? o?.coluna ?? '').toUpperCase();
  if (status && !STATUS_OBRA_ENUM.has(status)) {
    obrasStatusInvalido++;
    findings.push({ store: 'ms.engenharia.obras.snapshot.v1', dominio: 'engenharia_obras', ref_id: id, categoria: 'OBRA_STATUS_INVALIDO', detalhe: `status '${status}' fora do enum` });
  }
}
const obras = {
  kanban_total: obrasKanban.length, snapshot_total: obrasSnap.length,
  finalizacao_total: obrasFinaliz.length,
  sem_contrato: obrasSemContrato, status_invalido: obrasStatusInvalido,
};

// ============================================================================
// CAMADA 10 — PÓS-VENDA
// ============================================================================

const pvChamados = arr('ms.posvenda.chamados.v1');
const pvTipos = arr('ms.posvenda.tipos.v1');
const pvGatilhos = arr('ms.posvenda.gatilhos.v1');
const pvSeq = obj('ms.posvenda.seq.v1');

const tiposValidos = new Set(pvTipos.map((t: any) => norm(t?.id ?? t?.codigo ?? t?.nome)));
let pvSemTipo = 0;
for (const ch of pvChamados) {
  const id = String(ch?.id ?? '(s/ id)');
  const t = norm(ch?.tipo ?? ch?.tipo_id);
  if (!t || (tiposValidos.size && !tiposValidos.has(t))) {
    pvSemTipo++;
    findings.push({ store: 'ms.posvenda.chamados.v1', dominio: 'posvenda', ref_id: id, categoria: 'POSVENDA_SEM_TIPO', detalhe: `tipo '${ch?.tipo}' inválido` });
  }
  if (!ch?.obra_id && !ch?.contrato_id && !ch?.cliente_id) {
    findings.push({ store: 'ms.posvenda.chamados.v1', dominio: 'posvenda', ref_id: id, categoria: 'POSVENDA_ORFAO', detalhe: 'chamado sem vínculo (obra/contrato/cliente)' });
  }
}
const posvenda = {
  chamados_total: pvChamados.length, tipos_total: pvTipos.length,
  gatilhos_total: pvGatilhos.length, seq_keys: Object.keys(pvSeq).length,
  sem_tipo: pvSemTipo,
};

// ============================================================================
// AGREGAÇÃO POR DOMÍNIO + categorias
// ============================================================================

const contadoresPorCategoria: Record<string, number> = {};
for (const f of findings) {
  contadoresPorCategoria[f.categoria] = (contadoresPorCategoria[f.categoria] ?? 0) + 1;
  cobertura[f.dominio].findings_count++;
}

// Bloqueantes vs ajustáveis por domínio
const CAT_BLOQUEANTE = new Set([
  'INVALIDO', 'ORFAO', 'INCOMPATIVEL', 'VALOR_INVALIDO', 'DATA_INVALIDA',
  'SEM_DESTINO', 'CONTRATO_DUPLICADO', 'CLIENTE_DUPLICADO',
  'ESTOQUE_MOV_ORFA', 'OBRA_SEM_CONTRATO', 'AUDIT_EVENTO_SEM_ENTIDADE',
  'AUDIT_EVENTO_SEM_TIMESTAMP', 'ADITIVO_ORFAO',
]);
for (const f of findings) {
  if (CAT_BLOQUEANTE.has(f.categoria)) cobertura[f.dominio].bloqueantes++;
  else cobertura[f.dominio].ajustaveis++;
}
for (const dom of Object.keys(cobertura)) {
  cobertura[dom].ok = Math.max(0, cobertura[dom].total_registros - cobertura[dom].findings_count);
}

// Soma classificações dominantes da camada 4
contadoresPorCategoria.CONVERTIVEL_TITULO_RECEBER = (contadoresPorCategoria.CONVERTIVEL_TITULO_RECEBER ?? 0) + lancResumo.convertivel_titulo_receber;
contadoresPorCategoria.CONVERTIVEL_TITULO_PAGAR = (contadoresPorCategoria.CONVERTIVEL_TITULO_PAGAR ?? 0) + lancResumo.convertivel_titulo_pagar;
contadoresPorCategoria.CONVERTIVEL_MOVIMENTACAO_REALIZADA = (contadoresPorCategoria.CONVERTIVEL_MOVIMENTACAO_REALIZADA ?? 0) + lancResumo.convertivel_mov_realizada;
contadoresPorCategoria.CONVERTIVEL_MOVIMENTACAO_PREVISTA = (contadoresPorCategoria.CONVERTIVEL_MOVIMENTACAO_PREVISTA ?? 0) + lancResumo.convertivel_mov_prevista;
contadoresPorCategoria.CONVERTIVEL_RECORRENTE = (contadoresPorCategoria.CONVERTIVEL_RECORRENTE ?? 0) + lancResumo.convertivel_recorrente;

const lancsConvertiveis = lancResumo.convertivel_titulo_receber + lancResumo.convertivel_titulo_pagar
  + lancResumo.convertivel_mov_realizada + lancResumo.convertivel_mov_prevista;

const totalRegistros = Object.values(cobertura).reduce((s, r) => s + r.total_registros, 0);
const okGlobal = Object.values(cobertura).reduce((s, r) => s + r.ok, 0);
const bloqueantesGlobal = Object.values(cobertura).reduce((s, r) => s + r.bloqueantes, 0);
const ajustaveisGlobal = Object.values(cobertura).reduce((s, r) => s + r.ajustaveis, 0);
const migravel = okGlobal + lancsConvertiveis + lancResumo.convertivel_recorrente;
const paridadePct = totalRegistros > 0 ? (migravel / totalRegistros) * 100 : 0;
const readinessDualRead = paridadePct >= 95 && bloqueantesGlobal === 0;

// ============================================================================
// Geração de relatórios
// ============================================================================

const pad = (n: number) => String(n).padStart(2, '0');
const ts = new Date();
const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
const reportPath = `docs/d15-1-a-0-ii-dry-run-report-${stamp}.md`;
const detailPath = `docs/d15-1-a-0-ii-dry-run-detail-${stamp}.json`;

const linhaCobertura = (dom: string, r: DominioResumo) =>
  `| \`${dom}\` | ${r.chaves_presentes}/${r.total_chaves_esperadas} | ${r.total_registros} | ${r.bytes} | ${r.ok} | ${r.ajustaveis} | ${r.bloqueantes} |`;

const md = `# D15.1.a.0.ii — Dry-Run Report (v2 AMPLIADO)

- **Snapshot**: \`${arquivo}\`
- **Versão snapshot detectada**: \`${SNAPSHOT_VERSION}\`
- **Hash declarado**: \`${layer1.hash_declarado}\`
- **Hash recomputado**: \`${layer1.hash_recomputado}\`
- **Hash confere**: ${layer1.hash_confere ? '✅' : '❌'}
- **Operador**: ${layer1.operador} ${layer1.fonte_canonica ? '✅ canônico' : '❌ NÃO canônico'}
- **Wave declarada**: ${snapshot?.manifest?.wave ?? '—'} ${layer1.wave_correta ? '✅' : '❌'}
- **Executado**: ${ts.toISOString()}
- **Baseline Supabase**: todas zero (esperado para pré-corte)
${chavesExtras.length ? `- ⚠️ **Chaves extras (catch-all v2)**: ${chavesExtras.length} → \`${chavesExtras.join(', ')}\`` : ''}

---

## 0. Cobertura por domínio (paridade global)

| Domínio | Chaves | Registros | Bytes | OK | Ajustáveis | Bloqueantes |
|---|---:|---:|---:|---:|---:|---:|
${Object.entries(cobertura).map(([d, r]) => linhaCobertura(d, r)).join('\n')}

---

## 1. Integridade do snapshot (Camada 1)

| Item | Resultado |
|---|---|
| Parse OK | ${layer1.parse_ok ? '✅' : '❌'} |
| Versão snapshot | \`${SNAPSHOT_VERSION}\` |
| Hash SHA-256 confere | ${layer1.hash_confere ? '✅' : '❌'} |
| Fonte canônica (Renan Barcelos) | ${layer1.fonte_canonica ? '✅' : '❌'} |
| Wave correta | ${layer1.wave_correta ? '✅' : '❌'} |

---

## 2. Financeiro (Camada 2 — LS↔LS)

| Métrica | Valor |
|---|---:|
| Títulos totais | ${layer2.titulos_count} |
| Renegociações | ${layer2.renegs_count} |
| Estornos | ${layer2.estornos_count} |
| Adiantamentos | ${layer2.adiants_count} |
| Compras (boletos) | ${layer2.compras_count} |
| Conciliação (linhas) | ${layer2.concilia_count} |
| Fornecedores únicos (deduzidos) | ${layer2.fornecedores_unicos} |
| Títulos com tipo inválido | ${layer2.titulos_tipo_invalido} |
| Títulos com status inválido | ${layer2.titulos_status_invalido} |
| Títulos sem vínculo | ${layer2.titulos_orfaos_vinculo} |
| Títulos com saldo divergente | ${layer2.titulos_saldo_divergente} |
| Parcelas órfãs | ${layer2.parcelas_orfas} |
| Movimentações órfãs (parcela) | ${layer2.movs_orfas_parcela} |
| Renegociações órfãs | ${layer2.renegs_orfas} |

---

## 3. Lançamentos derivados (Camada 4)

| Métrica | Valor |
|---|---:|
| Lançamentos totais | ${lancResumo.total} |
| Recorrentes (regra futura) | ${lancResumo.convertivel_recorrente} |
| Entradas / Saídas | ${lancResumo.entrada} / ${lancResumo.saida} |
| Realizado / Previsto | ${lancResumo.realizado} / ${lancResumo.previsto} |
| Saldo bruto entradas (R$) | ${lancResumo.saldo_bruto_entradas.toFixed(2)} |
| Saldo bruto saídas (R$) | ${lancResumo.saldo_bruto_saidas.toFixed(2)} |
| Saldo líquido (R$) | ${(lancResumo.saldo_bruto_entradas - lancResumo.saldo_bruto_saidas).toFixed(2)} |
| Natureza/Centro/Obra inválidos | ${lancResumo.natureza_invalida} / ${lancResumo.centro_invalido} / ${lancResumo.obra_invalida} |
| Convertível RECEBER / PAGAR / MOV_REAL / MOV_PREV | ${lancResumo.convertivel_titulo_receber} / ${lancResumo.convertivel_titulo_pagar} / ${lancResumo.convertivel_mov_realizada} / ${lancResumo.convertivel_mov_prevista} |
| Sem destino / Lançamento sem título | ${lancResumo.sem_destino} / ${lancResumo.lancamento_sem_titulo} |

---

## 4. Auditoria (Camada 5 — Onda 5)

| Métrica | Valor |
|---|---:|
| Eventos totais (\`ms.audit.v1\`) | ${audit.total} |
| Entidades distintas | ${audit.entidades_distintas.size} |
| Ações distintas | ${audit.acoes_distintas.size} |
| Atores distintos | ${audit.atores_distintos.size} |
| Eventos sem entidade | ${audit.sem_entidade} |
| Eventos sem ação | ${audit.sem_acao} |
| Eventos sem ator | ${audit.sem_ator} |
| Eventos sem timestamp | ${audit.sem_timestamp} |
| Janela temporal | ${audit.data_min ?? '—'} → ${audit.data_max ?? '—'} |

---

## 5. Comercial — contratos / propostas / leads / aditivos / clientes (Camada 6 — Onda 3)

| Métrica | Valor |
|---|---:|
| Contratos totais (\`ms.contratos.v2\`) | ${comercial.contratos_total} |
| Contratos sem cliente | ${comercial.contratos_sem_cliente} |
| Contratos sem valor | ${comercial.contratos_sem_valor} |
| Contratos duplicados (id ou número) | ${comercial.contratos_duplicados} |
| Aditivos totais | ${comercial.aditivos_total} |
| Aditivos órfãos | ${comercial.aditivos_orfaos} |
| Propostas/Leads totais (\`ms.fv.propostas.v1\`) | ${comercial.propostas_total} |
| Propostas sem cliente | ${comercial.propostas_sem_cliente} |
| Leads em coluna inválida do kanban | ${comercial.leads_sem_coluna} |
| Leads duplicados (id) | ${comercial.leads_duplicados} |
| Colunas kanban configuradas | ${comercial.kanban_colunas} |
| Clientes totais (\`ms.clientes.full.v1\`) | ${comercial.clientes_total} |
| Clientes sem CPF/CNPJ | ${comercial.clientes_sem_documento} |
| Clientes duplicados (id ou doc) | ${comercial.clientes_duplicados} |

---

## 6. Cadastros (Camada 7 — Onda 2)

| Métrica | Valor |
|---|---:|
| Consultores | ${cadastros.consultores} |
| Gerentes | ${cadastros.gerentes} |
| Equipes | ${cadastros.equipes} |
| Bancos | ${cadastros.bancos} |
| Perfis | ${cadastros.perfis} |
| Usuários | ${cadastros.usuarios} |
| Usuário atual (sessão) capturado | ${cadastros.usuario_atual_ok ? '✅' : '❌'} |
| Fornecedores (legado financeiro) | ${cadastros.fornecedores_legado} |
| Duplicados detectados | ${cadastros.duplicados} |

---

## 7. Estoque (Camada 8)

| Métrica | Valor |
|---|---:|
| Itens totais | ${estoque.itens_total} |
| Movimentos totais | ${estoque.movimentos_total} |
| Log entries | ${estoque.log_total} |
| Necessidades | ${estoque.necessidades_total} |
| Compras em trânsito | ${estoque.transito_total} |
| Itens sem código | ${estoque.itens_sem_codigo} |
| Saldos negativos | ${estoque.saldos_negativos} |
| Movimentos órfãos (item inexistente) | ${estoque.movs_orfas} |

---

## 8. Engenharia / Obras (Camada 9)

| Métrica | Valor |
|---|---:|
| Obras (kanban) | ${obras.kanban_total} |
| Obras (snapshot oficial) | ${obras.snapshot_total} |
| Finalizações registradas | ${obras.finalizacao_total} |
| Obras sem contrato | ${obras.sem_contrato} |
| Obras com status fora do enum | ${obras.status_invalido} |

---

## 9. Pós-venda (Camada 10)

| Métrica | Valor |
|---|---:|
| Chamados totais | ${posvenda.chamados_total} |
| Tipos cadastrados | ${posvenda.tipos_total} |
| Gatilhos | ${posvenda.gatilhos_total} |
| Chaves de sequência | ${posvenda.seq_keys} |
| Chamados sem tipo válido | ${posvenda.sem_tipo} |

---

## 10. Categorias agregadas (todas as findings)

| Categoria | Contagem |
|---|---:|
${Object.entries(contadoresPorCategoria).sort().map(([c, n]) => `| \`${c}\` | ${n} |`).join('\n')}

---

## 11. Sumário enterprise

| Indicador | Valor |
|---|---:|
| Total registros analisados | ${totalRegistros} |
| OK global | ${okGlobal} |
| Convertíveis (lançamentos) | ${lancsConvertiveis + lancResumo.convertivel_recorrente} |
| Migrável (OK + convertíveis) | ${migravel} |
| Ajustável (com normalização) | ${ajustaveisGlobal} |
| Bloqueado (bloqueantes) | ${bloqueantesGlobal} |
| **Paridade percentual global** | **${paridadePct.toFixed(2)}%** |
| **Readiness para Dual Read (Onda 1.B)** | **${readinessDualRead ? '✅ SIM' : '❌ NÃO'}** |

---

## 12. Prontidão por onda (validação cruzada)

| Onda | Cobertura snapshot | Bloqueantes domínio | Pronta para iniciar? |
|---|---|---:|---|
| Onda 1.A (já aplicada) | financeiro | ${cobertura.financeiro.bloqueantes} | ${cobertura.financeiro.bloqueantes === 0 ? '✅' : '⚠️ revisar'} |
| Onda 1.B (refator UI financeira) | financeiro | ${cobertura.financeiro.bloqueantes} | ${readinessDualRead ? '✅' : '⚠️ depende readiness'} |
| Onda 1.C (corte LS financeiro) | financeiro | ${cobertura.financeiro.bloqueantes} | ${readinessDualRead && cobertura.financeiro.bloqueantes === 0 ? '✅' : '❌'} |
| Onda 2 (cadastros canônicos) | cadastros_identidade + clientes | ${cobertura.cadastros_identidade.bloqueantes + cobertura.comercial_contratos.bloqueantes} | ${cobertura.cadastros_identidade.bloqueantes === 0 ? '✅' : '⚠️'} |
| Onda 3 (comercial) | comercial_contratos | ${cobertura.comercial_contratos.bloqueantes} | ${cobertura.comercial_contratos.bloqueantes === 0 ? '✅' : '⚠️'} |
| Onda 5 (auditoria) | auditoria | ${cobertura.auditoria.bloqueantes} | ${cobertura.auditoria.total_registros > 0 ? '✅' : '⚠️ snapshot vazio'} |

---

## 13. Decisões pendentes

${bloqueantesGlobal > 0 ? `- ❌ Resolver **${bloqueantesGlobal}** registros bloqueantes (ver detail JSON)` : '- ✅ Zero registros bloqueantes'}
${(contadoresPorCategoria.NATUREZA_INVALIDA ?? 0) > 0 ? `- ⚠️ Cadastrar/mapear **${contadoresPorCategoria.NATUREZA_INVALIDA}** naturezas financeiras` : ''}
${(contadoresPorCategoria.CENTRO_RESULTADO_INVALIDO ?? 0) > 0 ? `- ⚠️ Cadastrar/mapear **${contadoresPorCategoria.CENTRO_RESULTADO_INVALIDO}** centros de resultado` : ''}
${(contadoresPorCategoria.CLIENTE_DUPLICADO ?? 0) > 0 ? `- ⚠️ Resolver **${contadoresPorCategoria.CLIENTE_DUPLICADO}** clientes duplicados (Onda 2)` : ''}
${(contadoresPorCategoria.CONTRATO_DUPLICADO ?? 0) > 0 ? `- ⚠️ Resolver **${contadoresPorCategoria.CONTRATO_DUPLICADO}** contratos duplicados (Onda 3)` : ''}
${(contadoresPorCategoria.ADITIVO_ORFAO ?? 0) > 0 ? `- ⚠️ Resolver **${contadoresPorCategoria.ADITIVO_ORFAO}** aditivos órfãos` : ''}
${audit.total === 0 ? `- ⚠️ \`ms.audit.v1\` vazio — Onda 5 sem baseline histórico` : ''}

---

## 14. Garantias desta execução

- ✅ Read-only sobre snapshot
- ✅ Zero escrita em Supabase / LS / storage
- ✅ Zero alteração de UI
- ✅ Zero chamada de RPC transacional
- ✅ Compat dupla: snapshots v1 (financeiro-only) e v2 (ampliado)

Spec: \`docs/d15-1-a-0-ii-dry-run-spec.md\`
Checklist Passo 4: \`docs/d15-1-a-0-ii-passo4-checklist.md\`
Detalhe completo: \`${detailPath}\`
`;

writeFileSync(reportPath, md);
writeFileSync(detailPath, JSON.stringify({
  snapshot_path: arquivo,
  snapshot_version: SNAPSHOT_VERSION,
  layer1, layer2,
  cobertura,
  categorias: contadoresPorCategoria,
  lancamentos_resumo: lancResumo,
  lancamentos_rows: lancRows,
  auditoria: { ...audit, entidades_distintas: [...audit.entidades_distintas], acoes_distintas: [...audit.acoes_distintas], atores_distintos: [...audit.atores_distintos] },
  comercial,
  cadastros,
  estoque,
  obras,
  posvenda,
  chaves_extras: chavesExtras,
  totalRegistros, migravel, ajustaveis: ajustaveisGlobal, bloqueantes: bloqueantesGlobal,
  paridadePct, readinessDualRead,
  findings,
}, null, 2));

console.log(`\n✅ Relatório markdown:  ${reportPath}`);
console.log(`✅ Detalhe JSON:        ${detailPath}`);
console.log(`📊 Paridade: ${paridadePct.toFixed(2)}% | Migrável: ${migravel}/${totalRegistros} | Bloqueantes: ${bloqueantesGlobal}`);
console.log(`🎯 Readiness Dual Read: ${readinessDualRead ? 'SIM' : 'NÃO'}`);
console.log(`📦 Cobertura snapshot v${SNAPSHOT_VERSION}: ${Object.keys(cobertura).length} domínios`);

process.exit(readinessDualRead ? 0 : 1);
