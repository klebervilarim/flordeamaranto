import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidCpfCnpj } from "@/lib/brazil-document";
import { cardChargeAmount, maxInstallments } from "@/lib/installments";

const payerSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(255),
  document: z.string().trim().refine(isValidCpfCnpj, "CPF/CNPJ inválido"),
});

export const getMercadoPagoPublicConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const publicKey = process.env["MERCADOPAGO_PUBLIC_KEY"];
    if (!publicKey) throw new Error("Pagamento indisponível no momento.");
    return { publicKey };
  });

export const processDirectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .discriminatedUnion("method", [
        z.object({ orderId: z.string().uuid(), method: z.literal("pix"), payer: payerSchema }),
        z.object({
          orderId: z.string().uuid(),
          method: z.literal("card"),
          payer: payerSchema,
          card: z.object({
            number: z.string().regex(/^[\d ]{13,23}$/),
            holder: z.string().trim().min(3).max(120),
            exp: z.string().regex(/^\d{2}\/\d{2,4}$/),
            cvv: z.string().regex(/^\d{3,4}$/),
          }),
          installments: z.number().int().min(1).max(3),
        }),
      ])
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, shipping, discount, payment_status, user_id, shipping_address")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order || order.user_id !== userId) {
      return { ok: false as const, error: "Pedido não encontrado." };
    }
    if (order.payment_status === "paid") {
      return { ok: false as const, error: "Este pedido já foi pago." };
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", order.id);
    if (
      !items?.length ||
      items.some((item) => Number(item.quantity) < 1 || Number(item.unit_price) <= 0)
    ) {
      return { ok: false as const, error: "O pedido possui itens com valor inválido." };
    }
    const itemsTotal = Number(
      items
        .reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0)
        .toFixed(2),
    );
    const total = Number(
      Math.max(itemsTotal + Number(order.shipping ?? 0) - Number(order.discount ?? 0), 0).toFixed(
        2,
      ),
    );
    if (total <= 0) return { ok: false as const, error: "Valor do pedido inválido." };
    if (data.method === "card" && data.installments > maxInstallments(total)) {
      return {
        ok: false as const,
        error: `Este pedido parcela em até ${maxInstallments(total)}x sem juros.`,
      };
    }

    try {
      const asaas = await import("./asaas.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const addr = (order.shipping_address ?? {}) as Record<string, string>;
      const customer = await asaas.findOrCreateCustomer({
        name: data.payer.name,
        email: data.payer.email,
        document: data.payer.document,
        phone: addr["phone"],
      });
      const description = `Pedido ${order.order_number} — Flor de Amaranto`;

      let paymentId: string;
      let status: string;
      let pix: Awaited<ReturnType<typeof asaas.createPixPayment>>["pix"] | undefined;
      if (data.method === "pix") {
        const res = await asaas.createPixPayment({
          customer,
          amount: total,
          description,
          externalReference: order.id,
        });
        paymentId = res.payment.id;
        status = res.payment.status;
        pix = res.pix;
      } else {
        const { getRequestHeader } = await import("@tanstack/react-start/server");
        const remoteIp =
          getRequestHeader("cf-connecting-ip") ??
          getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
          "127.0.0.1";
        const res = await asaas.createCardPayment({
          customer,
          amount: cardChargeAmount(total, data.installments),
          installments: data.installments,
          description,
          externalReference: order.id,
          remoteIp,
          card: data.card,
          holderInfo: {
            name: data.payer.name,
            email: data.payer.email,
            document: data.payer.document,
            postalCode: addr["zip"] ?? "",
            addressNumber: addr["number"] ?? "0",
            phone: addr["phone"] ?? "",
          },
        });
        paymentId = res.id;
        status = res.status;
      }

      const paid = asaas.isAsaasPaid(status);
      await supabaseAdmin
        .from("orders")
        .update({
          payment_id: paymentId,
          payment_provider: "asaas",
          payment_method: data.method === "pix" ? "pix" : "card",
          payment_status: paid ? "paid" : "pending",
          status: paid ? "paid" : "pending",
          installments: data.method === "card" ? data.installments : null,
          total,
          pix_qr_code: pix?.qr_code ?? null,
          pix_qr_code_base64: pix?.qr_code_base64 ?? null,
          pix_ticket_url: null,
          pix_expires_at: pix?.expires_at ?? null,
        })
        .eq("id", order.id);

      if (pix) {
        const { notifyPixGenerated } = await import("./order-notifications.server");
        await notifyPixGenerated(order.id, { qr_code: pix.qr_code });
      }
      if (paid) {
        const { notifyPaymentConfirmed } = await import("./order-notifications.server");
        await notifyPaymentConfirmed(order.id);
      }

      return {
        ok: true as const,
        data: {
          status: paid ? "approved" : data.method === "card" ? "rejected" : "pending",
          statusDetail: status,
          pix,
        },
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível processar o pagamento.";
      return { ok: false as const, error: message };
    }
  });

export const startCheckoutPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orderId: z.string().uuid(),
        name: payerSchema.shape.name,
        email: payerSchema.shape.email,
        document: payerSchema.shape.document,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, subtotal, shipping, discount, payment_status, user_id, shipping_address",
      )
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

    if (
      !items?.length ||
      items.some((item) => Number(item.quantity) < 1 || Number(item.unit_price) <= 0)
    ) {
      return { ok: false as const, error: "O pedido possui itens com valor inválido." };
    }

    const itemsTotal = Number(
      (items ?? [])
        .reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0)
        .toFixed(2),
    );
    const total = Number(
      Math.max(itemsTotal + Number(order.shipping) - Number(order.discount ?? 0), 0).toFixed(2),
    );
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
        payerEmail: data.email,
        payerName: data.name,
        payerDocument: data.document,
        payerPhone: addr["phone"] ?? undefined,
        payerAddress:
          addr["zip"] && addr["street"]
            ? {
                zip_code: String(addr["zip"]).replace(/\D/g, ""),
                street_name: String(addr["street"]),
                street_number: String(addr["number"] ?? "0"),
              }
            : undefined,
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
      const { notifyPaymentConfirmed } = await import("./order-notifications.server");
      await notifyPaymentConfirmed(order.id);
      return { status: "paid" as const };
    }
    if (payment.status === "rejected" || payment.status === "cancelled") {
      await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return { status: "failed" as const };
    }
    return { status: "pending" as const };
  });
