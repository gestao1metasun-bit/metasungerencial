/**
 * Fonte única de identidade/permissão (C4b).
 *
 * Combina:
 *  - Sessão Supabase (auth-store)   → fonte oficial de PERMISSÕES críticas
 *  - Perfil local (perfis-store)    → fonte oficial de IDENTIDADE VISUAL no header
 *
 * Regras:
 *  - `isAdminMaster` (canônico) só é true quando a sessão Supabase está autenticada
 *    com role admin_master/admin_geral. Sem sessão = sem permissão crítica.
 *  - `divergencia` sinaliza quando o perfil local diz "admin" mas a sessão real não
 *    confirma (ou vice-versa). UI deve mostrar badge/aviso.
 *  - Tudo o que controla ação crítica deve ler daqui — nunca diretamente do
 *    perfis-store nem do auth-store.
 */
import { useAuth } from "@/lib/auth-store";
import { useUsuarioAtual } from "@/lib/perfis-store";

export type MotivoBloqueio =
  | null
  | "carregando"
  | "sem_sessao"
  | "sem_permissao";

export interface Identidade {
  /** sessão Supabase ativa (fonte oficial) */
  isAuthenticated: boolean;
  /** sessão ainda inicializando */
  sessionLoading: boolean;
  /** email/nome da sessão real */
  email: string | null;
  /** role do banco (canônico) */
  role: "admin_master" | "admin_geral" | "usuario" | null;
  /** PERMISSÃO CRÍTICA — só true com sessão Supabase autenticada como admin */
  isAdminMaster: boolean;
  /** Identidade visual (vem do perfis-store local, p/ header e display) */
  displayName: string;
  perfilNome: string;
  iniciais: string;
  /** Indica que header (local) e permissão real (Supabase) divergem */
  divergencia: boolean;
  /** Motivo legível da divergência ou bloqueio (para tooltip/toast) */
  motivoDivergencia: string | null;
  /** Razão pela qual uma ação crítica está bloqueada (null = liberada) */
  motivoBloqueio: MotivoBloqueio;
  /** Texto pronto para tooltip/toast ao tentar ação crítica sem permissão */
  mensagemBloqueio: string | null;
}

export function useIdentidade(): Identidade {
  const auth = useAuth();
  const { user: localUser, perfil } = useUsuarioAtual();

  const isAuthenticated = !!auth.session && !!auth.user;
  const sessionLoading = auth.loading;
  const role = auth.role;
  const isAdminMaster =
    isAuthenticated && (role === "admin_master" || role === "admin_geral");

  const displayName =
    auth.user?.user_metadata?.full_name ||
    auth.user?.email ||
    localUser?.nome ||
    "—";
  const perfilNome =
    role === "admin_master"
      ? "Admin Master"
      : role === "admin_geral"
      ? "Admin Geral"
      : role === "usuario"
      ? "Usuário"
      : perfil?.nome ?? "Sem perfil";
  const iniciais =
    String(displayName)
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "??";

  const localEhAdmin = !!perfil?.isAdminMaster;
  let divergencia = false;
  let motivoDivergencia: string | null = null;
  if (!sessionLoading) {
    if (localEhAdmin && !isAdminMaster) {
      divergencia = true;
      motivoDivergencia = isAuthenticated
        ? "Perfil local indica Admin Master, mas a sessão autenticada não possui essa permissão."
        : "Perfil local indica Admin Master, mas não há sessão autenticada. Faça login para habilitar ações administrativas.";
    } else if (!localEhAdmin && isAdminMaster) {
      divergencia = true;
      motivoDivergencia =
        "Sessão autenticada possui permissão administrativa, mas o perfil local exibido não.";
    }
  }

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
    email: auth.user?.email ?? null,
    role,
    isAdminMaster,
    displayName,
    perfilNome,
    iniciais,
    divergencia,
    motivoDivergencia,
    motivoBloqueio,
    mensagemBloqueio,
  };
}
