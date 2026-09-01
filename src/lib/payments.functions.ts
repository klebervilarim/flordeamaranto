import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  orderId: z.string().uuid(),
  buyer: z.object({
    name: z.string().min(3).max(120),
    email: z.string().email().max(255),
    document: z.string().min(11).max(20),
  }),
  payment: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("pix"),
    }),
    z.object({
      method: z.literal("card"),
      installments: z.number().int().min(1).max(12),
      card: z.object({
        number: z.string().min(12).max(25),
        exp: z.string().min(4).max(7),
        cvv: z.string().min(3).max(4),
        holder: z.string().min(2).max(120),
      }),
    }),
  ]),
});

export const payOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, subtotal, shipping, payment_status, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) return { ok: false as const, error: "Pedido não encontrado." };
    if (order.user_id !== userId) return { ok: false as const, error: "Pedido não encontrado." };
    if (order.payment_status === "paid") {
      return { ok: false as const, error: "Este pedido já foi pago." };
    }

    const isPix = data.payment.method === "pix";
    const discount = isPix ? Number((Number(order.subtotal) * 0.05).toFixed(2)) : 0;
    const total = Number((Number(order.subtotal) + Number(order.shipping) - discount).toFixed(2));
    if (total <= 0) return { ok: false as const, error: "Valor do pedido inválido." };

    const { createMercadoPagoPayment, createCardToken } = await import("./mercadopago.server");

    try {
      let cardToken: string | undefined;
      if (data.payment.method === "card") {
        cardToken = await createCardToken(data.payment.card, data.buyer.document);
      }

      const origin = process.env["PUBLIC_SITE_URL"] ?? "https://flordeamaranto.lovable.app";
      const result = await createMercadoPagoPayment({
        amount: total,
        description: `Pedido ${order.order_number} — Flor de Amaranto`,
        externalReference: `${order.id}:${userId}`,
        notificationUrl: `${origin}/api/public/mercadopago-webhook`,
        payer: data.buyer,
        method: isPix ? "pix" : "card",
        cardToken,
        installments: data.payment.method === "card" ? data.payment.installments : undefined,
        metadata: { order_id: order.id, user_id: userId },
      });

      const paid = result.status === "approved";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("orders")
        .update({
          payment_method: isPix ? "pix" : "cartao",
          payment_provider: "mercadopago",
          payment_id: result.id,
          payment_status: paid ? "paid" : result.status === "rejected" ? "failed" : "pending",
          installments: data.payment.method === "card" ? data.payment.installments : null,
          discount,
          total,
          pix_qr_code: result.pix?.qr_code ?? null,
          pix_qr_code_base64: result.pix?.qr_code_base64 ?? null,
          pix_ticket_url: result.pix?.ticket_url ?? null,
          pix_expires_at: result.pix?.expires_at ?? null,
          ...(paid ? { status: "paid" as const } : {}),
        })
        .eq("id", order.id);

      return {
        ok: true as const,
        data: {
          paymentId: result.id,
          status: result.status,
          statusDetail: result.status_detail,
          total,
          discount,
          pix: result.pix ?? null,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no pagamento.";
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
