import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startCheckoutPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orderId: z.string().uuid(),
        name: z.string().trim().min(3).max(120),
        email: z.string().trim().email().max(255),
        document: z
          .string()
          .trim()
          .refine((v) => {
            const d = v.replace(/\D/g, "");
            return d.length === 11 || d.length === 14;
          }, "CPF/CNPJ inválido"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, subtotal, shipping, payment_status, user_id, shipping_address")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) return { ok: false as const, error: "Pedido não encontrado." };
    if (order.user_id !== userId) return { ok: false as const, error: "Pedido não encontrado." };
    if (order.payment_status === "paid") {
      return { ok: false as const, error: "Este pedido já foi pago." };
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", order.id);

    const total = Number((Number(order.subtotal) + Number(order.shipping)).toFixed(2));
    if (total <= 0) return { ok: false as const, error: "Valor do pedido inválido." };

    const { createCheckoutPreference } = await import("./mercadopago.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const addr = (order.shipping_address ?? {}) as Record<string, string>;
      const origin = process.env["PUBLIC_SITE_URL"] ?? "https://flordeamaranto.lovable.app";
      const pref = await createCheckoutPreference({
        orderId: order.id,
        orderNumber: String(order.order_number),
        amount: total,
        items: (items ?? []).map((it) => ({
          name: String(it.product_name ?? "Produto"),
          quantity: Number(it.quantity ?? 1),
          price: Number(it.unit_price ?? 0),
        })),
        shippingPrice: Number(order.shipping ?? 0),
        payerEmail: addr["email"] ?? "",
        payerName: addr["name"] ?? "Cliente",
        notificationUrl: `${origin}/api/public/mercadopago-webhook`,
        successUrl: `${origin}/pagamento/sucesso/${order.id}`,
        failureUrl: `${origin}/pagamento/${order.id}`,
        pendingUrl: `${origin}/pagamento/sucesso/${order.id}`,
      });

      await supabaseAdmin
        .from("orders")
        .update({
          payment_provider: "mercadopago",
          payment_method: "checkout_pro",
          payment_status: "pending",
          discount: 0,
          total,
        })
        .eq("id", order.id);

      return { ok: true as const, data: { initPoint: pref.init_point } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao iniciar pagamento.";
      return { ok: false as const, error: message };
    }
  });

export const checkOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, payment_id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== userId) return { status: "unknown" as const };
    if (order.payment_status === "paid") return { status: "paid" as const };
    if (!order.payment_id) return { status: order.payment_status as string };

    const { getMercadoPagoPayment } = await import("./mercadopago.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payment = await getMercadoPagoPayment(order.payment_id);
    if (!payment) return { status: order.payment_status as string };
    if (payment.status === "approved") {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "paid", status: "paid" })
        .eq("id", order.id);
      return { status: "paid" as const };
    }
    if (payment.status === "rejected" || payment.status === "cancelled") {
      await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return { status: "failed" as const };
    }
    return { status: "pending" as const };
  });
