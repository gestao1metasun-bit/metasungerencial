/**
 * D15 — Feature flags de corte LocalStorage → Supabase
 *
 * Defaults TODOS em `false` por design: ativar Onda 0 NÃO altera comportamento.
 * Flags são consultadas via `useFeatureFlag(name)` ou diretamente neste módulo.
 *
 * Ordem de ativação prevista:
 *   1. D15_DUAL_READ_FINANCEIRO=true   → lê ambos, exibe banner divergência
 *   2. D15_SUPABASE_READ_FINANCEIRO=true + DUAL_READ=false → corte
 *   3. D15_LS_FINANCEIRO_DISABLED=true → desabilita writes LS (Onda 10)
 *
 * Override de runtime: `localStorage.setItem('ff:<NAME>', 'true' | 'false')`
 * (apenas para QA — operação real usa tabela `feature_flags` futura).
 */

export type FeatureFlagName =
  // Onda 1 — Financeiro
  | "D15_DUAL_READ_FINANCEIRO"
  | "D15_SUPABASE_READ_FINANCEIRO"
  | "D15_LS_FINANCEIRO_DISABLED"
  // Onda 2 — Cadastros
  | "D15_DUAL_READ_CADASTROS"
  | "D15_SUPABASE_READ_CADASTROS"
  | "D15_LS_CADASTROS_DISABLED"
  // Onda 3 — Comercial / Contratos
  | "D15_DUAL_READ_COMERCIAL"
  | "D15_SUPABASE_READ_COMERCIAL"
  | "D15_LS_COMERCIAL_DISABLED"
  // D15.3.a — TitulosTab Supabase (default ligado)
  | "D15_TITULOS_SUPABASE"
  // D15.3.b — AdiantamentosTab Supabase (default ligado)
  | "D15_ADIANTAMENTOS_SUPABASE";

const DEFAULTS: Record<FeatureFlagName, boolean> = {
  D15_DUAL_READ_FINANCEIRO: false,
  D15_SUPABASE_READ_FINANCEIRO: false,
  D15_LS_FINANCEIRO_DISABLED: false,
  D15_DUAL_READ_CADASTROS: false,
  D15_SUPABASE_READ_CADASTROS: false,
  D15_LS_CADASTROS_DISABLED: false,
  D15_DUAL_READ_COMERCIAL: false,
  D15_SUPABASE_READ_COMERCIAL: false,
  D15_LS_COMERCIAL_DISABLED: false,
  // D15.3.a: TitulosTab Supabase é o padrão; LS legado fica como rollback.
  D15_TITULOS_SUPABASE: true,
  // D15.3.b: AdiantamentosTab Supabase é o padrão; LS legado fica como rollback.
  D15_ADIANTAMENTOS_SUPABASE: true,
};


function readOverride(name: FeatureFlagName): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(`ff:${name}`);
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function isFeatureEnabled(name: FeatureFlagName): boolean {
  const override = readOverride(name);
  if (override !== null) return override;
  return DEFAULTS[name];
}

/** React hook fino — sem state, basta re-render do componente. */
export function useFeatureFlag(name: FeatureFlagName): boolean {
  return isFeatureEnabled(name);
}

/** Para diagnóstico / painel de admin. */
export function getAllFeatureFlags(): Array<{
  name: FeatureFlagName;
  default: boolean;
  override: boolean | null;
  effective: boolean;
}> {
  return (Object.keys(DEFAULTS) as FeatureFlagName[]).map((name) => {
    const override = readOverride(name);
    return {
      name,
      default: DEFAULTS[name],
      override,
      effective: override !== null ? override : DEFAULTS[name],
    };
  });
}
