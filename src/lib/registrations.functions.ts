import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./stock.server";

// ---------- Brands ----------

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  country: string | null;
  origin: string | null;
  featured: boolean;
  active: boolean;
};

export const listBrandsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrandRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("brands")
      .select("id, name, slug, description, logo_url, country, origin, featured, active")
      .order("name");
    if (error) throw new Error("Falha ao carregar marcas.");
    return data ?? [];
  });

const brandSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable(),
  logoUrl: z.string().trim().max(600).nullable(),
  country: z.string().trim().max(60).nullable(),
  origin: z.string().trim().max(60).nullable(),
  featured: z.boolean(),
  active: z.boolean(),
});

export const createBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => brandSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("brands").insert({
      name: data.name,
      slug: data.slug,
      description: data.description,
      logo_url: data.logoUrl,
      country: data.country,
      origin: data.origin,
      featured: data.featured,
      active: data.active,
    });
    if (error)
      throw new Error(
        error.message.includes("duplicate")
          ? "Já existe uma marca com esse slug."
          : "Falha ao criar marca.",
      );
    return { ok: true };
  });

export const updateBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => brandSchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("brands")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description,
        logo_url: data.logoUrl,
        country: data.country,
        origin: data.origin,
        featured: data.featured,
        active: data.active,
      })
      .eq("id", data.id);
    if (error) throw new Error("Falha ao salvar marca.");
    return { ok: true };
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("brands").delete().eq("id", data.id);
    if (error) throw new Error("Falha ao excluir marca.");
    return { ok: true };
  });

// ---------- Product types ----------

export type ProductTypeRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
};

export const listProductTypesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductTypeRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("product_types")
      .select("id, name, slug, icon, sort_order, active")
      .order("sort_order")
      .order("name");
    if (error) throw new Error("Falha ao carregar tipos de produto.");
    return data ?? [];
  });

const productTypeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120),
  icon: z.string().trim().max(60).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
  active: z.boolean(),
});

export const createProductType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productTypeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("product_types").insert({
      name: data.name,
      slug: data.slug,
      icon: data.icon,
      sort_order: data.sortOrder,
      active: data.active,
    });
    if (error)
      throw new Error(
        error.message.includes("duplicate")
          ? "Já existe um tipo de produto com esse slug."
          : "Falha ao criar tipo de produto.",
      );
    return { ok: true };
  });

export const updateProductType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productTypeSchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("product_types")
      .update({
        name: data.name,
        slug: data.slug,
        icon: data.icon,
        sort_order: data.sortOrder,
        active: data.active,
      })
      .eq("id", data.id);
    if (error) throw new Error("Falha ao salvar tipo de produto.");
    return { ok: true };
  });

export const deleteProductType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("product_types").delete().eq("id", data.id);
    if (error) throw new Error("Falha ao excluir tipo de produto.");
    return { ok: true };
  });

// ---------- Categories ----------

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  product_type_slug: string | null;
  sort_order: number;
  active: boolean;
};

export const listCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CategoryRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("categories")
      .select("id, name, slug, description, image_url, product_type_slug, sort_order, active")
      .order("sort_order")
      .order("name");
    if (error) throw new Error("Falha ao carregar categorias.");
    return data ?? [];
  });

const categorySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable(),
  imageUrl: z.string().trim().max(600).nullable(),
  productTypeSlug: z.string().trim().max(120).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
  active: z.boolean(),
});

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => categorySchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("categories").insert({
      name: data.name,
      slug: data.slug,
      description: data.description,
      image_url: data.imageUrl,
      product_type_slug: data.productTypeSlug,
      sort_order: data.sortOrder,
      active: data.active,
    });
    if (error)
      throw new Error(
        error.message.includes("duplicate")
          ? "Já existe uma categoria com esse slug."
          : "Falha ao criar categoria.",
      );
    return { ok: true };
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => categorySchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("categories")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description,
        image_url: data.imageUrl,
        product_type_slug: data.productTypeSlug,
        sort_order: data.sortOrder,
        active: data.active,
      })
      .eq("id", data.id);
    if (error) throw new Error("Falha ao salvar categoria.");
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error("Falha ao excluir categoria.");
    return { ok: true };
  });

// ---------- Suppliers ----------

export type SupplierRow = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
};

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupplierRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("suppliers")
      .select("id, name, document, email, phone, country, city, website, notes, is_active")
      .order("name");
    if (error) throw new Error("Falha ao carregar fornecedores.");
    return data ?? [];
  });

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(200),
  document: z.string().trim().max(40).nullable(),
  email: z.string().trim().max(200).nullable(),
  phone: z.string().trim().max(40).nullable(),
  country: z.string().trim().max(60).nullable(),
  city: z.string().trim().max(100).nullable(),
  website: z.string().trim().max(300).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  isActive: z.boolean(),
});

export const createSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => supplierSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("suppliers").insert({
      name: data.name,
      document: data.document,
      email: data.email,
      phone: data.phone,
      country: data.country,
      city: data.city,
      website: data.website,
      notes: data.notes,
      is_active: data.isActive,
    });
    if (error) throw new Error("Falha ao criar fornecedor.");
    return { ok: true };
  });

export const updateSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => supplierSchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("suppliers")
      .update({
        name: data.name,
        document: data.document,
        email: data.email,
        phone: data.phone,
        country: data.country,
        city: data.city,
        website: data.website,
        notes: data.notes,
        is_active: data.isActive,
      })
      .eq("id", data.id);
    if (error) throw new Error("Falha ao salvar fornecedor.");
    return { ok: true };
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("suppliers").delete().eq("id", data.id);
    if (error) throw new Error("Falha ao excluir fornecedor.");
    return { ok: true };
  });
