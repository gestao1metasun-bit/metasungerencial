/**
 * Fonte ÚNICA de identidade/permissão.
 *
 * Origem oficial (e exclusiva):
 *  - Sessão:       supabase.auth.getSession() + onAuthStateChange (via auth-store)
 *  - Usuário:      supabase.auth.getUser() (user_metadata.full_name / email)
 *  - Role/perm:    public.user_roles (carregado pelo auth-store)
 *
 * IMPORTANTE:
 *  - `perfis-store` (localStorage) NÃO é mais fonte de identidade nem de
 *    permissão. Permanece apenas como cadastro auxiliar exibido em
 *    Configurações.
 *  - Ações críticas DEVEM checar `isAdminMaster` daqui — nunca o perfil local.
 *  - Sem sessão Supabase => sem permissão crítica.
 */
import { useAuth } from "@/lib/auth-store";

export type MotivoBloqueio =
  | null
  | "carregando"
  | "sem_sessao"
  | "sem_permissao";

export interface Identidade {
  /** Sessão Supabase ativa */
  isAuthenticated: boolean;
  /** Sessão ainda inicializando (não usar para bloquear ações antes de carregar) */
  sessionLoading: boolean;
  /** E-mail da sessão real */
  email: string | null;
  /** Role do banco (user_roles) */
  role: "admin_master" | "admin_geral" | "usuario" | null;
  /** PERMISSÃO CRÍTICA — só true com sessão Supabase autenticada como admin */
  isAdminMaster: boolean;
  /** Identidade visual derivada da própria sessão Supabase */
  displayName: string;
  perfilNome: string;
  iniciais: string;
  /**
   * Compat: sempre `false`. Mantido para não quebrar consumidores antigos.
   * Com fonte única não existe "divergência" — ou tem sessão, ou não tem.
   */
  divergencia: false;
  motivoDivergencia: null;
  /** Razão pela qual uma ação crítica está bloqueada (null = liberada) */
  motivoBloqueio: MotivoBloqueio;
  /** Texto pronto para tooltip/toast ao tentar ação crítica sem permissão */
  mensagemBloqueio: string | null;
}

function calcIniciais(nome: string): string {
  return (
    String(nome)
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "??"
  );
}

export function useIdentidade(): Identidade {
  const auth = useAuth();

  const isAuthenticated = !!auth.session && !!auth.user;
  const sessionLoading = auth.loading;
  const role = auth.role;
  const isAdminMaster =
    isAuthenticated && (role === "admin_master" || role === "admin_geral");

  const email = auth.user?.email ?? null;
  const metaName =
    (auth.user?.user_metadata?.full_name as string | undefined) ||
    (auth.user?.user_metadata?.nome as string | undefined) ||
    null;

  const displayName = !isAuthenticated
    ? "Acesso restrito"
    : metaName || email || "Usuário";

  const perfilNome =
    role === "admin_master"
      ? "Admin Master"
      : role === "admin_geral"
      ? "Admin Geral"
      : role === "usuario"
      ? "Usuário"
      : !isAuthenticated
      ? "Autenticação obrigatória"
      : "Carregando…";

  const iniciais = !isAuthenticated ? "—" : calcIniciais(displayName);

  let motivoBloqueio: MotivoBloqueio = null;
  let mensagemBloqueio: string | null = null;
  if (!isAdminMaster) {
    if (sessionLoading) {
      motivoBloqueio = "carregando";
      mensagemBloqueio = "Verificando sessão…";
    } else if (!isAuthenticated) {
      motivoBloqueio = "sem_sessao";
      mensagemBloqueio = "Sessão necessária para ações administrativas. Faça login.";
    } else {
      motivoBloqueio = "sem_permissao";
      mensagemBloqueio = "Permissão administrativa indisponível nesta sessão.";
    }
  }

  return {
    isAuthenticated,
    sessionLoading,
    email,
    role,
    isAdminMaster,
    displayName,
    perfilNome,
    iniciais,
    divergencia: false,
    motivoDivergencia: null,
    motivoBloqueio,
    mensagemBloqueio,
  };
}

/**
 * Visibilidade de módulo derivada APENAS da role do banco.
 * Admin vê tudo. Usuário comum vê apenas operacional (sem Controle/Estrutura).
 */
const MODULOS_OPERACIONAIS = new Set([
  "dashboard",
  "comercial",
  "propostas",
  "financiamentos",
  "engenharia",
  "estoque",
  "financeiro",
  "posvenda",
]);

export function canAccessModule(
  role: Identidade["role"],
  moduleKey: string,
): boolean {
  if (role === "admin_master" || role === "admin_geral") return true;
  if (role === "usuario") return MODULOS_OPERACIONAIS.has(moduleKey);
  return false;
}
