// Server function: retorna as permissões granulares do usuário autenticado.
// Combina roles do usuário com a tabela role_permissions. Admins recebem todas.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyPermissions = {
  userId: string;
  roles: string[];
  isAdmin: boolean;
  permissions: string[]; // chaves do enum app_permission
};

export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPermissions> => {
    const { supabase, userId } = context;

    const { data: roleRows, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw new Error(rolesErr.message);

    const roles = (roleRows ?? []).map((r) => r.role as string);
    const isAdmin = roles.some((r) => r === "admin_master" || r === "admin_geral");

    if (isAdmin) {
      // Admin: lê o enum inteiro via tabela role_permissions (seedada para admin_*)
      const { data: permRows, error: permErr } = await supabase
        .from("role_permissions")
        .select("permission")
        .in("role", ["admin_master", "admin_geral"]);
      if (permErr) throw new Error(permErr.message);
      const permissions = Array.from(
        new Set((permRows ?? []).map((p) => p.permission as string)),
      );
      return { userId, roles, isAdmin: true, permissions };
    }

    if (roles.length === 0) {
      return { userId, roles, isAdmin: false, permissions: [] };
    }

    const { data: permRows, error: permErr } = await supabase
      .from("role_permissions")
      .select("permission")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .in("role", roles as any);
    if (permErr) throw new Error(permErr.message);

    const permissions = Array.from(
      new Set((permRows ?? []).map((p) => p.permission as string)),
    );
    return { userId, roles, isAdmin: false, permissions };
  });
