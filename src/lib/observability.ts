/**
 * Onda D4.6 — Observabilidade mínima.
 *
 * Logger estruturado leve para frontend. Em produção pode plugar em
 * serviço externo (Sentry, Logflare) sem alterar call sites.
 */
type Level = "debug" | "info" | "warn" | "error";
type LogEvent = {
  ts: string;
  level: Level;
  module: string;
  op: string;
  msg?: string;
  ctx?: Record<string, unknown>;
};

const isDev = import.meta.env.DEV;
const buffer: LogEvent[] = [];
const MAX = 200;

function emit(level: Level, module: string, op: string, msg?: string, ctx?: Record<string, unknown>) {
  const ev: LogEvent = { ts: new Date().toISOString(), level, module, op, msg, ctx };
  buffer.push(ev);
  if (buffer.length > MAX) buffer.shift();
  if (isDev || level === "error" || level === "warn") {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](
      `[${module}:${op}]`, msg ?? "", ctx ?? "",
    );
  }
}

export const logger = {
  debug: (m: string, op: string, msg?: string, ctx?: Record<string, unknown>) => emit("debug", m, op, msg, ctx),
  info:  (m: string, op: string, msg?: string, ctx?: Record<string, unknown>) => emit("info",  m, op, msg, ctx),
  warn:  (m: string, op: string, msg?: string, ctx?: Record<string, unknown>) => emit("warn",  m, op, msg, ctx),
  error: (m: string, op: string, msg?: string, ctx?: Record<string, unknown>) => emit("error", m, op, msg, ctx),
  /** Snapshot dos últimos eventos (útil para tela de diagnóstico). */
  snapshot: () => buffer.slice(),
};

/**
 * Wrap async RPC com rastreamento estruturado.
 */
export async function traceRpc<T>(
  module: string,
  op: string,
  fn: () => Promise<T>,
  ctx?: Record<string, unknown>,
): Promise<T> {
  const t0 = performance.now();
  try {
    const out = await fn();
    logger.debug(module, op, "ok", { ms: Math.round(performance.now() - t0), ...ctx });
    return out;
  } catch (e: any) {
    logger.error(module, op, e?.message ?? String(e), {
      ms: Math.round(performance.now() - t0),
      code: e?.code,
      ...ctx,
    });
    throw e;
  }
}
