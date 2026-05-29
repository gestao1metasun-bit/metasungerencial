/**
 * Hook de autenticação Supabase + papel (admin).
 * Fluxo propositalmente simples e seguro: boot por getSession(),
 * onAuthStateChange sem awaits, papel/perfil em background.
 */
import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/repositories/error-log-repo";

export type AppRole = "admin_master" | "admin_geral" | "usuario";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  errorMessage: string | null;
}

const AUTH_TIMEOUT_MS = 5000;

let _state: AuthState = {
  session: null,
  user: null,
  role: null,
  loading: true,
  errorMessage: null,
};
const _listeners = new Set<() => void>();
let _initialized = false;
let _bootTimeout: ReturnType<typeof setTimeout> | null = null;

function emit() {
  _listeners.forEach((l) => l());
}

function clearBootTimeout() {
  if (_bootTimeout) {
    clearTimeout(_bootTimeout);
    _bootTimeout = null;
  }
}

function logLoadingFalse(context: string) {
  console.info("auth.loading.false", { context });
}

function setState(next: AuthState, context: string) {
  _state = next;
  emit();
  if (!next.loading) {
    clearBootTimeout();
    logLoadingFalse(context);
  }
}

function setAnonymousState(reason?: string) {
  setState(
    { session: null, user: null, role: null, loading: false, errorMessage: reason ?? null },
    reason ? "anonymous:error" : "anonymous"
  );
  void hydrateFunnel(false);
}

function setAuthenticatedState(session: Session, user: User, role: AppRole | null, context: string) {
  setState({ session, user, role, loading: false, errorMessage: null }, context);
}

async function loadRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return "usuario";

  const roles = data.map((r) => r.role as AppRole);
  if (roles.includes("admin_master")) return "admin_master";
  if (roles.includes("admin_geral")) return "admin_geral";
  return "usuario";
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout após ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function hydrateRoleAndCaches(session: Session, source: string) {
  const user = session.user;
  setTimeout(() => {
    void (async () => {
      try {
        const role = await loadRole(user.id);
        if (_state.user?.id !== user.id) return;
        setAuthenticatedState(session, user, role, `${source}:role`);
      } catch (error) {
        console.error("[auth-session] loadRole falhou", error);
        logError({
          modulo: "auth",
          tela: "auth-store",
          acao: "loadRole",
          mensagem: error instanceof Error ? error.message : "Falha ao carregar papel do usuário",
          payload: { userId: user.id, source },
          severidade: "warn",
        });
      }

      if (_state.user?.id === user.id) {
        void hydrateFunnel(true);
      }
    })();
  }, 0);
}

function resolveSession(session: Session, source: string) {
  setAuthenticatedState(session, session.user, _state.user?.id === session.user.id ? _state.role : null, source);
  hydrateRoleAndCaches(session, source);
}

function handleAuthError(message: string, error: unknown, action: string) {
  console.error(`[auth-session] ${action}`, error);
  logError({
    modulo: "auth",
    tela: "auth-store",
    acao: action,
    mensagem: message,
    stack: error instanceof Error ? error.stack : undefined,
    payload: error instanceof Error ? { name: error.name, message: error.message } : { error },
    severidade: "error",
  });
  setAnonymousState(message);
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

async function initializeAuth() {
  console.info("auth.init.start");
  clearBootTimeout();
  _bootTimeout = setTimeout(() => {
    if (_state.loading) {
      handleAuthError(
        "Não foi possível validar sua sessão com segurança. Faça login novamente.",
        new Error("auth boot timeout"),
        "auth.timeout"
      );
    }
  }, AUTH_TIMEOUT_MS);

  try {
    console.info("auth.getSession.start");
    const { data, error } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS, "supabase.auth.getSession");
    if (error) {
      handleAuthError("Falha ao consultar sua sessão. Faça login novamente.", error, "auth.getSession");
      return;
    }

    if (data.session?.user) {
      console.info("auth.getSession.ok", { userId: data.session.user.id });
      resolveSession(data.session, "boot:getSession");
      return;
    }

    console.info("auth.getSession.empty");
    setAnonymousState();
  } catch (error) {
    handleAuthError("Falha ao validar sua sessão. Faça login novamente.", error, "auth.init.catch");
  }
}

function ensureInit() {
  if (_initialized) return;
  _initialized = true;
  console.info("[auth-session] ensureInit() — assinando onAuthStateChange");

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      console.info("auth.state.signed_in", { userId: session.user.id });
      resolveSession(session, "auth:SIGNED_IN");
      return;
    }

    if (event === "SIGNED_OUT") {
      console.info("auth.state.signed_out");
      setAnonymousState();
      return;
    }

    if ((event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && session?.user) {
      console.info(`auth.state.${event.toLowerCase()}`, { userId: session.user.id });
      resolveSession(session, `auth:${event}`);
      return;
    }

    if ((event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && !session?.user) {
      console.info("auth.getSession.empty", { source: event });
      setAnonymousState();
    }
  });

  void initializeAuth();
}

export function useAuth() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    _listeners.add(l);
    ensureInit();
    force((n) => n + 1);
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
  if (data?.session && data?.user) {
    console.info("auth.state.signed_in", { userId: data.user.id, source: "signInWithPassword" });
    resolveSession(data.session, "signInWithPassword");
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
