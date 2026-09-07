import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brl } from "./format";
import type { UserSupabase } from "./stock.server";
import { assertAdmin } from "./stock.server";

export type CouponRow = {
  id: string;
  code: string;
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
};

const CODE_PREFIX = "FLORDEAMARANTO";
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSuffix(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

async function generateUniqueCode(supabase: UserSupabase): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `${CODE_PREFIX}${randomSuffix(6)}`;
    const { data } = await supabase.from("coupons").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Não foi possível gerar um código único. Tente novamente.");
}

export const generateCouponCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ code: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const code = await generateUniqueCode(context.supabase);
    return { code };
  });

export const listCouponsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CouponRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("coupons")
      .select("id, code, value, starts_at, ends_at, active, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error("Falha ao carregar cupons.");
    return data ?? [];
  });

const couponSchema = z.object({
  discountPercent: z.number().int().min(1).max(100),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim().min(1),
  active: z.boolean(),
});

function assertValidRange(startsAt: string, endsAt: string) {
  if (endsAt < startsAt) {
    throw new Error("A data final não pode ser anterior à data inicial.");
  }
}

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => couponSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; code: string }> => {
    await assertAdmin(context.supabase, context.userId);
    assertValidRange(data.startsAt, data.endsAt);

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await generateUniqueCode(context.supabase);
      const { error } = await context.supabase.from("coupons").insert({
        code,
        type: "percent",
        value: data.discountPercent,
        starts_at: new Date(`${data.startsAt}T00:00:00`).toISOString(),
        ends_at: new Date(`${data.endsAt}T23:59:59`).toISOString(),
        active: data.active,
      });
      if (!error) return { ok: true, code };
      if (!error.message.includes("duplicate")) throw new Error("Falha ao criar cupom.");
    }
    throw new Error("Não foi possível gerar um código único. Tente novamente.");
  });

export const updateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => couponSchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    assertValidRange(data.startsAt, data.endsAt);
    const { error } = await context.supabase
      .from("coupons")
      .update({
        value: data.discountPercent,
        starts_at: new Date(`${data.startsAt}T00:00:00`).toISOString(),
        ends_at: new Date(`${data.endsAt}T23:59:59`).toISOString(),
        active: data.active,
      })
      .eq("id", data.id);
    if (error) throw new Error("Falha ao salvar cupom.");
    return { ok: true };
  });

export const setCouponActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("coupons")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error("Falha ao atualizar status do cupom.");
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error("Falha ao excluir cupom.");
    return { ok: true };
  });

// ---------- Aplicação pelo cliente (sacola/checkout) ----------

export type CouponApplyResult =
  | { ok: true; code: string; type: string; value: number; minOrder: number; discount: number }
  | { ok: false; error: string };

/** Verifica e calcula o desconto de um cupom para o subtotal informado. Não exige login. */
export const validateCoupon = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ code: z.string().trim().min(1).max(40), subtotal: z.number().min(0) }).parse(input),
  )
  .handler(async ({ data }): Promise<CouponApplyResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("code, type, value, min_order, starts_at, ends_at, max_uses, used_count, active")
      .eq("code", code)
      .maybeSingle();
    if (!coupon || !coupon.active) {
      return { ok: false, error: "Cupom inválido ou expirado." };
    }
    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return { ok: false, error: "Este cupom ainda não está disponível." };
    }
    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      return { ok: false, error: "Cupom inválido ou expirado." };
    }
    if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
      return { ok: false, error: "Este cupom atingiu o limite de usos." };
    }
    if (data.subtotal < coupon.min_order) {
      return {
        ok: false,
        error: `Pedido mínimo de ${brl(coupon.min_order)} para usar este cupom.`,
      };
    }

    const discount =
      coupon.type === "percent"
        ? Math.round(data.subtotal * (coupon.value / 100) * 100) / 100
        : Math.min(coupon.value, data.subtotal);

    return {
      ok: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.min_order,
      discount,
    };
  });

/** Incrementa o contador de usos de um cupom. Chamado quando o pagamento é confirmado. */
export async function incrementCouponUsage(code: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("id, used_count")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (!coupon) return;
  await supabaseAdmin
    .from("coupons")
    .update({ used_count: coupon.used_count + 1 })
    .eq("id", coupon.id);
}
