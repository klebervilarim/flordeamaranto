type ShippingAddress = {
  name?: string;
  email?: string;
  phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
};

const ADMIN_NOTIFICATION_EMAIL = "klebervilarim@hotmail.com";

function siteUrl() {
  return process.env["PUBLIC_SITE_URL"] ?? "https://flordeamaranto.lovable.app";
}

type NotificationClaimColumn =
  | "pix_email_sent_at"
  | "payment_email_sent_at"
  | "payment_whatsapp_sent_at"
  | "shipped_whatsapp_sent_at"
  | "admin_new_order_email_sent_at";

/** Marca `column` como enviada de forma atômica; retorna false se já tinha sido marcada (ou o pedido não existe). */
async function claimNotification(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  orderId: string,
  column: NotificationClaimColumn,
) {
  const update: Partial<Record<NotificationClaimColumn, string>> = {
    [column]: new Date().toISOString(),
  };
  const { data } = await supabaseAdmin
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .is(column, null)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

function formatOrderDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function firstNameOf(addr: ShippingAddress) {
  return (addr.name ?? "").trim().split(/\s+/)[0] ?? "";
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
      .select("order_number, total, shipping_address, created_at")
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
        const { data: items } = await supabaseAdmin
          .from("order_items")
          .select("product_name, quantity")
          .eq("order_id", orderId);

        const firstName = firstNameOf(addr);
        const orderDate = formatOrderDate(order.created_at);
        const productsList = (items ?? [])
          .map((i) => `• ${i.product_name} — ${i.quantity}`)
          .join("\n");

        const message = [
          "🌸 Flor de Amaranto — Pedido Confirmado! ✨",
          "",
          `Olá${firstName ? `, ${firstName}` : ""}! 💐`,
          "",
          "Seu pagamento foi confirmado com sucesso e seu pedido já está em preparação. 🥰",
          "",
          `📦 Nº do Pedido: ${order.order_number}`,
          `📅 Data do Pedido: ${orderDate}`,
          "",
          "🛍️ Produtos adquiridos:",
          productsList,
          "",
          "✨ Já estamos organizando tudo com muito carinho para preparar sua mercadoria e deixar seu pedido pronto para o envio.",
          "",
          "Assim que o pedido for despachado, você receberá as informações de envio e rastreamento para acompanhar a entrega. 📦🚚",
          "",
          "💖 Obrigada por escolher a Flor de Amaranto!",
          "Sua beleza merece uma experiência especial.",
          "",
          "🌸 Flor de Amaranto",
          "Cosméticos e Beleza",
        ].join("\n");

        await sendWhatsAppText(config, addr.phone, message);
      }
    }
  } catch (err) {
    console.error("notifyPaymentConfirmed failed", err);
  }
}

/** Avisa a loja por e-mail sempre que um pedido é criado. */
export async function notifyAdminNewOrder(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimed = await claimNotification(
      supabaseAdmin,
      orderId,
      "admin_new_order_email_sent_at",
    );
    if (!claimed) return;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_number, total, shipping_address, created_at, payment_method")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", orderId);

    const itemsHtml = (items ?? [])
      .map(
        (i) =>
          `<li>${i.product_name} — ${i.quantity}x (R$ ${Number(i.unit_price).toFixed(2)})</li>`,
      )
      .join("");
    const addressLine = [
      [addr.street, addr.number, addr.complement].filter(Boolean).join(", "),
      [addr.district, addr.city, addr.state].filter(Boolean).join(" — "),
      addr.zip,
    ]
      .filter(Boolean)
      .join(" · ");

    const { sendEmail } = await import("./email.server");
    await sendEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `Novo pedido — ${order.order_number}`,
      html: `
        <h2>Novo pedido recebido</h2>
        <p><strong>Nº do Pedido:</strong> ${order.order_number}</p>
        <p><strong>Data:</strong> ${formatOrderDate(order.created_at)}</p>
        <p><strong>Cliente:</strong> ${addr.name ?? "-"}</p>
        <p><strong>E-mail:</strong> ${addr.email ?? "-"}</p>
        <p><strong>Telefone:</strong> ${addr.phone ?? "-"}</p>
        <p><strong>Endereço:</strong> ${addressLine || "-"}</p>
        <p><strong>Pagamento:</strong> ${order.payment_method ?? "-"}</p>
        <p><strong>Total:</strong> R$ ${Number(order.total).toFixed(2)}</p>
        <h3>Produtos</h3>
        <ul>${itemsHtml}</ul>
      `,
    });
  } catch (err) {
    console.error("notifyAdminNewOrder failed", err);
  }
}

/** Avisa o cliente por WhatsApp quando o pedido é despachado. */
export async function notifyOrderShipped(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimed = await claimNotification(supabaseAdmin, orderId, "shipped_whatsapp_sent_at");
    if (!claimed) return;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_number, shipping_address, created_at, tracking_code, carrier")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;
    if (!addr.phone) return;

    const { getActiveWhatsAppConfig, sendWhatsAppText } = await import("./whatsapp.server");
    const config = await getActiveWhatsAppConfig(supabaseAdmin);
    if (!config) return;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity")
      .eq("order_id", orderId);

    const productsList = (items ?? []).map((i) => `• ${i.product_name} — ${i.quantity}`).join("\n");

    const message = [
      "🌸 Flor de Amaranto — Seu Pedido Foi Enviado! 📦✨",
      "",
      `Olá${firstNameOf(addr) ? `, ${firstNameOf(addr)}` : ""}! 💐`,
      "",
      "Temos uma ótima notícia: seu pedido já foi despachado! 🥰",
      "",
      `📦 Nº do Pedido: ${order.order_number}`,
      `📅 Data do Pedido: ${formatOrderDate(order.created_at)}`,
      "",
      "🛍️ Produtos enviados:",
      productsList,
      "",
      "🚚 Seu pedido já está a caminho!",
      "",
      `🔎 Código de rastreamento: ${order.tracking_code ?? "-"}`,
      `📍 Transportadora: ${order.carrier ?? "-"}`,
      "",
      "Você já pode acompanhar o trajeto da sua encomenda através do código de rastreamento acima.",
      "",
      "💖 Preparamos tudo com muito carinho e agora é só aguardar a chegada dos seus produtos!",
      "",
      "Obrigada por escolher a Flor de Amaranto. 🌸",
      "Esperamos que você ame sua experiência!",
      "",
      "✨ Flor de Amaranto",
      "Cosméticos e Beleza",
    ].join("\n");

    await sendWhatsAppText(config, addr.phone, message);
  } catch (err) {
    console.error("notifyOrderShipped failed", err);
  }
}
