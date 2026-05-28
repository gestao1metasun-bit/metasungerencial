/**
 * D15 Onda 6 — Helper oficial de idempotência client-side.
 *
 * Usar antes de qualquer RPC crítica (baixa, estorno, renegociação, envio).
 * Garante que o mesmo request_id (gerado pelo client) só executa uma vez.
 */
import { supabase } from '@/integrations/supabase/client';

export function novoRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Verifica se a operação já foi executada.
 * Se sim → retorna o resultado anterior.
 * Se não → reserva o request_id e devolve {cached:false}; chame `commit` ao final.
 */
export async function checarIdempotencia(
  requestId: string,
  rpcNome: string,
  payload: unknown = {}
): Promise<{ cached: boolean; resultado: unknown | null }> {
  const { data, error } = await supabase.rpc('rpc_idempotente_check', {
    _request_id: requestId,
    _rpc_nome: rpcNome,
    _payload: (payload ?? {}) as never,
  });
  if (error) throw error;
  const d = (data ?? {}) as { cached?: boolean; resultado?: unknown };
  return { cached: !!d.cached, resultado: d.resultado ?? null };
}

export async function commitIdempotencia(requestId: string, resultado: unknown): Promise<void> {
  const { error } = await supabase.rpc('rpc_idempotente_commit', {
    _request_id: requestId,
    _resultado: (resultado ?? null) as never,
  });
  if (error) throw error;
}

/**
 * Wrapper utilitário: executa `fn` apenas se ainda não tiver sido executada
 * para o mesmo `requestId`. Caso contrário devolve o resultado cacheado.
 */
export async function executarComIdempotencia<T>(
  requestId: string,
  rpcNome: string,
  payload: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const check = await checarIdempotencia(requestId, rpcNome, payload);
  if (check.cached) return check.resultado as T;
  const result = await fn();
  await commitIdempotencia(requestId, result as unknown);
  return result;
}
