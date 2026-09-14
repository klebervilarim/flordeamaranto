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
const COMMERCIAL_NOTIFICATION_EMAIL = "comercial@flordeamaranto.com.br";

function siteUrl() {
  return process.env["PUBLIC_SITE_URL"] ?? "https://flordeamaranto.lovable.app";
}

type NotificationClaimColumn =
  | "pix_email_sent_at"
  | "payment_email_sent_at"
  | "payment_whatsapp_sent_at"
  | "shipped_whatsapp_sent_at"
  | "shipped_email_sent_at"
  | "admin_new_order_email_sent_at"
  | "commercial_email_sent_at"
  | "coupon_applied_at";

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

/** Monta o HTML com todos os dados do pedido, usado nos e-mails internos (admin e comercial). */
function orderSummaryEmailHtml(input: {
  orderNumber: string;
  orderDate: string;
  addr: ShippingAddress;
  paymentMethod: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode: string | null;
  total: number;
  items: { product_name: string; quantity: number; unit_price: number }[];
}) {
  const itemsHtml = input.items
    .map(
      (i) => `<li>${i.product_name} — ${i.quantity}x (R$ ${Number(i.unit_price).toFixed(2)})</li>`,
    )
    .join("");
  const addressLine = [
    [input.addr.street, input.addr.number, input.addr.complement].filter(Boolean).join(", "),
    [input.addr.district, input.addr.city, input.addr.state].filter(Boolean).join(" — "),
    input.addr.zip,
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <h2>Pedido ${input.orderNumber}</h2>
    <p><strong>Data:</strong> ${input.orderDate}</p>
    <p><strong>Cliente:</strong> ${input.addr.name ?? "-"}</p>
    <p><strong>E-mail:</strong> ${input.addr.email ?? "-"}</p>
    <p><strong>Telefone:</strong> ${input.addr.phone ?? "-"}</p>
    <p><strong>Endereço:</strong> ${addressLine || "-"}</p>
    <p><strong>Pagamento:</strong> ${input.paymentMethod ?? "-"}</p>
    <h3>Produtos</h3>
    <ul>${itemsHtml}</ul>
    <p><strong>Subtotal:</strong> R$ ${input.subtotal.toFixed(2)}</p>
    <p><strong>Frete:</strong> R$ ${input.shipping.toFixed(2)}</p>
    ${
      input.discount > 0
        ? `<p><strong>Desconto${input.couponCode ? ` (${input.couponCode})` : ""}:</strong> -R$ ${input.discount.toFixed(2)}</p>`
        : ""
    }
    <p><strong>Total:</strong> R$ ${input.total.toFixed(2)}</p>
  `;
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
      .select("order_number, total, shipping_address, created_at, coupon_code")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;
    const firstName = firstNameOf(addr);
    const orderDate = formatOrderDate(order.created_at);

    const { data: itemRows } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity")
      .eq("order_id", orderId);
    const items = (itemRows ?? []).map((i) => ({ name: i.product_name, quantity: i.quantity }));

    try {
      const { deductStockForOrder } = await import("./stock.server");
      await deductStockForOrder(orderId);
    } catch (err) {
      console.error("notifyPaymentConfirmed: falha ao baixar estoque", err);
    }

    try {
      await notifyCommercialOrderCompleted(orderId);
    } catch (err) {
      console.error("notifyPaymentConfirmed: falha ao notificar área comercial", err);
    }

    if (order.coupon_code) {
      const couponClaimed = await claimNotification(supabaseAdmin, orderId, "coupon_applied_at");
      if (couponClaimed) {
        try {
          const { incrementCouponUsage } = await import("./coupons.functions");
          await incrementCouponUsage(order.coupon_code);
        } catch (err) {
          console.error("notifyPaymentConfirmed: falha ao registrar uso do cupom", err);
        }
      }
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
        const productsList = items.map((i) => `• ${i.name} — ${i.quantity}`).join("\n");

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
      .select(
        "order_number, subtotal, shipping, discount, coupon_code, total, shipping_address, created_at, payment_method",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", orderId);

    const { sendEmail } = await import("./email.server");
    await sendEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `Novo pedido — ${order.order_number}`,
      html: orderSummaryEmailHtml({
        orderNumber: order.order_number,
        orderDate: formatOrderDate(order.created_at),
        addr,
        paymentMethod: order.payment_method,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        couponCode: order.coupon_code,
        total: Number(order.total),
        items: items ?? [],
      }),
    });
  } catch (err) {
    console.error("notifyAdminNewOrder failed", err);
  }
}

/** Avisa a área comercial por e-mail, com todos os dados do pedido, assim que a compra é finalizada (pagamento confirmado). */
export async function notifyCommercialOrderCompleted(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimed = await claimNotification(supabaseAdmin, orderId, "commercial_email_sent_at");
    if (!claimed) return;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "order_number, subtotal, shipping, discount, coupon_code, total, shipping_address, created_at, payment_method",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", orderId);

    const { sendEmail } = await import("./email.server");
    await sendEmail({
      to: COMMERCIAL_NOTIFICATION_EMAIL,
      subject: `Pedido concluído — ${order.order_number}`,
      html: orderSummaryEmailHtml({
        orderNumber: order.order_number,
        orderDate: formatOrderDate(order.created_at),
        addr,
        paymentMethod: order.payment_method,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        couponCode: order.coupon_code,
        total: Number(order.total),
        items: items ?? [],
      }),
    });
  } catch (err) {
    console.error("notifyCommercialOrderCompleted failed", err);
  }
}

/** Avisa o cliente por e-mail e WhatsApp quando o pedido é despachado. */
export async function notifyOrderShipped(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_number, shipping_address, created_at, tracking_code, carrier")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const addr = (order.shipping_address ?? {}) as ShippingAddress;
    const firstName = firstNameOf(addr);
    const orderDate = formatOrderDate(order.created_at);

    const { data: itemRows } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity")
      .eq("order_id", orderId);
    const items = (itemRows ?? []).map((i) => ({ name: i.product_name, quantity: i.quantity }));

    const emailClaimed = await claimNotification(supabaseAdmin, orderId, "shipped_email_sent_at");
    if (emailClaimed && addr.email) {
      const { sendEmail, orderShippedEmailHtml } = await import("./email.server");
      await sendEmail({
        to: addr.email,
        subject: `Pedido enviado — Pedido ${order.order_number}`,
        html: orderShippedEmailHtml({
          firstName,
          orderNumber: order.order_number,
          orderDate,
          items,
          trackingCode: order.tracking_code,
          carrier: order.carrier,
        }),
      });
    }

    const whatsappClaimed = await claimNotification(
      supabaseAdmin,
      orderId,
      "shipped_whatsapp_sent_at",
    );
    if (whatsappClaimed && addr.phone) {
      const { getActiveWhatsAppConfig, sendWhatsAppText } = await import("./whatsapp.server");
      const config = await getActiveWhatsAppConfig(supabaseAdmin);
      if (config) {
        const productsList = items.map((i) => `• ${i.name} — ${i.quantity}`).join("\n");

        const message = [
          "🌸 Flor de Amaranto — Seu Pedido Foi Enviado! 📦✨",
          "",
          `Olá${firstName ? `, ${firstName}` : ""}! 💐`,
          "",
          "Temos uma ótima notícia: seu pedido já foi despachado! 🥰",
          "",
          `📦 Nº do Pedido: ${order.order_number}`,
          `📅 Data do Pedido: ${orderDate}`,
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
      }
    }
  } catch (err) {
    console.error("notifyOrderShipped failed", err);
  }
}
