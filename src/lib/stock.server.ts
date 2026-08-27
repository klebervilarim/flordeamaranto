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

/** Registra um ajuste de estoque no histórico de movimentações, se a quantidade mudou. */
export async function recordStockMovement(
  supabase: UserSupabase,
  params: {
    productId: string;
    previousQuantity: number;
    newQuantity: number;
    createdBy: string;
    note?: string | null;
  },
): Promise<void> {
  if (params.previousQuantity === params.newQuantity) return;
  await supabase.from("inventory_movements").insert({
    product_id: params.productId,
    type: "adjustment",
    quantity: params.newQuantity - params.previousQuantity,
    previous_quantity: params.previousQuantity,
    new_quantity: params.newQuantity,
    created_by: params.createdBy,
    note: params.note ?? null,
  });
}
