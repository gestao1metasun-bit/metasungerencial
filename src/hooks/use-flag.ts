import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Hook para ler uma feature flag. Default = false se não existir. */
export function useFlag(key: string): boolean {
  const { data } = useQuery({
    queryKey: ["feature_flag", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", key)
        .maybeSingle();
      if (error) return false;
      return data?.enabled ?? false;
    },
    staleTime: 60_000,
  });
  return !!data;
}

/** Hook do modo manutenção. */
export function useMaintenanceMode(): boolean {
  const { data } = useQuery({
    queryKey: ["system_flag", "maintenance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_flags")
        .select("value")
        .eq("key", "maintenance")
        .maybeSingle();
      return data?.value === true || data?.value === "true";
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return !!data;
}
