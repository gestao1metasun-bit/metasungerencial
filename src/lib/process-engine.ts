/**
 * D6.13.3 — Process Engine
 *
 * Motor central de processos operacionais do ERP. NÃO criar processo solto
 * por tela: todo processo crítico (renegociar, baixar, aprovar, gerar PV,
 * enviar engenharia, cancelar lote, reservar material, etc.) deve ser
 * registrado aqui e disparado via `useProcessos(entity).execute(key)`.
 *
 * Ciclo de execução (estilo TOTVS RM):
 *   1. Resolve definição registrada (registerProcess).
 *   2. Valida seleção (mínimo, lote, status, regra de negócio).
 *   3. Valida permissão (mapa `permissions` do usuário).
 *   4. Executa `run(ctx)` (RPC, modal, ação transacional).
 *   5. Invalida queries declaradas (`invalidates`).
 *   6. Loga em console (auditoria local) e dispara toast amigável em erro.
 *
 * Auditoria oficial continua no Postgres (RPCs já gravam em
 * `auditoria_eventos`). Aqui só padronizamos UX, gating e refresh.
 */
import { useMemo } from "react";
import type { ComponentType } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  EnterpriseEntityType,
  EnterpriseProcessItem,
} from "@/components/app/enterprise/EnterpriseRecordToolbar";

// ============================================================================
// Tipos
// ============================================================================

export type ProcessValidationResult = { ok: true } | { ok: false; motivo: string };

export type ProcessContext<TRow = unknown, TExtras = unknown> = {
  entity: EnterpriseEntityType;
  selectedIds: string[];
  selectedRows: TRow[];
  permissions?: Record<string, boolean>;
  /** Slot livre para a tela injetar handlers (abrir modal, setState, etc.). */
  extras: TExtras;
  queryClient: QueryClient;
};

export type ProcessDefinition<TRow = any, TExtras = any> = {
  /** Chave única dentro da entidade (ex.: "renegociar", "baixar"). */
  key: string;
  /** Entidade-alvo. */
  entity: EnterpriseEntityType;
  /** Label exibido no menu Processos. */
  label: string;
  /** Ícone opcional. */
  icon?: ComponentType<{ className?: string }>;
  /** Permissão exigida (mapa `permissions`). */
  permissao?: string;
  /** Mínimo de selecionados (default 1, 0 = não exige). */
  requerSelecao?: number;
  /** Aceita execução em lote (>1 selecionado). */
  permiteLote?: boolean;
  /** Marca visualmente como destrutivo. */
  destructive?: boolean;
  /** Indica que requer motivo (UI marca; coleta fica com `run`/modal). */
  requerMotivo?: boolean;
  /** Validação custom (status, mesmo cliente, saldo > 0, etc.). */
  validate?: (ctx: ProcessContext<TRow, TExtras>) => ProcessValidationResult;
  /** Execução real (abrir modal, chamar RPC, etc.). */
  run: (ctx: ProcessContext<TRow, TExtras>) => Promise<void> | void;
  /** Query keys a invalidar após sucesso. */
  invalidates?: ReadonlyArray<ReadonlyArray<unknown>>;
};

// ============================================================================
// Registro global
// ============================================================================

const REGISTRY = new Map<string, ProcessDefinition<any, any>>();

const regKey = (entity: EnterpriseEntityType, key: string) => `${entity}::${key}`;

export function registerProcess<TRow, TExtras>(def: ProcessDefinition<TRow, TExtras>): void {
  const k = regKey(def.entity, def.key);
  if (REGISTRY.has(k) && import.meta.env.DEV) {
    // Não bloqueia HMR — só avisa.
    console.warn(`[process-engine] sobrescrevendo processo já registrado: ${k}`);
  }
  REGISTRY.set(k, def as ProcessDefinition<any, any>);
}

export function getProcess(
  entity: EnterpriseEntityType,
  key: string,
): ProcessDefinition | undefined {
  return REGISTRY.get(regKey(entity, key));
}

export function listProcesses(entity: EnterpriseEntityType): ProcessDefinition[] {
  const out: ProcessDefinition[] = [];
  for (const def of REGISTRY.values()) {
    if (def.entity === entity) out.push(def);
  }
  return out;
}

// ============================================================================
// Gating
// ============================================================================

function hasPerm(perm: string | undefined, permissions?: Record<string, boolean>): boolean {
  if (!perm) return true;
  if (!permissions) return true; // sem mapa = não bloqueia (validação real fica na RPC/RLS)
  return !!permissions[perm];
}

/**
 * Retorna por que um processo está indisponível para a seleção atual.
 * `null` = disponível.
 */
