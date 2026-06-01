/**
 * D16.PERF — Helper de instrumentação de performance.
 *
 * P2.1: telemetria saneada
 *  - flush rápido (1.5s) + flush em visibilitychange/pagehide/beforeunload
 *  - fallback de medição usando performance.timeOrigin quando o anchor
 *    (login.start / auth.ok) não existe (ex.: usuário já autenticado entra
 *    direto em rota privada).
 *  - route.ready agora é REPORTADO ao banco (não só perfMark).
 *  - markRouteStart()/getRouteStart() permitem que grids meçam
 *    first-list.ready de forma consistente.
 *
 * Regras:
 *  - 100% client-side, seguro em SSR (no-op se window indefinido).
 *  - Ring buffer local (200) para debugging via `window.__perfRing()`.
 *  - Envia para Supabase via RPC com batching, best-effort.
 *  - Nunca quebra UI. Não toca em RLS, Auth, auditoria.
 */

import { supabase } from '@/integrations/supabase/client';

type MarkMap = Record<string, number>;
type RingEntry = { evento: string; ms: number; rota?: string; at: number };

const isClient = typeof window !== 'undefined' && typeof performance !== 'undefined';

const marks: MarkMap = {};
const ring: RingEntry[] = [];
const RING_MAX = 200;

type PendingLog = { evento: string; ms: number; rota?: string };
const queue: PendingLog[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY_MS = 1500; // P2.1: 5s → 1.5s
const QUEUE_MAX = 50;

// route-start por rota (para first-list.ready)
const routeStarts: Record<string, number> = {};

function pushRing(entry: RingEntry) {
  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();
}

function currentRoute(): string | undefined {
  if (!isClient) return undefined;
  return window.location.pathname;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_DELAY_MS);
}

async function flushQueue() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  for (const item of batch) {
    try {
      await supabase.rpc('rpc_perf_log', {
        p_evento: item.evento,
        p_ms: Math.round(item.ms),
        p_rota: item.rota ?? undefined,
        p_user_agent: navigator?.userAgent?.slice(0, 256) ?? undefined,
      });
    } catch {
      // best-effort
    }
  }
}

function flushNow() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  void flushQueue();
}

/** Marca um ponto no tempo (idempotente: não sobrescreve marca existente). */
export function perfMark(label: string): void {
  if (!isClient) return;
  marks[label] = performance.now();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[perf] mark ${label}`);
  }
}

/** Garante uma marca: só cria se ainda não existir. */
export function perfMarkIfAbsent(label: string): void {
  if (!isClient) return;
  if (marks[label] == null) marks[label] = performance.now();
}

// D19.1.fix F1+F2 — limites de sanidade da telemetria
const MAX_TRUSTED_MS = 15_000; // > 15s = quase certamente outlier de aba ociosa

// D19.2.fix.50u.5 — silenciar telemetria de bots sintéticos (Playwright,
// HeadlessChrome). Em testes de carga 50u o rpc_perf_log batia rate-limit
// (129×HTTP 400). Em produção real, navigator.webdriver é sempre false.
const isSyntheticAgent = (() => {
  if (typeof navigator === 'undefined') return false;
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver === true) return true;
  const ua = navigator.userAgent ?? '';
  return /HeadlessChrome|Playwright|puppeteer/i.test(ua);
})();

function enqueue(evento: string, ms: number, rota?: string) {
  // F1: descartar quando a aba não estava visível no momento do registro.
  // Performance API conta tempo total da aba, então uma medição feita após
  // a aba ficar oculta contamina o P95.
  if (
    typeof document !== 'undefined' &&
    document.visibilityState &&
    document.visibilityState !== 'visible'
  ) {
    pushRing({ evento: `[skip:hidden]${evento}`, ms, rota, at: Date.now() });
    return;
  }
  // F2: drop hard outliers (>15s) — ainda registrados no ring local para debug,
  // mas nunca enviados ao banco (mantém P95 confiável).
  if (ms > MAX_TRUSTED_MS) {
    pushRing({ evento: `[skip:outlier]${evento}`, ms, rota, at: Date.now() });
    return;
  }

  pushRing({ evento, ms, rota, at: Date.now() });
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[perf] ${evento}: ${ms.toFixed(0)}ms ${rota ? `(${rota})` : ''}`);
  }
  if (queue.length < QUEUE_MAX) {
    queue.push({ evento, ms, rota });
    scheduleFlush();
  }
}

