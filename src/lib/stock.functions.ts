import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { adminCount, assertAdmin, callerIsAdmin } from "./stock.server";

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
  stock: number;
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
        "id, sku, name, image_url, stock, cost_price, suggested_price, price, sale_price, product_type, purchase_location, brands(name)",
      )
      .neq("status", "archived")
      .order("name")
      .limit(1500);
    if (error) throw new Error("Falha ao carregar estoque.");
    return (data ?? []) as unknown as StockItem[];
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
    const patch: Database["public"]["Tables"]["products"]["Update"] = {};
    if (data.stock != null) patch["stock"] = data.stock;
    if (data.price != null) patch["price"] = data.price;
    if (data.purchaseLocation != null) patch["purchase_location"] = data.purchaseLocation;
    if (data.costPrice != null) {
      patch["cost_price"] = data.costPrice;
      patch["suggested_price"] = Math.round(data.costPrice * 1.4 * 100) / 100;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error("Falha ao salvar alteração.");
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
  description: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number | null;
  suggested_price: number | null;
  stock: number;
  purchase_location: string;
  image_url: string | null;
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
        "id, sku, name, slug, brand_id, product_type, category_slug, gender, origin, volume, short_description, description, price, sale_price, cost_price, suggested_price, stock, purchase_location, image_url, status, featured, bestseller, is_new, brands(id, name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Falha ao carregar produto.");
    if (!row) throw new Error("Produto não encontrado.");
    return row as unknown as StockProductDetail;
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
  shortDescription: z.string().trim().max(600).nullable(),
  description: z.string().trim().max(8000).nullable(),
  imageUrl: z.string().trim().max(600).nullable(),
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
      cost_price: data.costPrice,
      stock: data.stock,
      purchase_location: data.purchaseLocation,
      short_description: data.shortDescription || null,
      description: data.description || null,
      status: data.status,
      featured: data.featured,
      bestseller: data.bestseller,
      is_new: data.isNew,
    };
    if (data.costPrice != null) {
      patch["suggested_price"] = Math.round(data.costPrice * 1.4 * 100) / 100;
    }
    if (data.imageUrl) patch["image_url"] = data.imageUrl;
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error("Falha ao salvar o produto.");
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
    const ext = (data.fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `${data.productId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(data.dataBase64, "base64");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(key, buffer, { contentType: data.contentType, upsert: true });
    if (error) throw new Error("Falha ao enviar a imagem.");
    return { ok: true, url: `/api/public/product-image/${key}` };
  });
