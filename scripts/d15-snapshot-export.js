/**
 * D15.1.a.0.ii — Snapshot Canônico Meta Sun (AMPLIADO — Passo 2)
 * ----------------------------------------------------------------------------
 * Operador oficial: Renan Barcelos (Gerência / Financeiro)
 * Máquina oficial: Notebook/PC principal Meta Sun
 * Navegador oficial: Google Chrome (perfil operacional principal)
 * Origem: https://metasungerencial.lovable.app
 * ----------------------------------------------------------------------------
 *
 * Cobertura desta versão (Passo 2 — pré Onda 1.B / 1.C / 3 / 5):
 *   • Financeiro (já existente)        — ms.fin.* + metasun.fin.*
 *   • Auditoria CRÍTICA                — ms.audit.v1 (Onda 5)
 *   • Comercial / Contratos CRÍTICOS   — contratos, propostas, leads, aditivos,
 *                                        clientes, kanban, overrides
 *   • Engenharia / Obras (ALTA)        — snapshot Kanban + finalização
 *   • Estoque (ALTA)                   — itens, movimentos, log, necessidades,
 *                                        compras em trânsito
 *   • Pós-venda (ALTA)                 — chamados, gatilhos, tipos, sequência
 *   • Cadastros (complementar)         — consultores, gerentes, equipes, bancos,
 *                                        perfis, usuários, identidade
 *   • Engenharia FV (complementar)     — params, módulos, inversores, tarifas,
 *                                        irradiação, cidades, concessionárias,
 *                                        distribuidoras, custos, origens, config
 *   • UI/preferências (diagnóstico)    — visão tabela/kanban propostas
 *   • Catch-all                        — qualquer ms.* / metasun.* / fin-*
 *                                        ainda não enumerado é capturado em
 *                                        `stores_extras` (não quebra mapa oficial,
 *                                        mas evita perda de histórico oculto)
 *
 * USO:
 *   1. Logar em https://metasungerencial.lovable.app/financeiro (operador canônico)
 *   2. Garantir janela de congelamento ativa (ninguém operando)
 *   3. Abrir DevTools (F12) → aba Console
 *   4. Colar TODO este arquivo no console e pressionar Enter
 *   5. Salvar arquivo baixado em /docs/d15-1-a-0-ii-snapshot-<data>-<hash>.json
 *   6. Registrar arquivo + hash no manifesto §6 de
 *      docs/d15-1-a-0-ii-snapshot-manifest.md
 *
 * GARANTIAS:
 *   - read-only sobre localStorage (não escreve, não muta, não envia rede)
 *   - hash SHA-256 do payload bruto via Web Crypto API
 *   - empacotamento determinístico (chaves ordenadas) para hash estável
 *   - inclui metadados de proveniência: operador, máquina, navegador, ERP, ts
 */

