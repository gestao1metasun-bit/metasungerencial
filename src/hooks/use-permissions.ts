// Hook React: consome getMyPermissions via TanStack Query.
// Use `can("financeiro.editar")` para gates de UI.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPermissions, type MyPermissions } from "@/lib/permissions.functions";

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
    retry: 1,
  });
  const data = q.data ?? EMPTY;

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
