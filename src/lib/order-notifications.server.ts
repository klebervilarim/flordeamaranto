type ShippingAddress = { name?: string; email?: string; phone?: string };

function siteUrl() {
  return process.env["PUBLIC_SITE_URL"] ?? "https://flordeamaranto.lovable.app";
}

/** Marca `column` como enviada de forma atômica; retorna false se já tinha sido marcada (ou o pedido não existe). */
async function claimNotification(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  orderId: string,
  column: "pix_email_sent_at" | "payment_email_sent_at" | "payment_whatsapp_sent_at",
) {
  const now = new Date().toISOString();
  const update =
    column === "pix_email_sent_at"
      ? { pix_email_sent_at: now }
      : column === "payment_email_sent_at"
        ? { payment_email_sent_at: now }
        : { payment_whatsapp_sent_at: now };
  const { data } = await supabaseAdmin
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .is(column, null)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

export async function notifyPixGenerated(
  orderId: string,
  pix: { qr_code: string | null },
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimed = await claimNotification(supabaseAdmin, orderId, "pix_email_sent_at");
    if (!claimed) return;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_number, total, shipping_address")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;
    if (!addr.email) return;

    const { sendEmail, pixGeneratedEmailHtml } = await import("./email.server");
    await sendEmail({
      to: addr.email,
      subject: `Pix gerado — Pedido ${order.order_number}`,
      html: pixGeneratedEmailHtml({
        orderNumber: order.order_number,
        total: Number(order.total),
        pixCopyPaste: pix.qr_code,
        paymentUrl: `${siteUrl()}/pagamento/${orderId}`,
      }),
    });
  } catch (err) {
    console.error("notifyPixGenerated failed", err);
  }
}

export async function notifyPaymentConfirmed(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_number, total, shipping_address")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;

    const emailClaimed = await claimNotification(supabaseAdmin, orderId, "payment_email_sent_at");
    if (emailClaimed && addr.email) {
      const { sendEmail, paymentConfirmedEmailHtml } = await import("./email.server");
      await sendEmail({
        to: addr.email,
        subject: `Pagamento confirmado — Pedido ${order.order_number}`,
        html: paymentConfirmedEmailHtml({
          orderNumber: order.order_number,
          total: Number(order.total),
          orderUrl: `${siteUrl()}/pagamento/sucesso/${orderId}`,
        }),
      });
    }

    const whatsappClaimed = await claimNotification(
      supabaseAdmin,
      orderId,
      "payment_whatsapp_sent_at",
    );
    if (whatsappClaimed && addr.phone) {
      const { getActiveWhatsAppConfig, sendWhatsAppText } = await import("./whatsapp.server");
      const config = await getActiveWhatsAppConfig(supabaseAdmin);
      if (config) {
        const firstName = (addr.name ?? "").trim().split(/\s+/)[0] ?? "";
        const greeting = firstName ? `Olá, ${firstName}! ` : "Olá! ";
        await sendWhatsAppText(
          config,
          addr.phone,
          `${greeting}Seu pagamento do pedido ${order.order_number} foi confirmado. Obrigada pela compra na Flor de Amaranto! 🌸`,
        );
      }
    }
  } catch (err) {
    console.error("notifyPaymentConfirmed failed", err);
  }
}
