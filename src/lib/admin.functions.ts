import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./stock.server";

export type AdminDashboard = {
  revenue: number;
  ordersCount: number;
  avgTicket: number;
  itemsSold: number;
  customersTotal: number;
  customersWithOrders: number;
  returningCustomers: number;
  productsActive: number;
  byStatus: { label: string; value: number }[];
  byPayment: { label: string; value: number }[];
  byState: { label: string; value: number; revenue: number }[];
  byDay: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; brand: string | null; qty: number; revenue: number }[];
  lowStock: { id: string; name: string; sku: string; stock: number; image_url: string | null }[];
  recentOrders: {
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
    city: string | null;
    state: string | null;
  }[];
};

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDashboard> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ordersRes, itemsRes, productsRes, customersRes, lowStockRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, order_number, status, total, payment_method, created_at, user_id, shipping_address")
        .order("created_at", { ascending: false })
        .limit(3000),
      supabaseAdmin
        .from("order_items")
        .select("product_name, brand_name, quantity, total")
        .limit(8000),
      supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("products")
        .select("id, name, sku, stock, image_url")
        .eq("status", "active")
        .lte("stock", 3)
        .order("stock", { ascending: true })
        .limit(12),
    ]);

    const orders = ordersRes.data ?? [];
    const valid = orders.filter((o) => o.status !== "cancelled");
    const revenue = valid.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const ordersCount = valid.length;

    const countBy = <K extends string>(rows: K[]): { label: string; value: number }[] => {
      const map = new Map<string, number>();
      for (const r of rows) map.set(r, (map.get(r) ?? 0) + 1);
      return [...map.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    };

    const stateMap = new Map<string, { value: number; revenue: number }>();
    for (const o of valid) {
      const addr = o.shipping_address as { state?: string } | null;
      const uf = (addr?.state ?? "").toUpperCase() || "—";
      const cur = stateMap.get(uf) ?? { value: 0, revenue: 0 };
      cur.value += 1;
      cur.revenue += Number(o.total ?? 0);
      stateMap.set(uf, cur);
    }

    const days: { date: string; revenue: number; orders: number }[] = [];
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dayMap.set(d, { revenue: 0, orders: 0 });
    }
    for (const o of valid) {
      const d = String(o.created_at).slice(0, 10);
      const cur = dayMap.get(d);
      if (cur) {
        cur.revenue += Number(o.total ?? 0);
        cur.orders += 1;
      }
    }
    for (const [date, v] of dayMap) days.push({ date, ...v });

    const prodMap = new Map<string, { name: string; brand: string | null; qty: number; revenue: number }>();
    let itemsSold = 0;
    for (const it of itemsRes.data ?? []) {
      const key = it.product_name;
      const cur = prodMap.get(key) ?? { name: key, brand: it.brand_name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.total ?? 0);
      itemsSold += it.quantity;
      prodMap.set(key, cur);
    }
    const topProducts = [...prodMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

    const orderCountByUser = new Map<string, number>();
    for (const o of valid) {
      if (o.user_id) orderCountByUser.set(o.user_id, (orderCountByUser.get(o.user_id) ?? 0) + 1);
    }
    const returningCustomers = [...orderCountByUser.values()].filter((n) => n > 1).length;

    const recentOrders = orders.slice(0, 8).map((o) => {
      const addr = o.shipping_address as { city?: string; state?: string } | null;
      return {
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total: Number(o.total ?? 0),
        created_at: o.created_at,
        city: addr?.city ?? null,
        state: addr?.state ?? null,
      };
    });

    return {
      revenue,
      ordersCount,
      avgTicket: ordersCount > 0 ? revenue / ordersCount : 0,
      itemsSold,
      customersTotal: customersRes.count ?? 0,
      customersWithOrders: orderCountByUser.size,
      returningCustomers,
      productsActive: productsRes.count ?? 0,
      byStatus: countBy(orders.map((o) => o.status)),
      byPayment: countBy(valid.map((o) => o.payment_method ?? "outro")),
      byState: [...stateMap.entries()]
        .map(([label, v]) => ({ label, ...v }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      byDay: days,
      topProducts,
      lowStock: (lowStockRes.data ?? []) as AdminDashboard["lowStock"],
      recentOrders,
    };
  });
