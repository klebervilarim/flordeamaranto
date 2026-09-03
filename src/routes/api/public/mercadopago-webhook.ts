import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      GET: () => Response.json({ ok: true }, { headers: cors }),
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const raw = await request.text();
          let body: Record<string, unknown> = {};
          try {
            body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
          } catch {
            body = {};
          }
          const dataField = body["data"] as { id?: string | number } | undefined;
          const resource = typeof body["resource"] === "string" ? (body["resource"] as string) : "";
          const paymentId =
            (dataField?.id ? String(dataField.id) : "") ||
            (resource ? (resource.split("/").pop() ?? "") : "") ||
            url.searchParams.get("data.id") ||
            url.searchParams.get("id") ||
            "";
          const type =
            String(body["type"] ?? body["action"] ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");

          if (!paymentId || (type && !type.includes("payment"))) {
            return Response.json({ ok: true, received: true }, { headers: cors });
          }

          const { getMercadoPagoPayment } = await import("@/lib/mercadopago.server");
          const payment = await getMercadoPagoPayment(paymentId);
          if (!payment) return Response.json({ ok: true, received: true }, { headers: cors });

          const orderId =
            (payment.metadata?.["order_id"] as string | undefined) ??
            payment.external_reference?.split(":")[0];
          if (!orderId) return Response.json({ ok: true, received: true }, { headers: cors });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (payment.status === "approved") {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "paid", status: "paid", payment_id: String(payment.id) })
              .eq("id", orderId);
            const { notifyPaymentConfirmed } = await import("@/lib/order-notifications.server");
            await notifyPaymentConfirmed(orderId);
          } else if (payment.status === "rejected" || payment.status === "cancelled") {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "failed", payment_id: String(payment.id) })
              .eq("id", orderId);
          }
          return Response.json({ ok: true, received: true }, { headers: cors });
        } catch (err) {
          console.error("mercadopago webhook error", err);
          return Response.json({ ok: true, received: true }, { headers: cors });
        }
      },
    },
  },
});
