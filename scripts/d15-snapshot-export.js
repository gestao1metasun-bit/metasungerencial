/**
 * D15.1.a.0.ii — Snapshot Canônico do Financeiro
 * ----------------------------------------------------------------------------
 * Operador oficial: Renan Barcelos (Gerência / Financeiro)
 * Máquina oficial: Notebook/PC principal Meta Sun
 * Navegador oficial: Google Chrome (perfil operacional principal)
 * Origem: https://metasungerencial.lovable.app
 * ----------------------------------------------------------------------------
 *
 * USO:
 *   1. Logar em https://metasungerencial.lovable.app/financeiro (operador canônico)
 *   2. Garantir janela de congelamento ativa (ninguém operando títulos)
 *   3. Abrir DevTools (F12) → aba Console
 *   4. Colar TODO este arquivo no console e pressionar Enter
 *   5. Salvar o arquivo baixado em /docs/d15-1-a-0-ii-snapshot-<data>-<hash>.json
 *   6. Registrar arquivo + hash no manifesto §6 de docs/d15-1-a-0-ii-snapshot-manifest.md
 *
 * GARANTIAS:
 *   - read-only sobre localStorage (não escreve, não muta, não envia rede)
 *   - hash SHA-256 do payload bruto via Web Crypto API
 *   - empacotamento determinístico (chaves ordenadas) para hash estável
 *   - inclui metadados de proveniência: operador, máquina, navegador, versão ERP, timestamp
 */

(async () => {
  const STORES = [
    'fin-titulos',
    'fin-renegociacao',
    'fin-estornos',
    'fin-adiantamentos',
    'fin-compras',
    'fin-conciliacao',
    // D15 — Lançamentos vira visão derivada (decisão oficial).
    // Snapshot precisa capturar o LS atual antes do corte para mapear cada
    // lançamento → título/parcela/movimentação no dry-run.
    'metasun.fin.lancamentos.v1',
    'metasun.fin.recorrentes.v1',
    'metasun.fin.centros.v1',
    'metasun.fin.naturezas.v1',
  ];

  const MANIFEST = {
    wave: 'D15.1.a.0.ii',
    purpose: 'snapshot-canonico-financeiro',
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

  // --- 1. ler stores brutas (sem transformação) ----------------------------
  const stores = {};
  const missing = [];
  for (const key of STORES) {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      missing.push(key);
      stores[key] = null;
      continue;
    }
    let parsed = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // mantém raw string se não for JSON parseável
    }
    stores[key] = {
      raw_bytes: new Blob([raw]).size,
      parsed,
    };
  }

  // --- 2. tentar capturar versão ERP visível -------------------------------
  let versao_erp = null;
  try {
    const el = document.querySelector('[data-erp-version], [data-app-version]');
    versao_erp = el?.getAttribute('data-erp-version') ?? el?.getAttribute('data-app-version') ?? null;
  } catch { /* noop */ }

  // --- 3. envelope canônico com chaves ordenadas (para hash estável) -------
  const envelope = {
    manifest: { ...MANIFEST, versao_erp },
    stores_esperadas: STORES,
    stores_ausentes: missing,
    stores,
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

  // --- 4. hash SHA-256 do payload canônico ---------------------------------
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashShort = hashHex.slice(0, 8);

  // --- 5. payload final com hash incorporado -------------------------------
  const final = {
    ...envelope,
    integrity: {
      algo: 'SHA-256',
      hash_full: hashHex,
      hash_short: hashShort,
      canonical_bytes: new Blob([canonical]).size,
    },
  };

  // --- 6. nome do arquivo --------------------------------------------------
  const ts = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
  const filename = `d15-1-a-0-ii-snapshot-${stamp}-${hashShort}.json`;

  // --- 7. resumo no console ------------------------------------------------
  console.group('%c[D15] Snapshot canônico gerado', 'color:#0ea5e9;font-weight:bold');
  console.log('Arquivo:', filename);
  console.log('Hash SHA-256:', hashHex);
  console.log('Bytes canônicos:', final.integrity.canonical_bytes);
  console.log('Stores ausentes:', missing.length ? missing : '(nenhuma)');
  console.table(
    STORES.map((k) => ({
      store: k,
      presente: stores[k] !== null,
      bytes: stores[k]?.raw_bytes ?? 0,
      itens: Array.isArray(stores[k]?.parsed) ? stores[k].parsed.length : (stores[k]?.parsed && typeof stores[k].parsed === 'object' ? Object.keys(stores[k].parsed).length : '—'),
    }))
  );
  console.log('Manifesto:', final.manifest);
  console.groupEnd();

  // --- 8. download automático ----------------------------------------------
  const blob = new Blob([JSON.stringify(final, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  // expor para inspeção manual
  window.__D15_SNAPSHOT__ = final;
  console.log('%cSnapshot disponível em window.__D15_SNAPSHOT__', 'color:#16a34a');
  console.log('%cPróximo passo: salvar arquivo em /docs/ e registrar hash no manifesto §6.', 'color:#f59e0b;font-weight:bold');
})();
