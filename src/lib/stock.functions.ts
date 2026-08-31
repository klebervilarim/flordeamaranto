import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { adminCount, assertAdmin, callerIsAdmin, recordStockMovement } from "./stock.server";

/** Marca a segunda foto do produto (imagem da Fragrantica). */
const FRAGRANTICA_ALT = "fragrantica";

export const getStockStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await callerIsAdmin(context.supabase, context.userId);
    const admins = await adminCount();
    return { isAdmin, adminExists: admins > 0 };
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

export type StockItem = {
  id: string;
  sku: string;
  name: string;
  image_url: string | null;
  secondary_image_url: string | null;
  stock: number;
  min_stock: number;
  cost_price: number | null;
  suggested_price: number | null;
  price: number;
  sale_price: number | null;
  product_type: string;
  purchase_location: string;
  brands?: { name: string } | null;
};

export const listStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StockItem[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select(
        "id, sku, name, image_url, stock, min_stock, price, sale_price, product_type, purchase_location, brands(name)",
      )
      .neq("status", "archived")
      .order("name")
      .limit(1500);
    if (error) throw new Error("Falha ao carregar estoque.");
    const { data: costs } = await context.supabase
      .from("product_costs")
      .select("product_id, cost_price, suggested_price");
    const costMap = new Map((costs ?? []).map((c) => [c.product_id, c]));
    const { data: secondary } = await context.supabase
      .from("product_images")
      .select("product_id, url")
      .eq("alt", FRAGRANTICA_ALT);
    const secondaryMap = new Map((secondary ?? []).map((i) => [i.product_id, i.url]));
    return (data ?? []).map((p) => ({
      ...p,
      cost_price: costMap.get(p.id)?.cost_price ?? null,
      suggested_price: costMap.get(p.id)?.suggested_price ?? null,
      secondary_image_url: secondaryMap.get(p.id) ?? null,
    })) as unknown as StockItem[];
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
        purchaseLocation: z.string().min(2).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let previousStock: number | null = null;
    if (data.stock != null) {
      const { data: current } = await context.supabase
        .from("products")
        .select("stock")
        .eq("id", data.id)
        .maybeSingle();
      previousStock = current?.stock ?? null;
    }
    const patch: Database["public"]["Tables"]["products"]["Update"] = {};
    if (data.stock != null) patch["stock"] = data.stock;
    if (data.price != null) patch["price"] = data.price;
    if (data.purchaseLocation != null) patch["purchase_location"] = data.purchaseLocation;
    if (Object.keys(patch).length > 0) {
      const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
      if (error) throw new Error("Falha ao salvar alteração.");
    }
    if (data.stock != null && previousStock != null) {
      await recordStockMovement(context.supabase, {
        productId: data.id,
        previousQuantity: previousStock,
        newQuantity: data.stock,
        createdBy: context.userId,
      });
    }
    if (data.costPrice != null) {
      const { error } = await context.supabase.from("product_costs").upsert({
        product_id: data.id,
        cost_price: data.costPrice,
        suggested_price: Math.round(data.costPrice * 1.4 * 100) / 100,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error("Falha ao salvar alteração.");
    }
    return { ok: true };
  });

export type StockBrand = { id: string; name: string };

export const listStockBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StockBrand[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("brands")
      .select("id, name")
      .eq("active", true)
      .order("name");
    if (error) throw new Error("Falha ao carregar marcas.");
    return (data ?? []) as StockBrand[];
  });

export type StockProductDetail = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand_id: string | null;
  product_type: string;
  category_slug: string | null;
  gender: string | null;
  origin: string | null;
  volume: string | null;
  short_description: string | null;
  inspiration: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number | null;
  suggested_price: number | null;
  stock: number;
  purchase_location: string;
  image_url: string | null;
  secondary_image_url: string | null;
  status: string;
  featured: boolean;
  bestseller: boolean;
  is_new: boolean;
  brands?: { id: string; name: string } | null;
};

export const getStockProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<StockProductDetail> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("products")
      .select(
        "id, sku, name, slug, brand_id, product_type, category_slug, gender, origin, volume, inspiration, short_description, description, price, sale_price, stock, purchase_location, image_url, status, featured, bestseller, is_new, brands(id, name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Falha ao carregar produto.");
    if (!row) throw new Error("Produto não encontrado.");
    const { data: secondaryRow } = await context.supabase
      .from("product_images")
      .select("url")
      .eq("product_id", data.id)
      .eq("alt", FRAGRANTICA_ALT)
      .maybeSingle();
    const { data: costRow } = await context.supabase
      .from("product_costs")
      .select("cost_price, suggested_price")
      .eq("product_id", data.id)
      .maybeSingle();
    return {
      ...row,
      cost_price: costRow?.cost_price ?? null,
      suggested_price: costRow?.suggested_price ?? null,
      secondary_image_url: secondaryRow?.url ?? null,
    } as unknown as StockProductDetail;
  });

const productUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(1).max(60),
  brandId: z.string().uuid().nullable(),
  productType: z.string().trim().min(1).max(60),
  volume: z.string().trim().max(40).nullable(),
  gender: z.string().trim().max(30).nullable(),
  origin: z.string().trim().max(30).nullable(),
  categorySlug: z.string().trim().max(80).nullable(),
  price: z.number().positive(),
  salePrice: z.number().positive().nullable(),
  costPrice: z.number().positive().nullable(),
  stock: z.number().int().min(0),
  purchaseLocation: z.string().trim().min(2).max(60),
  inspiration: z.string().trim().max(200).nullable(),
  shortDescription: z.string().trim().max(600).nullable(),
  description: z.string().trim().max(8000).nullable(),
  imageUrl: z.string().trim().max(600).nullable(),
  secondaryImageUrl: z.string().trim().max(600).nullable(),
  status: z.enum(["active", "draft", "archived"]),
  featured: z.boolean(),
  bestseller: z.boolean(),
  isNew: z.boolean(),
});

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: current } = await context.supabase
      .from("products")
      .select("stock")
      .eq("id", data.id)
      .maybeSingle();
    const previousStock = current?.stock ?? null;
    const patch: Database["public"]["Tables"]["products"]["Update"] = {
      name: data.name,
      sku: data.sku,
      brand_id: data.brandId,
      product_type: data.productType || "perfume",
      volume: data.volume || null,
      gender: data.gender || null,
      origin: data.origin || null,
      category_slug: data.categorySlug || null,
      price: data.price,
      sale_price: data.salePrice,
      stock: data.stock,
      purchase_location: data.purchaseLocation,
      inspiration: data.inspiration || null,
      short_description: data.shortDescription || null,
      description: data.description || null,
      status: data.status,
      featured: data.featured,
      bestseller: data.bestseller,
      is_new: data.isNew,
    };
    if (data.imageUrl) patch["image_url"] = data.imageUrl;
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error("Falha ao salvar o produto.");
    if (previousStock != null) {
      await recordStockMovement(context.supabase, {
        productId: data.id,
        previousQuantity: previousStock,
        newQuantity: data.stock,
        createdBy: context.userId,
      });
    }
    const { data: existingSecondary } = await context.supabase
      .from("product_images")
      .select("id")
      .eq("product_id", data.id)
      .eq("alt", FRAGRANTICA_ALT)
      .maybeSingle();
    if (data.secondaryImageUrl) {
      if (existingSecondary) {
        await context.supabase
          .from("product_images")
          .update({ url: data.secondaryImageUrl })
          .eq("id", existingSecondary.id);
      } else {
        await context.supabase.from("product_images").insert({
          product_id: data.id,
          url: data.secondaryImageUrl,
          alt: FRAGRANTICA_ALT,
          sort_order: 1,
        });
      }
    } else if (existingSecondary) {
      await context.supabase.from("product_images").delete().eq("id", existingSecondary.id);
    }
    const costPatch: Database["public"]["Tables"]["product_costs"]["Insert"] = {
      product_id: data.id,
      cost_price: data.costPrice,
      updated_at: new Date().toISOString(),
    };
    if (data.costPrice != null) {
      costPatch["suggested_price"] = Math.round(data.costPrice * 1.4 * 100) / 100;
    }
    const { error: costError } = await context.supabase.from("product_costs").upsert(costPatch);
    if (costError) throw new Error("Falha ao salvar o custo do produto.");
    return { ok: true };
  });

const imageUploadSchema = z.object({
  productId: z.string().uuid(),
  fileName: z.string().min(1).max(120),
  contentType: z.string().min(3).max(80),
  dataBase64: z.string().min(10).max(9_000_000),
});

export const uploadProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => imageUploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.contentType.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
    const ext =
      (data.fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `${data.productId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(data.dataBase64, "base64");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(key, buffer, { contentType: data.contentType, upsert: true });
    if (error) throw new Error("Falha ao enviar a imagem.");
    return { ok: true, url: `/api/public/product-image/${key}` };
  });
