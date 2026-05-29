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

function setAnonymousState() {
  _state = { session: null, user: null, role: null, loading: false };
  emit();
  void hydrateFunnel(false);
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

async function validateActiveSession(seedSession?: Session | null) {
  // D19.1.fix.b — caminho rápido: se já temos seedSession válida
  // (vinda de onAuthStateChange/getSession/signInWithPassword), confiamos
  // nela em vez de fazer getUser+getSession redundantes. Esses dois calls
  // podiam travar quando o Auth Worker reciclava e nunca rejeitavam —
  // causa raiz do "Validando autenticação..." infinito.
  if (seedSession?.user) {
    const session = seedSession;
    const user = seedSession.user;
    const preserveRole = _state.user?.id === user.id ? _state.role : null;
    _state = { session, user, role: preserveRole, loading: false };
    console.info("[auth-session] fast-path (seed)", { userId: user.id, email: user.email });
    emit();
    void loadRole(user.id).then((role) => {
      _state = { session, user, role, loading: false };
      console.info("[auth-session] role carregado", { role, userId: user.id });
      emit();
      void hydrateFunnel(true);
    });
    return;
  }

  // Sem seed: tenta resgatar sessão persistida.
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    setAnonymousState();
    return;
  }
  await validateActiveSession(data.session);
}

async function refresh() {
  _state = { ..._state, loading: true };
  emit();

  const { data, error } = await supabase.auth.getSession();
  console.info("[auth-session] getSession()", {
    hasSession: !!data.session,
    userId: data.session?.user?.id ?? null,
    email: data.session?.user?.email ?? null,
    error: error?.message ?? null,
  });

  if (!data.session?.user) {
    setAnonymousState();
    return;
  }

  await validateActiveSession(data.session);
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

  // D19.1.fix.b — safety net: se em 4s ainda estivermos loading=true
  // (Auth Worker reciclando / getSession pendurado), libera estado anônimo
  // para o guard do __root redirecionar para /login em vez de prender o
  // usuário na tela "Validando autenticação…".
  const safetyTimer = setTimeout(() => {
    if (_state.loading) {
      console.warn("[auth-session] safety-net acionado: loading=true >4s, forçando anônimo");
      setAnonymousState();
    }
  }, 4000);

  void refresh().finally(() => clearTimeout(safetyTimer));

  supabase.auth.onAuthStateChange((event, session) => {
    console.info("[auth-session] onAuthStateChange", {
      event,
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    });
    if (!session?.user || event === "SIGNED_OUT") {
      setAnonymousState();
      return;
    }

    setTimeout(() => {
      void validateActiveSession(session);
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
  if (data?.session && data?.user) {
    // D19.1.fix F3 — boot de auth paralelo.
    // signInWithPassword JÁ retorna sessão+user validados pelo Supabase Auth.
    // Não fazemos getUser+getSession redundantes (era o gargalo de ~1.6s).
    // Apenas carrega o papel; estado de usuário é exposto imediatamente.
    const session = data.session;
    const user = data.user;
    _state = { session, user, role: _state.user?.id === user.id ? _state.role : null, loading: false };
    emit();
    // Papel em paralelo — não bloqueia navegação para o dashboard.
    void loadRole(user.id).then((role) => {
      _state = { session, user, role, loading: false };
      console.info("[auth-session] role carregado (fast-path)", { role, userId: user.id });
      emit();
      void hydrateFunnel(true);
    });
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
