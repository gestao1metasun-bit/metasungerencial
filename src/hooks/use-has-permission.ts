/**
 * Hook genérico: consulta has_permission(_user_id,_perm) do Supabase.
 * Cacheado por usuário+permissão (TanStack Query, 5 min).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHasPermission(perm: string) {
  return useQuery({
    queryKey: ["has_permission", perm],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return false;
      // @ts-expect-error - enum app_permission é gerado dinamicamente
      const { data, error } = await supabase.rpc("has_permission", { _user_id: uid, _perm: perm });
      if (error) return false;
      return Boolean(data);
    },
  });
}
