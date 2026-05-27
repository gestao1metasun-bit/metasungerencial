/**
 * Hook de autenticação Supabase + papel (admin).
 * NÃO mexe nos stores existentes (consultores, leads etc.) — é adicional.
 */
import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin_master" | "admin_geral" | "usuario";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
}

let _state: AuthState = { session: null, user: null, role: null, loading: true };
const _listeners = new Set<() => void>();

function emit() {
  _listeners.forEach((l) => l());
}

async function loadRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: true });
  if (!data || data.length === 0) return "usuario";
  // prioridade: admin_master > admin_geral > usuario
  const roles = data.map((r) => r.role as AppRole);
  if (roles.includes("admin_master")) return "admin_master";
  if (roles.includes("admin_geral")) return "admin_geral";
  return "usuario";
}

async function refresh() {
  const { data, error } = await supabase.auth.getSession();
  console.info("[auth-session] getSession()", {
    hasSession: !!data.session,
    userId: data.session?.user?.id ?? null,
    email: data.session?.user?.email ?? null,
    error: error?.message ?? null,
  });
  const session = data.session;
  if (!session?.user) {
    _state = { session: null, user: null, role: null, loading: false };
    emit();
    void hydrateFunnel(false);
  } else {
    // Emite imediatamente com o usuário (sem esperar role) p/ header sair de "Visitante"
    _state = { session, user: session.user, role: _state.role, loading: false };
    emit();
    const role = await loadRole(session.user.id);
    _state = { session, user: session.user, role, loading: false };
    console.info("[auth-session] role carregada", { role });
    emit();
    void hydrateFunnel(true);
  }
}

async function hydrateFunnel(loggedIn: boolean) {
  try {
    const [{ hydrateLeads, resetLeadsCache }, { hydratePropostas, resetPropostasCache }] = await Promise.all([
      import("@/modules/leads/store"),
      import("@/modules/propostas/store"),
    ]);
    if (loggedIn) {
      await Promise.all([hydrateLeads(), hydratePropostas()]);
    } else {
      resetLeadsCache();
      resetPropostasCache();
    }
  } catch (e) {
    console.error("[auth] hydrateFunnel falhou", e);
  }
}

let _initialized = false;
function ensureInit() {
  if (_initialized) return;
  _initialized = true;
  console.info("[auth-session] ensureInit() — assinando onAuthStateChange");
  void refresh();
  supabase.auth.onAuthStateChange((event, session) => {
    console.info("[auth-session] onAuthStateChange", {
      event,
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    });
    if (!session?.user) {
      _state = { session: null, user: null, role: null, loading: false };
      emit();
      void hydrateFunnel(false);
      return;
    }
    // Atualiza imediatamente com o usuário (UI sai de "Visitante" no ato)
    _state = { session, user: session.user, role: _state.role, loading: false };
    emit();
    // Carrega role em seguida (fora do callback p/ evitar deadlock)
    setTimeout(() => {
      void loadRole(session.user.id).then((role) => {
        _state = { session, user: session.user, role, loading: false };
        console.info("[auth-session] role atualizada via onAuthStateChange", { role });
        emit();
        void hydrateFunnel(true);
      });
    }, 0);
  });
}

export function useAuth() {
  const [, force] = useState(0);
  useEffect(() => {
    ensureInit();
    const l = () => force((n) => n + 1);
    _listeners.add(l);
    return () => {
      _listeners.delete(l);
    };
  }, []);
  return _state;
}

export function useIsAdmin(): boolean {
  const { role } = useAuth();
  return role === "admin_master" || role === "admin_geral";
}

/**
 * Permissão para gerenciar aditivos contratuais (criar, aprovar, reprovar, substituir).
 * Restrito a Financeiro/Diretoria (representados aqui por admin_master e admin_geral).
 */
export function usePodeGerenciarAditivos(): boolean {
  return useIsAdmin();
}

export async function signInEmail(email: string, password: string) {
  console.info("[auth-login] signInWithPassword:start", { email });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.info("[auth-login] signInWithPassword:result", {
    hasSession: !!data?.session,
    userId: data?.user?.id ?? null,
    email: data?.user?.email ?? null,
    error: error?.message ?? null,
  });
  if (error) throw error;
  // Set imediato do estado global — não esperar onAuthStateChange
  if (data?.session && data?.user) {
    _state = { session: data.session, user: data.user, role: _state.role, loading: false };
    emit();
    setTimeout(() => {
      void loadRole(data.user!.id).then((role) => {
        _state = { session: data.session, user: data.user, role, loading: false };
        emit();
        void hydrateFunnel(true);
      });
    }, 0);
  }
}

export async function signUpEmail(email: string, password: string, fullName?: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: fullName ? { full_name: fullName } : undefined,
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function clearAuthSession() {
  await supabase.auth.signOut();
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function useSignOut() {
  return useCallback(async () => {
    await signOut();
  }, []);
}
