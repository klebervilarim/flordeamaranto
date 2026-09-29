import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      GET: () => Response.json({ ok: true }),
      POST: async ({ request }) => {
        const expected = process.env["ASAAS_WEBHOOK_TOKEN"];
        const got = request.headers.get("asaas-access-token") ?? "";
        if (!expected || !safeEqual(got, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const body = (await request.json()) as {
            event?: string;
            payment?: { id?: string; externalReference?: string | null };
          };
          const paymentId = body.payment?.id;
          if (!paymentId) return Response.json({ received: true });

          // Confirma o status direto na API (não confia só no corpo recebido)
          const asaas = await import("@/lib/asaas.server");
          const payment = await asaas.getAsaasPayment(paymentId);
          const orderId = payment?.externalReference ?? body.payment?.externalReference;
          if (!payment || !orderId) return Response.json({ received: true });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (asaas.isAsaasPaid(payment.status)) {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "paid", status: "paid" })
              .eq("id", orderId)
              .eq("payment_provider", "asaas");
            const { notifyPaymentConfirmed } = await import("@/lib/order-notifications.server");
            await notifyPaymentConfirmed(orderId);
          } else if (asaas.isAsaasFailed(payment.status)) {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "failed" })
              .eq("id", orderId)
              .eq("payment_provider", "asaas")
              .neq("payment_status", "paid");
          }
          return Response.json({ received: true });
        } catch (err) {
          console.error("asaas webhook error", err);
          return Response.json({ received: true });
        }
      },
    },
  },
});
