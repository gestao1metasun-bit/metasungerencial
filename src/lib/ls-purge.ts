/**
 * D15.2 — Purga oficial de LocalStorage legado
 *
 * Função única, auditável, idempotente. Remove TODA chave operacional
 * herdada da fase de homologação preservando apenas:
 *   - preferências visuais (tema, densidade, larguras, abas, kanban)
 *   - feature flags (`ff:*`, `d15_*`)
 *   - cache transitório autorizado (`ms.cache.*`, `ms.draft.*`)
 *
 * Diretriz oficial: TODOS os dados existentes em LS são considerados
 * homologação/teste/simulação. Nenhuma chave operacional é preservada.
 *
 * Execução:
 *   - manual via /paineis/saude-sistema (botão "Purgar legado LS")
 *   - registra evento em audit_log + error_log (info)
 *   - rodar 1x por máquina; idempotente (rodar de novo só remove resíduo)
 */

import { logError } from '@/lib/error-log';

const WHITELIST_PREFIX = [
  // UI / preferências
  'theme',
  'sidebar',
  'grid-density',
  'columns-',
  'col-width-',
  'col-order-',
  'tab-',
  'ui-',
  'view-',
  'enterprise-shell',
  'd6-',
  'favoritos-recentes',
  'kanban-',
  'preview-device',
  'toolbar-',
  'panel-',
  'drawer-',
  'active-tab',
  'ms.ui.',
  'ms.pref.',
  'ms.grid.', // larguras/ordens de coluna são UI
  // feature flags
  'ff:',
  'd15_',
  'D15_',
  'feature-',
  'flag-',
  // cache transitório autorizado
  'ms.cache.',
  'ms.draft.',
  // Supabase auth (gerenciado pelo client oficial)
  'sb-',
  'supabase.auth.',
];

const FORBIDDEN_EXACT = [
  // financeiro
  'metasun.fin.lancamentos.v1',
  'metasun.fin.recorrentes.v1',
  'ms.bancos.v1',
  'ms.fin.adiantamentos.v1',
  'ms.fin.centros.v2',
  'ms.fin.conciliacao.v1',
  'ms.fin.contas.v1',
  'ms.fin.contas.v2',
  'ms.fin.fechamentos.v1',
  'ms.fin.fechamentos.v2',
  'ms.fin.fornecedores.v1',
  'ms.fin.grupos.v1',
  'ms.fin.meios.v1',
  'ms.fin.naturezas.v2',
  'ms.fin.parametros.v1',
  'ms.fin.pendencias.v1',
  'ms.fin.renegociacoes.v1',
  'ms.fin.rescisoes.v1',
  'ms.fin.subgrupos.v1',
  'ms.fin.tipos-aplicacao.v1',
  'ms.fin.titulos.v1',
  // contratos
  'ms.contratos.v2',
  'ms.contratos.lastSync',
  'ms.aditivos.v1',
  'contrato-base-overrides-v1',
  // comercial
  'ms.clientes.full.v1',
  'ms.clientes.extra.v1',
  'ms.consultores.v1',
  'ms.gerentes.v1',
  'ms.equipes.v1',
  // governança
  'ms.usuarios.v1',
  'ms.usuarioAtual.v1',
  'ms.perfis.v1',
  // estoque / compras
  'ms.estoque.compras.transito.v1',
  // engenharia / obras
  'ms.engenharia.obras.snapshot.v1',
  'ms.obras.finalizacao.v1',
  // propostas
  'ms.fv.lastCidadeId.v1',
  'ms.fv.origens-captacao.v1',
  // auditoria legada (já migrada para Supabase em Onda 5)
  'ms.audit.v1',
];

const FORBIDDEN_PREFIX = [
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
  'ms.carteira',
  'ms.usuarios',
  'ms.usuarioAtual',
  'ms.perfis',
  'ms.estoque',
  'ms.compras',
  'ms.os.',
  'ms.engenharia',
  'ms.obras',
  'ms.posvenda',
  'ms.cobranca',
  'ms.anexos',
  'ms.financiamento',
  'ms.workflow',
  'ms.aprovacoes',
  'ms.dashboard',
  'ms.formularios',
];

export interface PurgeResult {
  removed: string[];
  kept: string[];
  unknown: string[];
  totalScanned: number;
  executedAt: string;
}

function isWhitelisted(key: string): boolean {
  return WHITELIST_PREFIX.some((p) => key.startsWith(p));
}

function isForbidden(key: string): boolean {
  if (FORBIDDEN_EXACT.includes(key)) return true;
  return FORBIDDEN_PREFIX.some((p) => key.startsWith(p));
}

/**
 * Lista o que SERIA removido sem efetuar mudanças (dry-run).
 */
export function dryRunPurge(): PurgeResult {
  const removed: string[] = [];
  const kept: string[] = [];
  const unknown: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (isForbidden(k)) removed.push(k);
    else if (isWhitelisted(k)) kept.push(k);
    else unknown.push(k);
  }
  return {
    removed,
    kept,
    unknown,
    totalScanned: localStorage.length,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Executa a purga oficial. Idempotente.
 * Registra resultado em error_log (categoria=ls-purge) para auditoria.
 */
export async function executarPurgaLegadoLS(opts?: {
  removerIndeterminados?: boolean;
}): Promise<PurgeResult> {
  const removerIndeterminados = !!opts?.removerIndeterminados;
  const removed: string[] = [];
  const kept: string[] = [];
  const unknown: string[] = [];
  const totalScanned = localStorage.length;

  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) allKeys.push(k);
  }

  for (const k of allKeys) {
    if (isForbidden(k)) {
      localStorage.removeItem(k);
      removed.push(k);
    } else if (isWhitelisted(k)) {
      kept.push(k);
    } else {
      if (removerIndeterminados) {
        localStorage.removeItem(k);
        removed.push(k);
      } else {
        unknown.push(k);
      }
    }
  }

  const result: PurgeResult = {
    removed,
    kept,
    unknown,
    totalScanned,
    executedAt: new Date().toISOString(),
  };

  try {
    await logError({
      level: 'info',
      category: 'ls-purge',
      message: `Purga LS executada: ${removed.length} removidas, ${kept.length} mantidas, ${unknown.length} indeterminadas`,
      context: result as unknown as Record<string, unknown>,
    });
  } catch {
    // sem-op: purga não pode falhar por causa de log
  }

  return result;
}