export function checkProcessAvailability<TRow, TExtras>(
  def: ProcessDefinition<TRow, TExtras>,
  ctx: ProcessContext<TRow, TExtras>,
): string | null {
  const min = def.requerSelecao ?? 1;
  const count = ctx.selectedIds.length;
  if (count < min) {
    return min === 0
      ? null
      : `Selecione ao menos ${min} registro${min > 1 ? "s" : ""}.`;
  }
  if (count > 1 && def.permiteLote === false) {
    return "Este processo não aceita execução em lote.";
  }
  if (!hasPerm(def.permissao, ctx.permissions)) {
    return "Você não tem permissão para executar este processo.";
  }
  if (def.validate) {
    const r = def.validate(ctx);
    if (!r.ok) return r.motivo;
  }
  return null;
}

// ============================================================================
// Execução
// ============================================================================

export async function executeProcess<TRow, TExtras>(
  entity: EnterpriseEntityType,
  key: string,
  ctx: ProcessContext<TRow, TExtras>,
): Promise<{ ok: boolean; error?: string }> {
  const def = getProcess(entity, key) as ProcessDefinition<TRow, TExtras> | undefined;
  if (!def) {
    const msg = `Processo "${key}" não está registrado para ${entity}.`;
    toast.error(msg);
    return { ok: false, error: msg };
  }
  const block = checkProcessAvailability(def, ctx);
  if (block) {
    toast.warning(block);
    return { ok: false, error: block };
  }
  try {
    await def.run(ctx);
    if (def.invalidates?.length) {
      for (const qk of def.invalidates) {
        ctx.queryClient.invalidateQueries({ queryKey: qk as unknown[] });
      }
    }
    if (import.meta.env.DEV) {
      console.info(
        `[process-engine] ${entity}.${key} OK · ${ctx.selectedIds.length} registro(s)`,
      );
    }
    return { ok: true };
  } catch (e: any) {
    const msg = e?.message ?? "Falha ao executar processo.";
    console.error(`[process-engine] ${entity}.${key} FAIL:`, e);
    toast.error(msg);
    return { ok: false, error: msg };
  }
}

// ============================================================================
// Hook React (consumo nas telas)
// ============================================================================

export type UseProcessosOptions<TRow, TExtras> = {
  selectedIds: string[];
  selectedRows: TRow[];
  permissions?: Record<string, boolean>;
  extras?: TExtras;
};

export type ProcessoComStatus<TRow, TExtras> = {
  def: ProcessDefinition<TRow, TExtras>;
  /** `null` se disponível, mensagem amigável se bloqueado. */
  blockedReason: string | null;
};

export type UseProcessosResult<TRow, TExtras> = {
  /** Lista crua de processos registrados para a entidade. */
  all: ProcessDefinition<TRow, TExtras>[];
  /** Lista com status de disponibilidade (para menus que mostram disabled). */
  items: ProcessoComStatus<TRow, TExtras>[];
  /** Itens prontos para o dropdown `availableProcesses` do EnterpriseRecordToolbar. */
  availableProcesses: EnterpriseProcessItem[];
  /** Dispara processo respeitando validação + permissão + auditoria. */
  execute: (processKey: string) => Promise<{ ok: boolean; error?: string }>;
};

export function useProcessos<TRow = unknown, TExtras = unknown>(
  entity: EnterpriseEntityType,
  opts: UseProcessosOptions<TRow, TExtras>,
): UseProcessosResult<TRow, TExtras> {
  const queryClient = useQueryClient();
  const { selectedIds, selectedRows, permissions, extras } = opts;

  const all = useMemo(
    () => listProcesses(entity) as ProcessDefinition<TRow, TExtras>[],
    [entity],
  );

  const buildCtx = (): ProcessContext<TRow, TExtras> => ({
    entity,
    selectedIds,
    selectedRows,
    permissions,
    extras: (extras ?? ({} as TExtras)) as TExtras,
    queryClient,
  });

  const items = useMemo<ProcessoComStatus<TRow, TExtras>[]>(() => {
    const ctx = buildCtx();
    return all.map((def) => ({ def, blockedReason: checkProcessAvailability(def, ctx) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, selectedIds, selectedRows, permissions, extras]);

  const availableProcesses = useMemo<EnterpriseProcessItem[]>(
    () =>
      items
        .filter((it) => it.blockedReason === null)
        .map(({ def }) => ({
          key: def.key,
          label: def.label,
          icon: def.icon,
          permissao: def.permissao,
          requerSelecao: def.requerSelecao,
          permiteLote: def.permiteLote !== false,
          destructive: def.destructive,
          requerMotivo: def.requerMotivo,
        })),
    [items],
  );

  const execute = (processKey: string) => executeProcess(entity, processKey, buildCtx());

  return { all, items, availableProcesses, execute };
}
