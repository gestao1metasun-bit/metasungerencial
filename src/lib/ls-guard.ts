/**
 * D15.2 — Runtime guard de LocalStorage
 *
 * Intercepta localStorage.setItem em dev e registra/avisa quando uma
 * chave operacional proibida é gravada. Em produção, registra em
 * error_log (categoria=ls-guard) para detectar regressões.
 *
 * Não bloqueia a gravação (evita quebrar telas legadas durante a
 * transição), mas torna toda violação visível.
 */

import { logError } from '@/lib/error-log';

const FORBIDDEN_PREFIXES = [
  'metasun.fin.',
  'ms.fin.',
  'ms.contratos',
  'ms.aditivos',
  'ms.propostas',
  'ms.proposta.',
  'ms.leads',
  'ms.clientes',
  'ms.consultores',
  'ms.gerentes',
  'ms.equipes',
  'ms.usuarios',
  'ms.usuarioAtual',
  'ms.perfis',
  'ms.estoque',
  'ms.compras',
  'ms.engenharia',
  'ms.obras',
  'ms.posvenda',
  'ms.financiamento',
  'ms.cobranca',
  'ms.anexos',
  'ms.workflow',
  'ms.aprovacoes',
  'ms.bancos',
];

let installed = false;
let violationCount = 0;
const recentViolations: Array<{ key: string; at: string; stack?: string }> = [];

function isForbidden(key: string) {
  return FORBIDDEN_PREFIXES.some((p) => key.startsWith(p));
}

export function installLsGuard() {
  if (installed) return;
  if (typeof window === 'undefined') return;
  installed = true;

  const orig = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = function (key: string, value: string) {
    if (isForbidden(key)) {
      violationCount++;
      const violation = {
        key,
        at: new Date().toISOString(),
        stack: new Error().stack?.split('\n').slice(2, 6).join('\n'),
      };
      recentViolations.unshift(violation);
      if (recentViolations.length > 50) recentViolations.pop();

      // Console em dev
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          `[ls-guard] Gravação operacional proibida em LocalStorage: "${key}". ` +
            `Use o repository Supabase oficial.`,
          violation,
        );
      }

      // Async log — não bloqueia gravação
      void logError({
        level: 'warn',
        category: 'ls-guard',
        message: `LS write proibido: ${key}`,
        context: violation,
      }).catch(() => {});
    }
    return orig(key, value);
  };
}

export function getLsGuardStats() {
  return { violationCount, recentViolations: [...recentViolations] };
}
