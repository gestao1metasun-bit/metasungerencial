// D19.2.fix.50u.6 — Login-only load test (investigação profunda do /login frio)
//
// Roda N sessões em paralelo, abre SOMENTE /login, autentica, e captura o
// timeline granular instrumentado em src/routes/login.tsx + src/lib/perf.ts:
//   t_navigate         goto(/login) → DOMContentLoaded   (rede + edge cold + parse inicial)
//   t_react_ready      DCL          → login.react.ready  (hidratação React + 1º paint)
//   t_supabase_ready   DCL          → login.supabase.ready (auth-store hidratação inicial)
//   t_auth             login.auth.start → login.auth.ok  (signInWithPassword puro)
//   t_redirect         login.redirect.start → /dashboard montado
//   t_total            goto(/login) → /dashboard montado
//
// NÃO navega para módulos, NÃO carrega AppLayout (até o redirect).
// Para isolar o login frio rode com USERS=10 RAMP_MS=10000 e depois USERS=50 RAMP_MS=30000.
//
// Uso:
//   BASE_URL=https://metasungerencial.lovable.app \
//   USERS=10 RAMP_MS=10000 \
//   CREDS_JSON='[{"email":"...","password":"..."}, ...]' \
//   node scripts/d19-2-login-only.mjs

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'https://metasungerencial.lovable.app';
const USERS    = Number(process.env.USERS ?? 10);
const RAMP_MS  = Number(process.env.RAMP_MS ?? 10_000);
const CREDS    = JSON.parse(process.env.CREDS_JSON ?? '[]');
const OUT      = process.env.OUT ?? `docs/d19-2-login-only-${USERS}u.json`;

if (CREDS.length < USERS) {
  console.error(`Faltam credenciais: ${CREDS.length}/${USERS}`);
  process.exit(2);
}

const samples = []; // { user, t_navigate, t_react_ready, t_supabase_ready, t_auth, t_redirect, t_total, error? }
const consoleErrors = [];

async function runUser(idx) {
  const cred = CREDS[idx];
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_BIN || undefined,
  });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ user: idx, text: msg.text().slice(0, 200) });
  });

  const rec = { user: idx };
  const t0 = Date.now();
  try {
    // 1) Navegação + parse
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    rec.t_navigate = Date.now() - t0;

    // 2) Espera o formulário aparecer (React hidratou)
    await page.waitForSelector('input[type="email"]', { timeout: 30_000 });

    // 3) Submete
    await page.fill('input[type="email"]', cred.email);
    await page.fill('input[type="password"]', cred.password);
    const tSubmit = Date.now();
    await Promise.all([
      page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 }),
      page.click('button[type="submit"]'),
    ]);
    rec.t_total = Date.now() - t0;
    rec.t_submit_to_dashboard = Date.now() - tSubmit;

    // 4) Lê marks granulares expostos por src/lib/perf.ts
    // OBS: a página agora é /dashboard. Os marks foram criados em /login mas
    // continuam no `marks` map (mesma instância de módulo).
    const marks = await page.evaluate(() => {
      const fn = window.__perfMarks;
      return typeof fn === 'function' ? fn() : null;
    });
    if (marks) {
      const pm = marks['login.page.mount'];
      const rr = marks['login.react.ready'];
      const sr = marks['login.supabase.ready'];
      const as = marks['login.auth.start'];
      const ao = marks['login.auth.ok'];
      const rs = marks['login.redirect.start'];
      const ro = marks['login.redirect.ok'];
      if (pm != null && rr != null) rec.t_react_ready    = Math.round(rr - pm);
      if (pm != null && sr != null) rec.t_supabase_ready = Math.round(sr - pm);
      if (as != null && ao != null) rec.t_auth           = Math.round(ao - as);
      if (rs != null && ro != null) rec.t_redirect       = Math.round(ro - rs);
      rec.marks = marks;
    } else {
      rec.warn = 'window.__perfMarks indisponível (build antigo?)';
    }
  } catch (e) {
    rec.error = String(e).slice(0, 240);
  } finally {
    await browser.close();
  }
  samples.push(rec);
}

function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1);
  return s[Math.max(0, i)];
}
function stats(field) {
  const v = samples.map((s) => s[field]).filter((x) => typeof x === 'number' && x >= 0);
  return {
    n: v.length,
    p50: pct(v, 50),
    p95: pct(v, 95),
    p99: pct(v, 99),
    min: v.length ? Math.min(...v) : null,
    max: v.length ? Math.max(...v) : null,
    avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null,
  };
}

async function main() {
  console.log(`[d19-2-login-only] USERS=${USERS} RAMP_MS=${RAMP_MS} BASE_URL=${BASE_URL}`);
  const tasks = [];
  for (let i = 0; i < USERS; i++) {
    tasks.push(
      new Promise((r) => setTimeout(r, Math.floor((i / Math.max(1, USERS - 1)) * RAMP_MS))).then(() =>
        runUser(i),
      ),
    );
  }
  await Promise.all(tasks);

  const summary = {
    base_url: BASE_URL,
    users: USERS,
    ramp_ms: RAMP_MS,
    timestamp: new Date().toISOString(),
    ok: samples.filter((s) => !s.error).length,
    error: samples.filter((s) => s.error).length,
    console_errors: consoleErrors.length,
    phases: {
      t_navigate:        stats('t_navigate'),         // rede + edge cold + parse
      t_react_ready:     stats('t_react_ready'),      // hidratação React (mount→1º paint)
      t_supabase_ready:  stats('t_supabase_ready'),   // auth-store inicial (mount→loading=false)
      t_auth:            stats('t_auth'),             // signInWithPassword puro
      t_redirect:        stats('t_redirect'),         // redirect.start → redirect.ok
      t_submit_to_dashboard: stats('t_submit_to_dashboard'),
      t_total:           stats('t_total'),            // /login → /dashboard
    },
    sample_console_errors: consoleErrors.slice(0, 20),
    samples,
  };

  console.log(JSON.stringify(summary.phases, null, 2));
  console.log(`OK=${summary.ok}/${USERS}  ERR=${summary.error}  consoleErr=${summary.console_errors}`);
  writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(`→ ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
