import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { assertAdmin } from "./stock.server";

export type AdminOrderAddress = {
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

export type AdminOrderItem = { product_name: string; quantity: number };

export type AdminOrder = {
  id: string;
  order_number: string;
  created_at: string;
  status: Database["public"]["Enums"]["order_status"];
  total: number;
  tracking_code: string | null;
  carrier: string | null;
  address: AdminOrderAddress;
  items: AdminOrderItem[];
  manual?: boolean;
  payment_method?: string | null;
};

export const listOrdersForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ search: z.string().trim().max(120).optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<AdminOrder[]> => {
    await assertAdmin(context.supabase, context.userId);
    const term = data.search?.trim().toLowerCase();

    const [ordersRes, manualRes] = await Promise.all([
      context.supabase
        .from("orders")
        .select(
          "id, order_number, created_at, status, total, tracking_code, carrier, shipping_address, order_items(product_name, quantity)",
        )
        .order("created_at", { ascending: false })
        .limit(2000),
      context.supabase
        .from("manual_sales")
        .select(
          "id, sale_number, created_at, total, customer_name, customer_phone, payment_method, manual_sale_items(product_name, quantity)",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    if (ordersRes.error) throw new Error(`Falha ao carregar pedidos: ${ordersRes.error.message}`);

    const mapped: AdminOrder[] = (ordersRes.data ?? []).map((r) => ({
      id: r.id,
      order_number: r.order_number,
      created_at: r.created_at,
      status: r.status,
      total: Number(r.total),
      tracking_code: r.tracking_code,
      carrier: r.carrier,
      address: (r.shipping_address ?? {}) as AdminOrderAddress,
      items: (r.order_items ?? []) as AdminOrderItem[],
    }));

    const manualMapped: AdminOrder[] = (manualRes.data ?? []).map((r) => ({
      id: r.id,
      order_number: r.sale_number,
      created_at: r.created_at,
      status: "paid" as const,
      total: Number(r.total),
      tracking_code: null,
      carrier: null,
      address: { name: r.customer_name, phone: r.customer_phone },
      items: (r.manual_sale_items ?? []) as AdminOrderItem[],
      manual: true,
      payment_method: r.payment_method,
    }));

    const all = [...mapped, ...manualMapped].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );

    if (!term) return all;
    const termDigits = term.replace(/\D/g, "");
    return mapped.filter((o) => {
      const name = (o.address.name ?? "").toLowerCase();
      const phone = (o.address.phone ?? "").toLowerCase();
      const phoneDigits = phone.replace(/\D/g, "");
      return (
        o.order_number.toLowerCase().includes(term) ||
        name.includes(term) ||
        phone.includes(term) ||
        (termDigits.length > 0 && phoneDigits.includes(termDigits))
      );
    });
  });

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
  "out_of_stock",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const updateFulfillmentSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  trackingCode: z.string().trim().max(80).nullable(),
  carrier: z.string().trim().max(80).nullable(),
});

export const updateOrderFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateFulfillmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.status === "shipped" && !data.trackingCode?.trim()) {
      throw new Error("Informe o código de rastreamento para marcar como despachado.");
    }

    const { data: current } = await context.supabase
      .from("orders")
      .select("status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!current) throw new Error("Pedido não encontrado.");

    const patch: Database["public"]["Tables"]["orders"]["Update"] = {
      status: data.status,
      tracking_code: data.trackingCode?.trim() || null,
      carrier: data.carrier?.trim() || null,
    };
    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.orderId);
    if (error) throw new Error("Falha ao salvar o pedido.");

    if (data.status === "shipped" && current.status !== "shipped") {
      const { notifyOrderShipped } = await import("./order-notifications.server");
      await notifyOrderShipped(data.orderId);
    }
    return { ok: true };
  });
