// D19.2 — Camada B · Teste de carga sintética (Playwright headless)
//
// Uso (do sandbox ou notebook do operador):
//   bun add -d playwright && bunx playwright install chromium
//   BASE_URL=https://metasungerencial.lovable.app \
//   USERS=10 RAMP_MS=15000 HOLD_MS=120000 \
//   CREDS_JSON='[{"email":"loadtest+1@metasun.local","password":"..."}, ...]' \
//   node scripts/d19-2-load-test.mjs
//
// Mede: navegação por 15 rotas-chave, contabiliza tempo até DOMContentLoaded
// + errors de console. Não escreve nada no banco (só leituras).
// O perf_log do app continua coletando auth.ok/shell.ready/module.switch/etc
// via src/lib/perf.ts — depois do run, consultar v_perf_p95_filtrado_7d.

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'https://metasungerencial.lovable.app';
const USERS = Number(process.env.USERS ?? 10);
const RAMP_MS = Number(process.env.RAMP_MS ?? 15_000);
const HOLD_MS = Number(process.env.HOLD_MS ?? 120_000);
const CREDS = JSON.parse(process.env.CREDS_JSON ?? '[]');

if (CREDS.length < USERS) {
  console.error(`Faltam credenciais: ${CREDS.length}/${USERS}`);
  process.exit(2);
}

const ROUTES = [
  '/dashboard',
  '/financeiro#tab=receber',
  '/financeiro#tab=pagar',
  '/operacoes-financeiras',
  '/comercial',
  '/leads',
  '/propostas',
  '/comercial?tab=contratos',
  '/engenharia',
  '/estoque',
  '/solicitacoes-material',
  '/financiamentos',
  '/posvenda',
  '/aprovacoes',
  '/dashboard',
];

const results = [];
const consoleErrors = [];

async function runUser(idx) {
  const cred = CREDS[idx];
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_BIN || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ user: idx, text: msg.text().slice(0, 200) });
  });

  // 1) Login
  const tLoginStart = Date.now();
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
    await page.waitForTimeout(1200); // React hydration
    await page.fill('input[type="email"]', cred.email);
    await page.fill('input[type="password"]', cred.password);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }),
      page.click('button[type="submit"]'),
    ]);
  } catch (e) {
    results.push({ user: idx, route: '/login', ms: -1, error: String(e).slice(0, 200) });
    await browser.close();
    return;
  }
  results.push({ user: idx, route: '/login', ms: Date.now() - tLoginStart });

  // 2) Hold: percorre rotas em loop com think-time aleatório
  const deadline = Date.now() + HOLD_MS;
  let i = 0;
  while (Date.now() < deadline) {
    const route = ROUTES[i++ % ROUTES.length];
    const t0 = Date.now();
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      results.push({ user: idx, route, ms: Date.now() - t0 });
    } catch (e) {
      results.push({ user: idx, route, ms: -1, error: String(e).slice(0, 150) });
    }
    await page.waitForTimeout(2000 + Math.random() * 3000); // think-time 2-5s
  }
  await browser.close();
}

console.log(`▶ D19.2 Camada B · ${USERS} usuários, ramp ${RAMP_MS}ms, hold ${HOLD_MS}ms`);
console.log(`  Base: ${BASE_URL}`);

// D19.2.fix.50u.5 — warm-up controlado do edge worker antes do ramp.
// Separa cold-start real do worker da carga concorrente de login.
console.log('🔥 warm-up edge (3×/login + 1×/dashboard, +4s settle)');
const tWarm = Date.now();
try {
  await Promise.all([
    fetch(`${BASE_URL}/login`, { redirect: 'manual' }).catch(() => {}),
    fetch(`${BASE_URL}/login`, { redirect: 'manual' }).catch(() => {}),
    fetch(`${BASE_URL}/login`, { redirect: 'manual' }).catch(() => {}),
    fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' }).catch(() => {}),
  ]);
  console.log(`  warm-up concluído em ${Date.now() - tWarm}ms`);
} catch (e) {
  console.log(`  warm-up parcial: ${String(e).slice(0, 120)}`);
}
await new Promise((r) => setTimeout(r, 4000));

const tAll = Date.now();
await Promise.all(
  Array.from({ length: USERS }, async (_, i) => {
    await new Promise((r) => setTimeout(r, (i * RAMP_MS) / USERS));
    return runUser(i);
  }),
);
const totalMs = Date.now() - tAll;

// Agregados
const byRoute = {};
for (const r of results) {
  if (!byRoute[r.route]) byRoute[r.route] = { ms: [], err: 0 };
  if (r.ms < 0) byRoute[r.route].err++;
  else byRoute[r.route].ms.push(r.ms);
}
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

console.log('\n📊 Resultado por rota');
console.log('Rota                       N   P50    P95    P99   Erros');
console.log('-------------------------- --- ------ ------ ------ -----');
for (const [route, v] of Object.entries(byRoute)) {
  console.log(
    `${route.padEnd(26)} ${String(v.ms.length).padStart(3)} ${String(pct(v.ms, 0.5)).padStart(6)} ${String(
      pct(v.ms, 0.95),
    ).padStart(6)} ${String(pct(v.ms, 0.99)).padStart(6)} ${String(v.err).padStart(5)}`,
  );
}
console.log(`\n⏱  total wall=${(totalMs / 1000).toFixed(1)}s`);
console.log(`❌ console.error capturados: ${consoleErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.slice(0, 10));

const out = {
  meta: { base: BASE_URL, users: USERS, rampMs: RAMP_MS, holdMs: HOLD_MS, totalMs },
  byRoute,
  consoleErrors,
};
const fs = await import('node:fs');
fs.mkdirSync('/mnt/documents', { recursive: true });
fs.writeFileSync(`/mnt/documents/d19-2-load-${USERS}u-${Date.now()}.json`, JSON.stringify(out, null, 2));
console.log(`\n💾 JSON salvo em /mnt/documents/`);
