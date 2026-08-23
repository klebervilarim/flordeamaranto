import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  adminCount,
  assertStockAccess,
  callerIsAdmin,
  getClientIp,
  readAllowedIps,
  writeAllowedIps,
} from "./stock.server";

export const getStockStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await callerIsAdmin(context.supabase, context.userId);
    const admins = await adminCount();
    if (!isAdmin) {
      return { isAdmin, adminExists: admins > 0, ip: null as string | null, ipAllowed: false, allowedIps: [] as string[] };
    }
    const ip = getClientIp();
    const allowedIps = await readAllowedIps();
    return { isAdmin, adminExists: true, ip, ipAllowed: allowedIps.includes(ip), allowedIps };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admins = await adminCount();
    if (admins > 0) throw new Error("Já existe um administrador cadastrado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Não foi possível ativar o administrador.");
    return { ok: true };
  });

export const addAllowedIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ip: z.string().min(3).max(64).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!(await callerIsAdmin(context.supabase, context.userId))) {
      throw new Error("Acesso restrito a administradores.");
    }
    const current = getClientIp();
    const ips = await readAllowedIps();
    if (ips.length > 0 && !ips.includes(current)) {
      throw new Error(`IP não autorizado: ${current}`);
    }
    const ip = data.ip?.trim() || current;
    if (!ips.includes(ip)) ips.push(ip);
    await writeAllowedIps(ips);
    return { ok: true, ip, allowedIps: ips };
  });

export const removeAllowedIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ip: z.string().min(3).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!(await callerIsAdmin(context.supabase, context.userId))) {
      throw new Error("Acesso restrito a administradores.");
    }
    const current = getClientIp();
    const ips = await readAllowedIps();
    if (!ips.includes(current)) throw new Error(`IP não autorizado: ${current}`);
    const next = ips.filter((x) => x !== data.ip);
    if (next.length === 0) throw new Error("A lista precisa manter ao menos um IP autorizado.");
    await writeAllowedIps(next);
    return { ok: true, allowedIps: next };
  });

export type StockItem = {
  id: string;
  sku: string;
  name: string;
  image_url: string | null;
  stock: number;
  cost_price: number | null;
  suggested_price: number | null;
  price: number;
  sale_price: number | null;
};

export const listStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StockItem[]> => {
    await assertStockAccess(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select("id, sku, name, image_url, stock, cost_price, suggested_price, price, sale_price")
      .neq("status", "archived")
      .order("name")
      .limit(1500);
    if (error) throw new Error("Falha ao carregar estoque.");
    return (data ?? []) as StockItem[];
  });

export const updateStockItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        stock: z.number().int().min(0).optional(),
        price: z.number().positive().optional(),
        costPrice: z.number().positive().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStockAccess(context.supabase, context.userId);
    const patch: Record<string, number> = {};
    if (data.stock != null) patch.stock = data.stock;
    if (data.price != null) patch.price = data.price;
    if (data.costPrice != null) {
      patch.cost_price = data.costPrice;
      patch.suggested_price = Math.round(data.costPrice * 1.4 * 100) / 100;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error("Falha ao salvar alteração.");
    return { ok: true };
  });
