/**
 * Feature flags do frontend.
 *
 * Onda B — Engenharia Real: ativar leitura Supabase de `obras` mantendo
 * mocks como fallback de UI até dedup completo.
 *
 * Convivência híbrida:
 *  - `ENG_OBRAS_SUPABASE = true`  → mescla obras reais (RLS) por cima do seed,
 *    dedup por ID. Obras criadas via RPC `enviar_projeto_para_engenharia`
 *    aparecem imediatamente na Engenharia.
 *  - `ENG_OBRAS_SUPABASE = false` → comportamento legado (somente mock).
 *
 * Para desativar localmente sem recompilar: `localStorage.setItem("ff:eng-obras-supabase","0")`.
 */
function readBool(key: string, def: boolean): boolean {
  if (typeof window === "undefined") return def;
  const v = window.localStorage.getItem(key);
  if (v === "0" || v === "false") return false;
  if (v === "1" || v === "true") return true;
  return def;
}

export const featureFlags = {
  /** Onda B — leitura Supabase de obras na Engenharia (híbrido com seed). */
  get ENG_OBRAS_SUPABASE() {
    return readBool("ff:eng-obras-supabase", true);
  },
};
