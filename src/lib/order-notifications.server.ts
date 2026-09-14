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

/** Monta os dados resumidos do pedido, usados nos e-mails internos (admin e comercial). */
function orderSummaryTemplateData(input: {
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
  const addressLine = [
    [input.addr.street, input.addr.number, input.addr.complement].filter(Boolean).join(", "),
    [input.addr.district, input.addr.city, input.addr.state].filter(Boolean).join(" — "),
    input.addr.zip,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    orderNumber: input.orderNumber,
    orderDate: input.orderDate,
    customerName: input.addr.name ?? "-",
    customerEmail: input.addr.email ?? "-",
    customerPhone: input.addr.phone ?? "-",
    addressLine: addressLine || "-",
    paymentMethod: input.paymentMethod,
    subtotal: input.subtotal,
    shipping: input.shipping,
    discount: input.discount,
    couponCode: input.couponCode,
    total: input.total,
    items: input.items,
  };
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

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("pix-generated", addr.email, {
      templateData: {
        orderNumber: order.order_number,
        total: Number(order.total),
        pixCopyPaste: pix.qr_code,
        paymentUrl: `${siteUrl()}/pagamento/${orderId}`,
      },
      idempotencyKey: `pix-generated-${orderId}`,
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
      const shortfalls = await deductStockForOrder(orderId);
      if (shortfalls.length > 0) {
        try {
          const { sendTemplateEmail } = await import("./email-templates/send-email");
          const alertData = {
            orderNumber: order.order_number,
            orderDate,
            customerName: addr.name ?? "-",
            customerPhone: addr.phone ?? "-",
            customerEmail: addr.email ?? "-",
            items: shortfalls.map((s) => ({
              productName: s.productName,
              quantity: s.quantity,
              previousStock: s.previousStock,
            })),
          };
          await sendTemplateEmail("out-of-stock-alert", ADMIN_NOTIFICATION_EMAIL, {
            templateData: alertData,
            idempotencyKey: `out-of-stock-alert-admin-${orderId}`,
          });
          await sendTemplateEmail("out-of-stock-alert", COMMERCIAL_NOTIFICATION_EMAIL, {
            templateData: alertData,
            idempotencyKey: `out-of-stock-alert-commercial-${orderId}`,
          });
        } catch (err) {
          console.error(
            "notifyPaymentConfirmed: falha ao enviar alerta de estoque insuficiente",
            err,
          );
        }
      }
    } catch (err) {
      console.error("notifyPaymentConfirmed: falha ao baixar estoque", err);
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

    // E-mails por último: se o envio falhar/demorar, o WhatsApp já saiu.
    const emailClaimed = await claimNotification(supabaseAdmin, orderId, "payment_email_sent_at");
    if (emailClaimed && addr.email) {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("payment-confirmed", addr.email, {
        templateData: {
          firstName,
          orderNumber: order.order_number,
          orderDate,
          items,
          orderUrl: `${siteUrl()}/pagamento/sucesso/${orderId}`,
        },
        idempotencyKey: `payment-confirmed-${orderId}`,
      });
    }

    try {
      await notifyCommercialOrderCompleted(orderId);
    } catch (err) {
      console.error("notifyPaymentConfirmed: falha ao notificar área comercial", err);
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

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("admin-new-order", ADMIN_NOTIFICATION_EMAIL, {
      templateData: orderSummaryTemplateData({
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
      idempotencyKey: `admin-new-order-${orderId}`,
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

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("commercial-order-completed", COMMERCIAL_NOTIFICATION_EMAIL, {
      templateData: orderSummaryTemplateData({
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
      idempotencyKey: `commercial-order-completed-${orderId}`,
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
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("order-shipped", addr.email, {
        templateData: {
          firstName,
          orderNumber: order.order_number,
          orderDate,
          items,
          trackingCode: order.tracking_code,
          carrier: order.carrier,
        },
        idempotencyKey: `order-shipped-${orderId}`,
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
