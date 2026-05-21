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
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) {
    _state = { session: null, user: null, role: null, loading: false };
  } else {
    const role = await loadRole(session.user.id);
    _state = { session, user: session.user, role, loading: false };
  }
  emit();
}

let _initialized = false;
function ensureInit() {
  if (_initialized) return;
  _initialized = true;
  void refresh();
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      _state = { session: null, user: null, role: null, loading: false };
      emit();
      return;
    }
    // Defer role load to avoid potential deadlock inside auth callback
    setTimeout(() => {
      void loadRole(session.user.id).then((role) => {
        _state = { session, user: session.user, role, loading: false };
        emit();
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
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

export async function signOut() {
  await supabase.auth.signOut();
}

export function useSignOut() {
  return useCallback(async () => {
    await signOut();
  }, []);
}
