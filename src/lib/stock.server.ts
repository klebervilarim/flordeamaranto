import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type UserSupabase = SupabaseClient<Database>;

export async function callerIsAdmin(supabase: UserSupabase, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return Boolean(data);
}

export async function adminCount(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

/** Garante que o usuário autenticado é administrador. */
export async function assertAdmin(supabase: UserSupabase, userId: string): Promise<void> {
  const admin = await callerIsAdmin(supabase, userId);
  if (!admin) throw new Error("Acesso restrito a administradores.");
}
