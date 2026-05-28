/**
 * D16.PERF — Helper de instrumentação de performance.
 *
 * Uso:
 *   perfMark('login.start')
 *   perfMark('auth.ok')
 *   const ms = perfMeasure('login.start', 'auth.ok') // grava em ring + envia rpc_perf_log
 *
 * Regras:
 * - 100% client-side, seguro em SSR (no-op se window indefinido).
 * - Ring buffer local (200) para debugging via `window.__perfRing()`.
 * - Envia para Supabase via RPC com batching (5s) e best-effort (nunca quebra UI).
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
const FLUSH_DELAY_MS = 5000;
const QUEUE_MAX = 50;

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
      // best-effort: nunca quebra UI
    }
  }
}

/** Marca um ponto no tempo. */
export function perfMark(label: string): void {
  if (!isClient) return;
  marks[label] = performance.now();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[perf] mark ${label}`);
  }
}

/**
 * Mede a diferença entre dois marks, registra no ring buffer e envia para Supabase.
 * Retorna ms (ou null se algum mark faltar).
 */
export function perfMeasure(from: string, to: string, evento?: string, rota?: string): number | null {
  if (!isClient) return null;
  const a = marks[from];
  const b = marks[to];
  if (a == null || b == null) return null;
  const ms = b - a;
  if (ms < 0 || ms > 600000) return null;

  const ev = evento ?? to;
  const r = rota ?? currentRoute();

  pushRing({ evento: ev, ms, rota: r, at: Date.now() });

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[perf] ${ev}: ${ms.toFixed(0)}ms ${r ? `(${r})` : ''}`);
  }

  if (queue.length < QUEUE_MAX) {
    queue.push({ evento: ev, ms, rota: r });
    scheduleFlush();
  }
  return ms;
}

/** Registra direto sem usar marks (ex: tempo medido externamente). */
export function perfReport(evento: string, ms: number, rota?: string): void {
  if (!isClient) return;
  if (ms < 0 || ms > 600000) return;
  const r = rota ?? currentRoute();
  pushRing({ evento, ms, rota: r, at: Date.now() });
  if (queue.length < QUEUE_MAX) {
    queue.push({ evento, ms, rota: r });
    scheduleFlush();
  }
}

/** Dev helper: ver buffer no console. */
if (isClient) {
  (window as unknown as { __perfRing?: () => RingEntry[] }).__perfRing = () => [...ring];
  // Flush ao sair da página
  window.addEventListener('beforeunload', () => {
    void flushQueue();
  });
}

export const _perfRingForTest = ring;
