/**
 * Feature flags do frontend.
 *
 * Onda B — leitura Supabase de obras (híbrido com seed).
 * Onda D6 — Enterprise Shell RM (substituição gradual da sidebar legada).
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
  /**
   * D6 — Enterprise Shell RM.
   * false (padrão): top-nav + ribbon convivem com a sidebar antiga como menu principal.
   * true: sidebar antiga deixa de ser menu — vira painel contextual
   *       (favoritos, pendências, atalhos, filtros). TopNav assume.
   * Alternar localmente: localStorage.setItem("ff:enterprise-shell-full","1")
   */
  get ENTERPRISE_SHELL_FULL() {
    return readBool("ff:enterprise-shell-full", false);
  },
};
