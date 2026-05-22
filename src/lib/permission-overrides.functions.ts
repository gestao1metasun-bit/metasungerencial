// Server functions para gerenciar permissões granulares por usuário
// (extras / bloqueios). Somente admins podem escrever.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OverrideEffect = "grant" | "deny";

export type UserOverride = {
  id: string;
  userId: string;
  permission: string;
  effect: OverrideEffect;
  motivo: string;
  grantedBy: string | null;
  createdAt: string;
};

export type UserWithRoles = {
  userId: string;
  nome: string;
  email: string;
  ativo: boolean;
  roles: string[];
};

// Lista todos os usuários (profiles + roles)
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserWithRoles[]> => {
    const { supabase } = context;
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, nome, email, ativo")
      .order("nome", { ascending: true });
    if (pErr) throw new Error(pErr.message);

    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);

    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id as string) ?? [];
      arr.push(r.role as string);
      rolesByUser.set(r.user_id as string, arr);
    }

    return (profiles ?? []).map((p) => ({
      userId: p.user_id as string,
      nome: (p.nome as string) ?? "",
      email: (p.email as string) ?? "",
      ativo: !!p.ativo,
      roles: rolesByUser.get(p.user_id as string) ?? [],
    }));
  });

// Lista overrides de um usuário
export const listUserOverrides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<UserOverride[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("user_permission_overrides")
      .select("id, user_id, permission, effect, motivo, granted_by, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      permission: r.permission as string,
      effect: r.effect as OverrideEffect,
      motivo: r.motivo as string,
      grantedBy: (r.granted_by as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  });

// Lista todas as permissões efetivas (role + overrides) de um usuário
export const listUserEffectivePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // permissões herdadas dos roles
    const { data: roleRows } = await supabase
      .from("user_roles").select("role").eq("user_id", data.userId);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    let rolePerms: string[] = [];
    if (roles.length > 0) {
      const { data: rp } = await supabase
        .from("role_permissions")
        .select("permission")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in("role", roles as any);
      rolePerms = Array.from(new Set((rp ?? []).map((p) => p.permission as string)));
    }
    return { roles, rolePerms };
  });

// Insere ou atualiza override
const UpsertSchema = z.object({
  userId: z.string().uuid(),
  permission: z.string().min(1).max(64),
  effect: z.enum(["grant", "deny"]),
  motivo: z.string().min(3).max(500),
});

export const upsertUserOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Remove o efeito oposto se existir (não pode haver grant+deny na mesma perm)
    const opposite: OverrideEffect = data.effect === "grant" ? "deny" : "grant";
    await supabase
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", data.userId)
      .eq("permission", data.permission)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("effect", opposite as any);

    const { error } = await supabase
      .from("user_permission_overrides")
      .upsert(
        {
          user_id: data.userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          permission: data.permission as any,
          effect: data.effect,
          motivo: data.motivo,
          granted_by: userId,
        },
        { onConflict: "user_id,permission,effect" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeUserOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("user_permission_overrides")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Lista todas as chaves do enum app_permission (para a UI agrupar por módulo)
export const listAllPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    // Lê do role_permissions distinct — cobre todas as permissões seedadas.
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission");
    if (error) throw new Error(error.message);
    const set = new Set<string>((data ?? []).map((r) => r.permission as string));
    return Array.from(set).sort();
  });
