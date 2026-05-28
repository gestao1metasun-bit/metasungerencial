// Hook React: consome getMyPermissions via TanStack Query.
// Use `can("financeiro.editar")` para gates de UI.
//
// D16.PERF P2 — cache agressivo para permissões:
// - staleTime 5min: não reconsulta ao trocar de tela
// - gcTime 30min: mantém na memória entre navegações
// - refetchOnWindowFocus/Reconnect false: sessão decide invalidação
// - marca perfMark('perms.ready') na primeira resposta.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { getMyPermissions, type MyPermissions } from "@/lib/permissions.functions";
import { perfMark, perfMarkIfAbsent, perfMeasure } from "@/lib/perf";

const EMPTY: MyPermissions = {
  userId: "",
  roles: [],
  isAdmin: false,
  permissions: [],
};

export function useMyPermissions() {
  const fetchFn = useServerFn(getMyPermissions);
  const q = useQuery({
    queryKey: ["my-permissions"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const data = q.data ?? EMPTY;

  const marked = useRef(false);
  useEffect(() => {
    if (!marked.current && q.data && !q.isLoading) {
      marked.current = true;
      // Garante anchor para usuários já autenticados (sem login.start)
      perfMarkIfAbsent("auth.ok");
      perfMark("perms.ready");
      perfMeasure("auth.ok", "perms.ready", "perms.ready");
    }
  }, [q.data, q.isLoading]);

  function can(perm: string): boolean {
    if (!data) return false;
    if (data.isAdmin) return true;
    return data.permissions.includes(perm);
  }

  function canAny(perms: string[]): boolean {
    return perms.some(can);
  }

  return { ...data, isLoading: q.isLoading, can, canAny };
}
