/**
 * Hook de autenticação Supabase + papel (admin).
 * NÃO mexe nos stores existentes (consultores, leads etc.) — é adicional.
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

let _state: AuthState = { session: null, user: null, role: null, loading: true, errorMessage: null };
const _listeners = new Set<() => void>();
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

function scheduleBootTimeout() {
  clearBootTimeout();
  _bootTimeout = setTimeout(() => {
    if (_state.loading) {
      console.warn("[auth-session] timeout defensivo: loading=true >5s, forçando login");
      void handleAuthFailure(
        "Não foi possível validar sua sessão com segurança. Faça login novamente.",
        new Error("auth boot timeout"),
        "auth.timeout"
      );
    }
  }, 5000);
}

function setAnonymousState(reason?: string, force = false) {
  if (!force && _state.session?.user) {
    console.warn("[auth-session] fallback anônimo ignorado: sessão válida já resolvida");
    return;
  }
  clearBootTimeout();
  _state = { session: null, user: null, role: null, loading: false, errorMessage: reason ?? null };
  emit();
  void hydrateFunnel(false);
}

function setLoadingState() {
  _state = { ..._state, loading: true, errorMessage: null };
  emit();
  scheduleBootTimeout();
}

function setAuthenticatedState(session: Session, user: User, role: AppRole | null) {
  clearBootTimeout();
  _state = { session, user, role, loading: false, errorMessage: null };
  emit();
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timeout após ${ms}ms`));
    }, ms);

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

async function resolveAuthenticatedSession(session: Session, source: string) {
  const user = session.user;
  const preserveRole = _state.user?.id === user.id ? _state.role : null;
  setAuthenticatedState(session, user, preserveRole);
  console.info("[auth-session] sessão autenticada", { source, userId: user.id, email: user.email });

  try {
    const role = await loadRole(user.id);
    if (_state.user?.id !== user.id) return;
    setAuthenticatedState(session, user, role);
    console.info("[auth-session] role carregado", { role, userId: user.id, source });
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
}

async function handleAuthFailure(message: string, error: unknown, action: string) {
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

async function validateActiveSession(seedSession?: Session | null, source = "seed") {
  if (seedSession?.user) {
    await resolveAuthenticatedSession(seedSession, source);
    return;
  }

  await refresh(source);
}

async function refresh(source = "refresh") {
  setLoadingState();

  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), 5000, "supabase.auth.getSession");
    console.info("[auth-session] getSession()", {
      source,
      hasSession: !!data.session,
      userId: data.session?.user?.id ?? null,
      email: data.session?.user?.email ?? null,
      error: error?.message ?? null,
    });

    if (error) {
      if (_state.session?.user) {
        console.warn("[auth-session] getSession com erro ignorado: sessão válida já resolvida", { source, error: error.message });
        return;
      }
      await handleAuthFailure("Falha ao consultar sua sessão. Faça login novamente.", error, "auth.getSession");
      return;
    }

    if (!data.session?.user) {
      if (_state.session?.user) {
        console.warn("[auth-session] getSession sem sessão ignorado: sessão válida já resolvida", { source });
        return;
      }
      setAnonymousState(undefined, true);
      return;
    }

    await resolveAuthenticatedSession(data.session, source);
  } catch (error) {
    if (_state.session?.user) {
      console.warn("[auth-session] refresh falhou, mas sessão válida já existe; ignorando fallback", { source });
      return;
    }
    await handleAuthFailure("Falha ao validar sua sessão. Faça login novamente.", error, "auth.refresh");
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

  supabase.auth.onAuthStateChange((event, session) => {
    console.info("[auth-session] onAuthStateChange", {
      event,
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    });
    if (!session?.user && event !== "SIGNED_OUT" && _state.session?.user) {
      console.warn("[auth-session] evento nulo tardio ignorado: sessão já resolvida", { event });
      return;
    }
    if (!session?.user || event === "SIGNED_OUT") {
      setAnonymousState(undefined, true);
      return;
    }

    queueMicrotask(() => {
      void validateActiveSession(session, `auth:${event}`).catch((error) => {
        void handleAuthFailure("Falha ao atualizar sua sessão. Faça login novamente.", error, "auth.onAuthStateChange");
      });
    });
  });

  void refresh("boot");
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
  if (data?.session && data?.user) {
    // D19.1.fix F3 — boot de auth paralelo.
    // signInWithPassword JÁ retorna sessão+user validados pelo Supabase Auth.
    // Não fazemos getUser+getSession redundantes (era o gargalo de ~1.6s).
    // Apenas carrega o papel; estado de usuário é exposto imediatamente.
    await resolveAuthenticatedSession(data.session, "signInWithPassword");
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
