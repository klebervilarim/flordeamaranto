import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./stock.server";

export const MANUAL_PAYMENT_METHODS = ["pix", "cartao", "dinheiro"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const MANUAL_PAYMENT_LABELS: Record<ManualPaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
};

const itemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().trim().min(1).max(200),
  unitPrice: z.number().min(0),
  quantity: z.number().int().min(1).max(999),
});

const createSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(20),
  paymentMethod: z.enum(MANUAL_PAYMENT_METHODS),
  note: z.string().trim().max(500).optional(),
  items: z.array(itemSchema).min(1).max(50),
});

export const createManualSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const total = data.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const saleNumber = `VM${new Date()
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, "")}${String(Math.floor(Math.random() * 90000) + 10000)}`;

    const { data: sale, error: saleError } = await supabaseAdmin
      .from("manual_sales")
      .insert({
        sale_number: saleNumber,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        payment_method: data.paymentMethod,
        total: Math.round(total * 100) / 100,
        note: data.note?.trim() || null,
        created_by: context.userId,
      })
      .select("id, sale_number")
      .single();
    if (saleError || !sale) throw new Error("Falha ao registrar a venda.");

    const { error: itemsError } = await supabaseAdmin.from("manual_sale_items").insert(
      data.items.map((it) => ({
        sale_id: sale.id,
        product_id: it.productId,
        product_name: it.productName,
        unit_price: it.unitPrice,
        quantity: it.quantity,
        total: Math.round(it.unitPrice * it.quantity * 100) / 100,
      })),
    );
    if (itemsError) throw new Error("Falha ao registrar os itens da venda.");

    for (const it of data.items) {
      const { data: stockRow, error: stockError } = await supabaseAdmin.rpc(
        "decrement_product_stock",
        { p_product_id: it.productId, p_qty: it.quantity },
      );
      if (stockError) {
        console.error("createManualSale: falha ao baixar estoque", it.productId, stockError);
        continue;
      }
      const row = stockRow?.[0];
      if (!row) continue;
      await supabaseAdmin.from("inventory_movements").insert({
        product_id: it.productId,
        type: "sale",
        quantity: row.new_stock - row.previous_stock,
        previous_quantity: row.previous_stock,
        new_quantity: row.new_stock,
        created_by: context.userId,
        note: `Venda manual ${sale.sale_number}`,
      });
    }

    return { ok: true, saleNumber: sale.sale_number };
  });