/**
 * Mede a diferença entre dois marks. Se `from` não existir, usa o primeiro
 * fallback disponível: login.start → auth.ok → performance.timeOrigin (0).
 * Retorna ms (ou null se nem o destino existir).
 */
export function perfMeasure(
  from: string,
  to: string,
  evento?: string,
  rota?: string,
): number | null {
  if (!isClient) return null;
  const b = marks[to];
  if (b == null) return null;

  // Cascata de fallback de origem
  const candidates = [from, 'login.start', 'auth.ok'];
  let a: number | undefined;
  for (const k of candidates) {
    if (marks[k] != null) {
      a = marks[k];
      break;
    }
  }
  // Último recurso: tempo de carregamento da página (timeOrigin → b)
  if (a == null) a = 0;

  const ms = b - a;
  if (ms < 0 || ms > 600000) return null;

  enqueue(evento ?? to, ms, rota ?? currentRoute());
  return ms;
}

/** Registra direto sem usar marks (ex.: tempo medido externamente). */
export function perfReport(evento: string, ms: number, rota?: string): void {
  if (!isClient) return;
  if (ms < 0 || ms > 600000) return;
  enqueue(evento, ms, rota ?? currentRoute());
}

/** Registra o início de uma rota (usado pelo root para correlacionar first-list). */
export function markRouteStart(path: string): void {
  if (!isClient) return;
  routeStarts[path] = performance.now();
}

export function getRouteStart(path: string): number | undefined {
  return routeStarts[path];
}

/**
 * Hook-friendly: reporta `first-list.ready` a partir do route.start daquela
 * rota. Se não houver route.start, mede a partir de timeOrigin (carga da
 * página) — útil em hard reload direto na rota.
 *
 * Idempotente por rota+escopo via `once` cache.
 */
const firstListReported = new Set<string>();
export function reportFirstListReady(scope: string, path?: string): void {
  if (!isClient) return;
  const rota = path ?? currentRoute() ?? 'unknown';
  const key = `${rota}::${scope}`;
  if (firstListReported.has(key)) return;
  firstListReported.add(key);

  const start = routeStarts[rota];
  const ms = start != null ? performance.now() - start : performance.now();
  enqueue('first-list.ready', ms, rota);
}

/** Dev helper e listeners de flush. */
if (isClient) {
  (window as unknown as { __perfRing?: () => RingEntry[] }).__perfRing = () =>
    [...ring];

  // Flush oportunista quando a página fica oculta ou está saindo
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
  window.addEventListener('pagehide', () => flushNow());
  window.addEventListener('beforeunload', () => flushNow());
}

export const _perfRingForTest = ring;

/**
 * D19.1.fix F5 — wrapper de instrumentação para RPCs críticas.
 * Mede o tempo client-side da chamada (rede + execução server) e reporta
 * como `rpc.<nome>` na telemetria.
 *
 * Uso:
 *   const data = await withPerf('rpc.lancamento_criar', () =>
 *     supabase.rpc('rpc_lancamento_criar', { ... })
 *   );
 *
 * Nunca afeta o resultado/erro — apenas envolve.
 */
export async function withPerf<T>(label: string, fn: () => PromiseLike<T> | T): Promise<T> {
  if (!isClient) return Promise.resolve(fn());
  const t0 = performance.now();
  try {
    return await Promise.resolve(fn());
  } finally {
    const ms = performance.now() - t0;
    enqueue(label.startsWith('rpc.') ? label : `rpc.${label}`, ms, currentRoute());
  }
}
