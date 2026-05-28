#!/usr/bin/env bun
/**
 * D15.1.a.0.ii — Dry-Run Financeiro Enterprise (comparador read-only)
 * ----------------------------------------------------------------------------
 * Consome o snapshot canônico LS (gerado por scripts/d15-snapshot-export.js)
 * e produz relatório enterprise de migrabilidade contra o esquema oficial
 * Supabase.
 *
 * GARANTIAS:
 *   - Read-only sobre o snapshot (apenas parse).
 *   - NÃO acessa Supabase em runtime (baseline já capturada na spec § 1).
 *   - NÃO escreve em LS / tabelas / storage.
 *   - NÃO altera UI nem executa RPCs transacionais.
 *
 * USO:
 *   bun run scripts/d15-dry-run-compare.ts docs/d15-1-a-0-ii-snapshot-<arq>.json
 *
 * SAÍDA:
 *   - docs/d15-1-a-0-ii-dry-run-report-{YYYYMMDD-HHmm}.md      (humano)
 *   - docs/d15-1-a-0-ii-dry-run-detail-{YYYYMMDD-HHmm}.json    (máquina)
 *   - exit 0 se readiness ≥ 95% e zero INVALIDO/ORFAO; senão 1
 *
 * Spec completa: docs/d15-1-a-0-ii-dry-run-spec.md
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// ----------------------------------------------------------------------------
// Tipos e categorias canônicas (espelham §4 da spec)
// ----------------------------------------------------------------------------

type Categoria =
  | 'OK'
  | 'CONVERTIDO'
  | 'DIVERGENTE'
  | 'ORFAO'
  | 'INCOMPATIVEL'
  | 'DUPLICIDADE'
  | 'STATUS_INVALIDO'
  | 'NATUREZA_INVALIDA'
  | 'CENTRO_RESULTADO_INVALIDO'
  | 'ANEXO_QUEBRADO'
  | 'VINCULO_AUSENTE'
  | 'SEM_DESTINO'
  | 'TRUNCADO'
  | 'INVALIDO'
  | 'PERDA_POTENCIAL'
  | 'SALDO_DIVERGENTE'
  | 'RENEGOCIACAO_INCONSISTENTE'
  // Camada 4 — Lançamentos (metasun.fin.lancamentos.v1)
  | 'CONVERTIVEL_TITULO_RECEBER'
  | 'CONVERTIVEL_TITULO_PAGAR'
  | 'CONVERTIVEL_MOVIMENTACAO_REALIZADA'
  | 'CONVERTIVEL_MOVIMENTACAO_PREVISTA'
  | 'CONVERTIVEL_RECORRENTE'
  | 'LANCAMENTO_SEM_TITULO'
  | 'DATA_INVALIDA'
  | 'VALOR_INVALIDO'
  | 'OBRA_INVALIDA'
  | 'DUPLICIDADE_POTENCIAL';

const STORES_OFICIAIS = [
  'fin-titulos',
  'fin-renegociacao',
  'fin-estornos',
  'fin-adiantamentos',
  'fin-compras',
  'fin-conciliacao',
] as const;

const STORES_LANCAMENTOS = [
  'metasun.fin.lancamentos.v1',
  'metasun.fin.recorrentes.v1',
  'metasun.fin.centros.v1',
  'metasun.fin.naturezas.v1',
] as const;



const STATUS_OFICIAL_TITULO = new Set([
  'ABERTO', 'PARCIAL', 'PAGO', 'VENCIDO', 'CANCELADO', 'RENEGOCIADO',
]);

const TIPO_OFICIAL_TITULO = new Set(['RECEBER', 'PAGAR']);

// Baseline Supabase (capturada antes do dry-run — ver spec §1)
const BASELINE_SUPABASE = {
  titulos_total: 0,
  parcelas_total: 0,
  movimentacoes: 0,
  adiantamentos: 0,
  abatimentos: 0,
  taxas: 0,
  renegociacoes: 0,
  boletos: 0,
  fornecedores: 0,
  extrato_linhas: 0,
  anexos_titulos: 0,
};

interface Finding {
  store: string;
  ref_id: string | number;
  categoria: Categoria;
  detalhe: string;
}

// ----------------------------------------------------------------------------
// 1. CLI / leitura do snapshot
// ----------------------------------------------------------------------------

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

const findings: Finding[] = [];
const layer1: Record<string, boolean | string> = {};
const layer2: Record<string, number> = {};

// ----------------------------------------------------------------------------
// 2. CAMADA 1 — Integridade do snapshot
// ----------------------------------------------------------------------------

layer1.parse_ok = true;
layer1.operador = snapshot?.manifest?.operador?.nome ?? '(ausente)';
layer1.fonte_canonica = layer1.operador === 'Renan Barcelos';
layer1.wave_correta = snapshot?.manifest?.wave === 'D15.1.a.0.ii';

// hash check: recomputa o canonical hash sem o bloco integrity
const stableStringify = (obj: any): string => {
  const seen = new WeakSet();
  const sort = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(sort);
    return Object.keys(v).sort().reduce((acc: any, k) => {
      acc[k] = sort(v[k]);
      return acc;
    }, {});
  };
  return JSON.stringify(sort(obj));
};
const { integrity, ...envelope } = snapshot;
const recomputed = createHash('sha256').update(stableStringify(envelope)).digest('hex');
layer1.hash_declarado = integrity?.hash_full ?? '(ausente)';
layer1.hash_recomputado = recomputed;
layer1.hash_confere = integrity?.hash_full === recomputed;

const stores: Record<string, any> = snapshot?.stores ?? {};
const presentes = STORES_OFICIAIS.filter((k) => stores[k] != null);
const ausentes = STORES_OFICIAIS.filter((k) => stores[k] == null);
layer1.stores_presentes = `${presentes.length}/6`;
layer1.stores_ausentes = ausentes.join(', ') || '(nenhuma)';

// ----------------------------------------------------------------------------
// 3. Normalizadores defensivos
// ----------------------------------------------------------------------------

const arr = (s: any): any[] => {
  const p = s?.parsed;
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object') return Object.values(p);
  return [];
};
const titulos = arr(stores['fin-titulos']);
const renegs = arr(stores['fin-renegociacao']);
const estornos = arr(stores['fin-estornos']);
const adiants = arr(stores['fin-adiantamentos']);
const compras = arr(stores['fin-compras']);
const concilia = arr(stores['fin-conciliacao']);

layer2.titulos_count = titulos.length;
layer2.renegs_count = renegs.length;
layer2.estornos_count = estornos.length;
layer2.adiants_count = adiants.length;
layer2.compras_count = compras.length;
layer2.concilia_count = concilia.length;

// índices auxiliares
const tituloIds = new Set<string>();
const parcelaIds = new Set<string>();
const adiantIds = new Set<string>();

for (const t of titulos) {
  const id = String(t?.id ?? '');
  if (!id) {
    findings.push({ store: 'fin-titulos', ref_id: t?.codigo ?? '(s/ id)', categoria: 'INVALIDO', detalhe: 'título sem id' });
    continue;
  }
  if (tituloIds.has(id)) {
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'DUPLICIDADE', detalhe: `id duplicado` });
  }
  tituloIds.add(id);
  const parcelas = Array.isArray(t?.parcelas) ? t.parcelas : [];
  for (const p of parcelas) {
    const pid = String(p?.id ?? '');
    if (pid) parcelaIds.add(pid);
  }
}
for (const a of adiants) {
  const id = String(a?.id ?? '');
  if (id) adiantIds.add(id);
}

// ----------------------------------------------------------------------------
// 4. CAMADA 2 — Paridade interna (LS ↔ LS)
// ----------------------------------------------------------------------------

// 4.1 Títulos: status, tipo, vínculos, saldo, parcelas
let titulosOrfaosVinculo = 0;
let titulosStatusInvalido = 0;
let titulosTipoInvalido = 0;
let titulosSaldoDivergente = 0;
let parcelasOrfas = 0;
let movsOrfasParcela = 0;

for (const t of titulos) {
  const id = String(t?.id ?? '(s/ id)');
  const tipo = String(t?.tipo ?? '').toUpperCase();
  const status = String(t?.status ?? '').toUpperCase();

  if (tipo && !TIPO_OFICIAL_TITULO.has(tipo)) {
    titulosTipoInvalido++;
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'INCOMPATIVEL', detalhe: `tipo '${tipo}' fora do enum oficial` });
  }
  if (status && !STATUS_OFICIAL_TITULO.has(status)) {
    titulosStatusInvalido++;
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'STATUS_INVALIDO', detalhe: `status '${status}'` });
  }
  if (!t?.natureza_financeira_id && !t?.natureza_id && !t?.natureza) {
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'NATUREZA_INVALIDA', detalhe: 'natureza ausente' });
  }
  if (!t?.centro_resultado_id && !t?.cr_id && !t?.centro_id) {
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'CENTRO_RESULTADO_INVALIDO', detalhe: 'centro de resultado ausente' });
  }
  if (tipo === 'RECEBER' && !t?.cliente_id && !t?.contrato_id && !t?.pv_id) {
    titulosOrfaosVinculo++;
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'VINCULO_AUSENTE', detalhe: 'RECEBER sem cliente/contrato/PV' });
  }
  if (tipo === 'PAGAR' && !t?.fornecedor_id && !t?.fornecedor && !t?.fornecedor_nome) {
    titulosOrfaosVinculo++;
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'VINCULO_AUSENTE', detalhe: 'PAGAR sem fornecedor' });
  }

  const parcelas = Array.isArray(t?.parcelas) ? t.parcelas : [];
  const movs = Array.isArray(t?.movimentacoes) ? t.movimentacoes
              : Array.isArray(t?.baixas) ? t.baixas
              : [];
  const valor = Number(t?.valor ?? 0);
  const totalPago = movs.reduce((s: number, m: any) => s + Number(m?.valor ?? 0), 0);
  if (valor > 0 && totalPago > valor + 0.01) {
    titulosSaldoDivergente++;
    findings.push({ store: 'fin-titulos', ref_id: id, categoria: 'SALDO_DIVERGENTE', detalhe: `pago ${totalPago.toFixed(2)} > valor ${valor.toFixed(2)}` });
  }
  for (const p of parcelas) {
    const ptid = String(p?.titulo_id ?? id);
    if (!tituloIds.has(ptid)) {
      parcelasOrfas++;
      findings.push({ store: 'fin-titulos', ref_id: p?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `parcela aponta para titulo_id ${ptid} inexistente` });
    }
  }
  for (const m of movs) {
    const mpid = m?.parcela_id ? String(m.parcela_id) : null;
    if (mpid && !parcelaIds.has(mpid)) {
      movsOrfasParcela++;
      findings.push({ store: 'fin-titulos', ref_id: m?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `movimentação aponta para parcela_id ${mpid} inexistente` });
    }
  }
}

// 4.2 Renegociações
let renegsOrfas = 0;
for (const r of renegs) {
  const tid = String(r?.titulo_id ?? r?.titulo_origem_id ?? '');
  if (tid && !tituloIds.has(tid)) {
    renegsOrfas++;
    findings.push({ store: 'fin-renegociacao', ref_id: r?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `renegociação aponta para titulo_id ${tid} inexistente` });
  }
  const itens = Array.isArray(r?.itens) ? r.itens : Array.isArray(r?.novas_parcelas) ? r.novas_parcelas : [];
  const somaItens = itens.reduce((s: number, i: any) => s + Number(i?.valor ?? 0), 0);
  const valorTotal = Number(r?.valor_total ?? r?.valor ?? 0);
  if (valorTotal > 0 && Math.abs(somaItens - valorTotal) > 0.05) {
    findings.push({ store: 'fin-renegociacao', ref_id: r?.id ?? '(s/ id)', categoria: 'RENEGOCIACAO_INCONSISTENTE', detalhe: `soma itens ${somaItens.toFixed(2)} ≠ valor_total ${valorTotal.toFixed(2)}` });
  }
}

// 4.3 Estornos
for (const e of estornos) {
  const tid = String(e?.titulo_id ?? '');
  if (tid && !tituloIds.has(tid)) {
    findings.push({ store: 'fin-estornos', ref_id: e?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `estorno aponta para titulo_id ${tid} inexistente` });
  }
  if (!e?.motivo && !e?.observacao) {
    findings.push({ store: 'fin-estornos', ref_id: e?.id ?? '(s/ id)', categoria: 'INCOMPATIVEL', detalhe: 'estorno sem motivo (obrigatório no esquema oficial)' });
  }
}

// 4.4 Adiantamentos
for (const a of adiants) {
  const id = String(a?.id ?? '(s/ id)');
  const valor = Number(a?.valor ?? 0);
  const abatimentos = Array.isArray(a?.abatimentos) ? a.abatimentos
                    : Array.isArray(a?.aplicacoes) ? a.aplicacoes
                    : [];
  const somaAbat = abatimentos
    .filter((b: any) => !b?.estornado)
    .reduce((s: number, b: any) => s + Number(b?.valor ?? 0), 0);
  const saldoDecl = Number(a?.saldo ?? (valor - somaAbat));
  const saldoCalc = valor - somaAbat;
  if (valor > 0 && Math.abs(saldoDecl - saldoCalc) > 0.05) {
    findings.push({ store: 'fin-adiantamentos', ref_id: id, categoria: 'SALDO_DIVERGENTE', detalhe: `saldo declarado ${saldoDecl.toFixed(2)} ≠ calculado ${saldoCalc.toFixed(2)}` });
  }
  if (!a?.direcao && !a?.tipo) {
    findings.push({ store: 'fin-adiantamentos', ref_id: id, categoria: 'INCOMPATIVEL', detalhe: 'direcao (RECEBIDO/PAGO) ausente' });
  }
  for (const b of abatimentos) {
    const aid = String(b?.adiantamento_id ?? id);
    if (!adiantIds.has(aid)) {
      findings.push({ store: 'fin-adiantamentos', ref_id: b?.id ?? '(s/ id)', categoria: 'ORFAO', detalhe: `abatimento aponta para adiantamento_id ${aid} inexistente` });
    }
  }
}

// 4.5 Compras (boletos + fornecedores embutidos)
const fornecsVistos = new Map<string, number>();
for (const c of compras) {
  const id = String(c?.id ?? '(s/ id)');
  const fornecedorKey = String(c?.fornecedor_doc ?? c?.documento ?? c?.fornecedor_nome ?? '').toLowerCase().trim();
  if (fornecedorKey) {
    fornecsVistos.set(fornecedorKey, (fornecsVistos.get(fornecedorKey) ?? 0) + 1);
  } else {
    findings.push({ store: 'fin-compras', ref_id: id, categoria: 'VINCULO_AUSENTE', detalhe: 'compra sem identificação de fornecedor' });
  }
  const itens = Array.isArray(c?.itens) ? c.itens : [];
  if (!itens.length) {
    findings.push({ store: 'fin-compras', ref_id: id, categoria: 'PERDA_POTENCIAL', detalhe: 'compra sem itens detalhados' });
  }
}

// 4.6 Conciliação
const hashLinhasVistos = new Set<string>();
for (const l of concilia) {
  const id = String(l?.id ?? '(s/ id)');
  const h = String(l?.hash_linha ?? l?.hash ?? '');
  if (h) {
    if (hashLinhasVistos.has(h)) {
      findings.push({ store: 'fin-conciliacao', ref_id: id, categoria: 'DUPLICIDADE', detalhe: `hash_linha ${h} duplicado` });
    }
    hashLinhasVistos.add(h);
  } else {
    findings.push({ store: 'fin-conciliacao', ref_id: id, categoria: 'PERDA_POTENCIAL', detalhe: 'linha sem hash_linha (dedup impossível)' });
  }
  if (!l?.conta_id) {
    findings.push({ store: 'fin-conciliacao', ref_id: id, categoria: 'INCOMPATIVEL', detalhe: 'conta_id ausente' });
  }
}

// resumos camada 2
layer2.titulos_orfaos_vinculo = titulosOrfaosVinculo;
layer2.titulos_status_invalido = titulosStatusInvalido;
layer2.titulos_tipo_invalido = titulosTipoInvalido;
layer2.titulos_saldo_divergente = titulosSaldoDivergente;
layer2.parcelas_orfas = parcelasOrfas;
layer2.movs_orfas_parcela = movsOrfasParcela;
layer2.renegs_orfas = renegsOrfas;
layer2.fornecedores_unicos = fornecsVistos.size;

// ----------------------------------------------------------------------------
// 5. CAMADA 3 — Mapeabilidade (já refletida nas findings)
// ----------------------------------------------------------------------------

// Marca como OK tudo que passou sem nenhuma finding bloqueante
const idsComProblema = new Set(findings.map((f) => `${f.store}::${f.ref_id}`));
const totalRegistros = titulos.length + renegs.length + estornos.length + adiants.length + compras.length + concilia.length;

const contadoresPorCategoria: Record<Categoria | 'OK', number> = {
  OK: 0,
  CONVERTIDO: 0,
  DIVERGENTE: 0,
  ORFAO: 0,
  INCOMPATIVEL: 0,
  DUPLICIDADE: 0,
  STATUS_INVALIDO: 0,
  NATUREZA_INVALIDA: 0,
  CENTRO_RESULTADO_INVALIDO: 0,
  ANEXO_QUEBRADO: 0,
  VINCULO_AUSENTE: 0,
  SEM_DESTINO: 0,
  TRUNCADO: 0,
  INVALIDO: 0,
  PERDA_POTENCIAL: 0,
  SALDO_DIVERGENTE: 0,
  RENEGOCIACAO_INCONSISTENTE: 0,
};
for (const f of findings) contadoresPorCategoria[f.categoria]++;
contadoresPorCategoria.OK = Math.max(0, totalRegistros - idsComProblema.size);

const bloqueantes = contadoresPorCategoria.INVALIDO + contadoresPorCategoria.ORFAO + contadoresPorCategoria.INCOMPATIVEL;
const ajustaveis = contadoresPorCategoria.DIVERGENTE + contadoresPorCategoria.STATUS_INVALIDO
                 + contadoresPorCategoria.NATUREZA_INVALIDA + contadoresPorCategoria.CENTRO_RESULTADO_INVALIDO
                 + contadoresPorCategoria.VINCULO_AUSENTE + contadoresPorCategoria.SALDO_DIVERGENTE
                 + contadoresPorCategoria.RENEGOCIACAO_INCONSISTENTE + contadoresPorCategoria.DUPLICIDADE;
const migravel = contadoresPorCategoria.OK + contadoresPorCategoria.CONVERTIDO;
const paridadePct = totalRegistros > 0 ? (migravel / totalRegistros) * 100 : 0;
const readinessDualRead = paridadePct >= 95 && bloqueantes === 0;

// ----------------------------------------------------------------------------
// 6. Geração de relatórios
// ----------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const ts = new Date();
const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
const reportPath = `docs/d15-1-a-0-ii-dry-run-report-${stamp}.md`;
const detailPath = `docs/d15-1-a-0-ii-dry-run-detail-${stamp}.json`;

const md = `# D15.1.a.0.ii — Dry-Run Report

- **Snapshot**: \`${arquivo}\`
- **Hash declarado**: \`${layer1.hash_declarado}\`
- **Hash recomputado**: \`${layer1.hash_recomputado}\`
- **Hash confere**: ${layer1.hash_confere ? '✅' : '❌'}
- **Operador**: ${layer1.operador} ${layer1.fonte_canonica ? '✅ canônico' : '❌ NÃO canônico'}
- **Wave declarada**: ${snapshot?.manifest?.wave ?? '—'} ${layer1.wave_correta ? '✅' : '❌'}
- **Executado**: ${ts.toISOString()}
- **Baseline Supabase**: ${JSON.stringify(BASELINE_SUPABASE)} (todas zero — esperado)

---

## Camada 1 — Integridade do snapshot

| Item | Resultado |
|---|---|
| Parse OK | ${layer1.parse_ok ? '✅' : '❌'} |
| Hash SHA-256 confere | ${layer1.hash_confere ? '✅' : '❌'} |
| Fonte canônica (Renan Barcelos) | ${layer1.fonte_canonica ? '✅' : '❌'} |
| Wave correta | ${layer1.wave_correta ? '✅' : '❌'} |
| Stores presentes | ${layer1.stores_presentes} |
| Stores ausentes | ${layer1.stores_ausentes} |

---

## Camada 2 — Paridade interna (LS ↔ LS)

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

## Camada 3 — Mapeabilidade ao esquema oficial

| Categoria | Contagem |
|---|---:|
${Object.entries(contadoresPorCategoria).map(([c, n]) => `| \`${c}\` | ${n} |`).join('\n')}

---

## Sumário enterprise

| Indicador | Valor |
|---|---:|
| Total registros analisados | ${totalRegistros} |
| Migrável (OK + CONVERTIDO) | ${migravel} |
| Ajustável (com normalização) | ${ajustaveis} |
| Bloqueado (INVALIDO + ORFAO + INCOMPATIVEL) | ${bloqueantes} |
| Paridade percentual | **${paridadePct.toFixed(2)}%** |
| **Readiness para Dual Read** | **${readinessDualRead ? '✅ SIM' : '❌ NÃO'}** |

---

## Decisões pendentes antes de D15.1.a.0.iii

${bloqueantes > 0 ? `- ❌ Resolver **${bloqueantes}** registros bloqueantes (ver detail JSON)` : '- ✅ Zero registros bloqueantes'}
${contadoresPorCategoria.NATUREZA_INVALIDA > 0 ? `- ⚠️ Cadastrar/mapear **${contadoresPorCategoria.NATUREZA_INVALIDA}** naturezas financeiras` : ''}
${contadoresPorCategoria.CENTRO_RESULTADO_INVALIDO > 0 ? `- ⚠️ Cadastrar/mapear **${contadoresPorCategoria.CENTRO_RESULTADO_INVALIDO}** centros de resultado` : ''}
${contadoresPorCategoria.STATUS_INVALIDO > 0 ? `- ⚠️ Mapear **${contadoresPorCategoria.STATUS_INVALIDO}** status legados para enum oficial` : ''}
${contadoresPorCategoria.PERDA_POTENCIAL > 0 ? `- ⚠️ Aprovar **${contadoresPorCategoria.PERDA_POTENCIAL}** casos de perda potencial documentada` : ''}
${contadoresPorCategoria.VINCULO_AUSENTE > 0 ? `- ⚠️ Resolver **${contadoresPorCategoria.VINCULO_AUSENTE}** vínculos ausentes (cliente/contrato/PV/fornecedor)` : ''}

---

## Garantias desta execução

- ✅ Read-only sobre snapshot
- ✅ Zero escrita em Supabase
- ✅ Zero alteração no localStorage
- ✅ Zero alteração de UI
- ✅ Zero chamada de RPC transacional

Spec: \`docs/d15-1-a-0-ii-dry-run-spec.md\`
Detalhe completo: \`${detailPath}\`
`;

writeFileSync(reportPath, md);
writeFileSync(detailPath, JSON.stringify({
  snapshot_path: arquivo,
  layer1,
  layer2,
  categorias: contadoresPorCategoria,
  totalRegistros,
  migravel,
  ajustaveis,
  bloqueantes,
  paridadePct,
  readinessDualRead,
  findings,
}, null, 2));

console.log(`\n✅ Relatório markdown:  ${reportPath}`);
console.log(`✅ Detalhe JSON:        ${detailPath}`);
console.log(`📊 Paridade: ${paridadePct.toFixed(2)}% | Migrável: ${migravel}/${totalRegistros} | Bloqueantes: ${bloqueantes}`);
console.log(`🎯 Readiness Dual Read: ${readinessDualRead ? 'SIM' : 'NÃO'}`);

process.exit(readinessDualRead ? 0 : 1);
