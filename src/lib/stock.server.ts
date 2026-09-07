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

type AdminSupabase = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

/** Marca a baixa de estoque do pedido como feita, de forma atômica; retorna false se já tinha sido feita. */
async function claimStockDeduction(
  supabaseAdmin: AdminSupabase,
  orderId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("orders")
    .update({ stock_deducted_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("stock_deducted_at", null)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

/** Dá baixa no estoque dos produtos de um pedido pago, uma única vez por pedido. */
export async function deductStockForOrder(orderId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claimed = await claimStockDeduction(supabaseAdmin, orderId);
  if (!claimed) return;

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  if (!items) return;

  for (const item of items) {
    if (!item.product_id) continue;
    const { data, error } = await supabaseAdmin.rpc("decrement_product_stock", {
      p_product_id: item.product_id,
      p_qty: item.quantity,
    });
    if (error) {
      console.error("deductStockForOrder: falha ao baixar estoque", item.product_id, error);
      continue;
    }
    const row = data?.[0];
    if (!row) continue;
    await supabaseAdmin.from("inventory_movements").insert({
      product_id: item.product_id,
      type: "sale",
      quantity: row.new_stock - row.previous_stock,
      previous_quantity: row.previous_stock,
      new_quantity: row.new_stock,
      note: `Pedido ${orderId}`,
    });
  }
}