(async () => {
  // =========================================================================
  // 1. CATÁLOGO OFICIAL DE CHAVES (agrupado por domínio + prioridade)
  // =========================================================================
  const CATALOG = {
    financeiro: [
      // legado / agregado (mantém compat com snapshots anteriores)
      'fin-titulos',
      'fin-renegociacao',
      'fin-estornos',
      'fin-adiantamentos',
      'fin-compras',
      'fin-conciliacao',
      // canônico atual
      'ms.fin.titulos.v1',
      'ms.fin.renegociacoes.v1',
      'ms.fin.rescisoes.v1',
      'ms.fin.adiantamentos.v1',
      'ms.fin.compras.v1',
      'ms.fin.conciliacao.v1',
      'ms.fin.fornecedores.v1',
      'ms.fin.pendencias.v1',
      'ms.fin.fechamentos.v1',
      'ms.fin.fechamentos.v2',
      'ms.fin.contas.v1',
      'ms.fin.contas.v2',
      'ms.fin.centros.v2',
      'ms.fin.naturezas.v2',
      'ms.fin.grupos.v1',
      'ms.fin.subgrupos.v1',
      'ms.fin.meios.v1',
      'ms.fin.tipos-aplicacao.v1',
      'ms.fin.parametros.v1',
      'fin-parametros',
      // lançamentos (vira visão derivada — snapshot obrigatório p/ dry-run)
      'metasun.fin.lancamentos.v1',
      'metasun.fin.recorrentes.v1',
      'metasun.fin.centros.v1',
      'metasun.fin.naturezas.v1',
    ],
    auditoria: [
      // CRÍTICO — Onda 5. Hoje é o único registro de troca de consultor,
      // mudança de origem, aprovação de proposta, geração de contrato, envio
      // p/ engenharia, cancelamentos, reaberturas.
      'ms.audit.v1',
    ],
    comercial_contratos: [
      // CRÍTICO — Onda 3
      'ms.contratos.v2',
      'ms.contratos.lastSync',
      'contrato-base-overrides-v1',
      'ms.aditivos.v1',
      'ms.fv.propostas.v1',
      'ms.fv.proposta_config.v1',
      'ms.fv.kanban.cols.v5',
      'ms.fv.kanban.assign-leads.v1',
      'ms.clientes.full.v1',
      'ms.clientes.extra.v1',
    ],
    engenharia_obras: [
      // ALTA — pré Onda 1.C (vincula obra à matriz financeira)
      'ms.engenharia.obras.kanban',
      'ms.engenharia.obras.snapshot.v1',
      'ms.obras.finalizacao.v1',
    ],
    estoque: [
      // ALTA — feed das movimentações operacionais ainda em LS
      'ms.estoque.itens.v1',
      'ms.estoque.mov.v1',
      'ms.estoque.log.v1',
      'ms.estoque.necessidades.v1',
      'ms.estoque.compras.transito.v1',
    ],
    posvenda: [
      // ALTA — Onda pós-venda futura
      'ms.posvenda.chamados.v1',
      'ms.posvenda.tipos.v1',
      'ms.posvenda.gatilhos.v1',
      'ms.posvenda.seq.v1',
    ],
    cadastros_identidade: [
      // complementar — referenciais usados por contratos/propostas/financeiro
      'ms.consultores.v1',
      'ms.gerentes.v1',
      'ms.equipes.v1',
      'ms.bancos.v1',
      'ms.perfis.v1',
      'ms.usuarios.v1',
      'ms.usuarioAtual.v1',
    ],
    engenharia_fv: [
      // complementar — base técnica de propostas FV
      'ms.fv.params.v1',
      'ms.fv.modulos.v1',
      'ms.fv.inversores.v2',
      'ms.fv.tarifas.v1',
      'ms.fv.hist_irradiacao.v1',
      'ms.fv.cidades.v3',
      'ms.fv.concs.v3',
      'ms.fv.distribs.v1',
      'ms.fv.custos.v1',
      'ms.fv.origens-captacao.v1',
    ],
    ui_preferencias: [
      // diagnóstico — entender se UI ficou divergente entre operadores
      'ms.fv.propostas.view',
      'ms.fv.propostas.tabela.hidden.v2',
      'ms.fv.propostas.tabela.order.v2',
      'ms.fv.propostas.tabela.widths.v2',
    ],
  };

  const MANIFEST = {
    wave: 'D15.1.a.0.ii',
    passo: 'Passo 2 — snapshot ampliado (audit + comercial + estoque + obras + pós-venda)',
    purpose: 'snapshot-canonico-meta-sun',
    operador: {
      nome: 'Renan Barcelos',
      funcao: 'Gerência / Financeiro',
    },
    maquina: {
      descricao: 'Notebook/PC principal — operação financeira diária Meta Sun',
      navegador: 'Google Chrome',
      perfil: 'Perfil operacional principal Meta Sun',
    },
    origem: location.origin + location.pathname,
    user_agent: navigator.userAgent,
    timestamp_iso: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // =========================================================================
  // 2. LEITURA — chaves enumeradas + catch-all
  // =========================================================================
  const readKey = (key) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return { present: false, raw_bytes: 0, parsed: null };
    let parsed = raw;
    try { parsed = JSON.parse(raw); } catch { /* mantém string */ }
    return { present: true, raw_bytes: new Blob([raw]).size, parsed };
  };

  const stores_por_dominio = {};
  const stores_flat = {};
  const ausentes_por_dominio = {};
  const enumeradas = new Set();

  for (const [dominio, keys] of Object.entries(CATALOG)) {
    stores_por_dominio[dominio] = {};
    ausentes_por_dominio[dominio] = [];
    for (const k of keys) {
      enumeradas.add(k);
      const r = readKey(k);
      stores_por_dominio[dominio][k] = r;
      stores_flat[k] = r;
      if (!r.present) ausentes_por_dominio[dominio].push(k);
    }
  }

  // catch-all — varre qualquer ms.* / metasun.* / fin-* / contrato-* não enumerado
  const stores_extras = {};
  const padraoExtras = /^(ms\.|metasun\.|fin-|contrato-)/;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || enumeradas.has(k)) continue;
    if (!padraoExtras.test(k)) continue;
    stores_extras[k] = readKey(k);
  }

  // =========================================================================
  // 3. metadado adicional
  // =========================================================================
  let versao_erp = null;
  try {
    const el = document.querySelector('[data-erp-version], [data-app-version]');
    versao_erp = el?.getAttribute('data-erp-version') ?? el?.getAttribute('data-app-version') ?? null;
  } catch { /* noop */ }

  // =========================================================================
  // 4. envelope canônico
  // =========================================================================
  const envelope = {
    manifest: { ...MANIFEST, versao_erp },
    catalogo: CATALOG,
    cobertura_resumo: Object.fromEntries(
      Object.entries(stores_por_dominio).map(([d, obj]) => [
        d,
        {
          total: Object.keys(obj).length,
          presentes: Object.values(obj).filter((v) => v.present).length,
          ausentes: ausentes_por_dominio[d],
          bytes: Object.values(obj).reduce((s, v) => s + (v.raw_bytes || 0), 0),
        },
      ])
    ),
    stores_por_dominio,
    stores_extras,
    contadores: {
      total_keys_localStorage: localStorage.length,
      total_enumeradas: enumeradas.size,
      total_extras_capturadas: Object.keys(stores_extras).length,
    },
  };

  const stableStringify = (obj) => {
    const seen = new WeakSet();
    const sort = (v) => {
      if (v === null || typeof v !== 'object') return v;
      if (seen.has(v)) return '[circular]';
      seen.add(v);
      if (Array.isArray(v)) return v.map(sort);
      return Object.keys(v).sort().reduce((acc, k) => {
        acc[k] = sort(v[k]);
        return acc;
      }, {});
    };
    return JSON.stringify(sort(obj));
  };

  const canonical = stableStringify(envelope);

  // =========================================================================
  // 5. hash SHA-256
  // =========================================================================
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashShort = hashHex.slice(0, 8);

  const final = {
    ...envelope,
    integrity: {
      algo: 'SHA-256',
      hash_full: hashHex,
      hash_short: hashShort,
      canonical_bytes: new Blob([canonical]).size,
      schema_version: 'd15-snapshot/v2-ampliado',
    },
  };

  // =========================================================================
  // 6. arquivo + resumo
  // =========================================================================
  const ts = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
  const filename = `d15-1-a-0-ii-snapshot-${stamp}-${hashShort}.json`;

  console.group('%c[D15] Snapshot canônico AMPLIADO gerado', 'color:#0ea5e9;font-weight:bold');
  console.log('Arquivo:', filename);
  console.log('Hash SHA-256:', hashHex);
  console.log('Bytes canônicos:', final.integrity.canonical_bytes);
  console.log('Total chaves LS:', localStorage.length, '| enumeradas:', enumeradas.size, '| extras capturadas:', Object.keys(stores_extras).length);
  console.table(
    Object.entries(final.cobertura_resumo).map(([dominio, r]) => ({
      dominio,
      presentes: r.presentes,
      total: r.total,
      bytes: r.bytes,
      ausentes: r.ausentes.length,
    }))
  );
  if (Object.keys(stores_extras).length) {
    console.warn('[D15] Chaves ms.*/metasun.* extras capturadas (não enumeradas no catálogo):',
      Object.keys(stores_extras));
  }
  console.log('Manifesto:', final.manifest);
  console.groupEnd();

  // =========================================================================
  // 7. download automático
  // =========================================================================
  const blob = new Blob([JSON.stringify(final, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  window.__D15_SNAPSHOT__ = final;
  console.log('%cSnapshot disponível em window.__D15_SNAPSHOT__', 'color:#16a34a');
  console.log('%cPróximo passo: salvar arquivo em /docs/ e registrar hash no manifesto §6.', 'color:#f59e0b;font-weight:bold');
})();
