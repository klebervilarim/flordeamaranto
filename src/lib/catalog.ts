import { supabase } from "@/integrations/supabase/client";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country: string | null;
  origin: string | null;
  featured: boolean;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  sort_order: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand_id: string | null;
  product_type: string;
  category_slug: string | null;
  subcategory_slug: string | null;
  gender: string | null;
  origin: string | null;
  short_description: string | null;
  inspiration: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  volume: string | null;
  image_url: string | null;
  featured: boolean;
  bestseller: boolean;
  is_new: boolean;
  exclusive: boolean;
  rating: number;
  rating_count: number;
  olfactory_families: string[];
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  longevity: string | null;
  sillage: string | null;
  intensity: string | null;
  occasions: string[];
  seasons: string[];
  day_night: string | null;
  skin_types: string[];
  goals: string[];
  ingredients: string[];
  benefits: string[];
  usage_instructions: string | null;
  warnings: string | null;
  color: string | null;
  shade: string | null;
  finish: string | null;
  coverage: string | null;
  brands?: { name: string; slug: string } | null;
};

const SELECT = "*, brands(name, slug)";

export type CatalogFilters = {
  productTypes?: string[] | undefined;
  decantVolumes?: string[] | undefined;
  genders?: string[] | undefined;
  origins?: string[] | undefined;
  brandSlugs?: string[] | undefined;
  families?: string[] | undefined;
  categorySlugs?: string[] | undefined;
  skinTypes?: string[] | undefined;
  goals?: string[] | undefined;
  finishes?: string[] | undefined;
  longevity?: string[] | undefined;
  sillage?: string[] | undefined;
  maxPrice?: number | undefined;
  minPrice?: number | undefined;
  onlyOffers?: boolean | undefined;
  inStock?: boolean | undefined;
  minRating?: number | undefined;
  withPhotos?: boolean | undefined;
  search?: string | undefined;
  collectionSlug?: string | undefined;
  sort?: string | undefined;
};

export async function fetchProducts(filters: CatalogFilters = {}): Promise<Product[]> {
  let productIds: string[] | null = null;

  if (filters.collectionSlug) {
    const { data: coll } = await supabase
      .from("collections")
      .select("id")
      .eq("slug", filters.collectionSlug)
      .maybeSingle();
    if (!coll) return [];
    const { data: links } = await supabase
      .from("product_collections")
      .select("product_id")
      .eq("collection_id", coll.id);
    productIds = (links ?? []).map((l) => l.product_id);
    if (productIds.length === 0) return [];
  }

  let query = supabase.from("products").select(SELECT).eq("status", "active").gt("price", 0);

  if (filters.withPhotos) {
    query = query.not("image_url", "is", null).neq("image_url", "");
  }

  if (productIds) query = query.in("id", productIds);
  if (filters.productTypes?.length) query = query.in("product_type", filters.productTypes);
  if (filters.decantVolumes?.length) {
    const volumes = filters.decantVolumes.flatMap((v) => [v, v.replace("ml", " ml"), v.toUpperCase()]);
    query = query.eq("product_type", "decant").in("volume", volumes);
  }
  if (filters.genders?.length) query = query.in("gender", filters.genders);
  if (filters.origins?.length) query = query.in("origin", filters.origins);
  if (filters.categorySlugs?.length) query = query.in("category_slug", filters.categorySlugs);
  if (filters.finishes?.length) query = query.in("finish", filters.finishes);
  if (filters.longevity?.length) query = query.in("longevity", filters.longevity);
  if (filters.sillage?.length) query = query.in("sillage", filters.sillage);
  if (filters.families?.length) query = query.overlaps("olfactory_families", filters.families);
  if (filters.skinTypes?.length) query = query.overlaps("skin_types", filters.skinTypes);
  if (filters.goals?.length) query = query.overlaps("goals", filters.goals);
  if (filters.inStock) query = query.gt("stock", 0);
  if (filters.onlyOffers) query = query.not("sale_price", "is", null);
  if (filters.minRating) query = query.gte("rating", filters.minRating);
  if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
  if (filters.search) {
    const term = filters.search.replace(/[%,()]/g, " ").trim();
    query = query.or(
      [
        `name.ilike.%${term}%`,
        `sku.ilike.%${term}%`,
        `short_description.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `category_slug.ilike.%${term}%`,
        `product_type.ilike.%${term}%`,
        `origin.ilike.%${term}%`,
        `gender.ilike.%${term}%`,
      ].join(","),
    );
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    case "new":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("bestseller", { ascending: false }).order("rating", { ascending: false });
  }

  const { data, error } = await query.limit(200);
  if (error) throw error;
  let rows = (data ?? []) as unknown as Product[];

  if (filters.brandSlugs?.length) {
    rows = rows.filter((p) => p.brands && filters.brandSlugs!.includes(p.brands.slug));
  }

  // Um único card por perfume: decants 5ml/10ml do mesmo nome viram um só,
  // sempre com o menor preço (o de 5ml). Com filtro de volume, mantém o volume escolhido.
  if (!filters.decantVolumes?.length) {
    const groups = new Map<string, Product[]>();
    const rest: Product[] = [];
    for (const p of rows) {
      if (p.product_type !== "decant") {
        rest.push(p);
        continue;
      }
      const key = decantBaseName(p.name) || p.id;
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    const cards = [...groups.values()].map((group) => {
      // Card preferindo foto; o preço exibido é sempre o menor do grupo (o de 5ml).
      const withPhoto = group.filter((p) => p.image_url != null && p.image_url !== "");
      const rep = (withPhoto.length ? withPhoto : group).reduce((a, b) =>
        (a.sale_price ?? a.price) <= (b.sale_price ?? b.price) ? a : b,
      );
      const minPrice = Math.min(...group.map((p) => p.sale_price ?? p.price));
      return { ...rep, price: minPrice, sale_price: null };
    });
    rows = [...rest, ...cards];
  }
  return rows;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  const product = (data as unknown as Product) ?? null;
  if (product && product.price <= 0) return null;
  return product;
}

export type ProductImage = { id: string; url: string; alt: string | null; sort_order: number };

export async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("id,url,alt,sort_order")
    .eq("product_id", productId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ProductImage[];
}



export type DecantOption = {
  slug: string;
  volume: string;
  price: number;
  sale_price: number | null;
  stock: number;
};

/** Nome base do decant sem o prefixo "Decant" e sem o volume, para agrupar 5ml/10ml do mesmo perfume. */
export function decantBaseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/decant/g, " ")
    .replace(/[-–—]?\s*\d+(?:[.,]\d+)?\s*ml\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchDecantOptions(name: string): Promise<DecantOption[]> {
  const base = decantBaseName(name);
  if (!base) return [];
  const { data, error } = await supabase
    .from("products")
    .select("slug, volume, price, sale_price, stock, name")
    .eq("product_type", "decant")
    .eq("status", "active")
    .gt("price", 0)
    .limit(1000);
  if (error) throw error;
  return (data ?? [])
    .filter((d) => decantBaseName(d.name) === base)
    .map((d) => ({
      slug: d.slug,
      volume: d.volume ?? "",
      price: d.price,
      sale_price: d.sale_price,
      stock: d.stock,
    }));
}

export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Brand[];
}

export type BrandCount = { slug: string; name: string; count: number };

export async function fetchBrandCounts(): Promise<BrandCount[]> {
  const { data, error } = await supabase
    .from("products")
    .select("brands(slug, name)")
    .eq("status", "active")
    .gt("price", 0)
    .not("brand_id", "is", null)
    .limit(1000);
  if (error) throw error;
  const map = new Map<string, BrandCount>();
  for (const row of data ?? []) {
    const b = (row as { brands?: { slug: string; name: string } | null }).brands;
    if (!b) continue;
    const entry = map.get(b.slug) ?? { slug: b.slug, name: b.name, count: 0 };
    entry.count += 1;
    map.set(b.slug, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function fetchCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  decant: "Decant",
  perfume: "Perfume",
  miniatura: "Miniatura",
  "body-splash": "Body Splash",
  sabonete: "Sabonete",
  creme: "Creme Corporal",
  cosmetico: "Cosmético",
  skincare: "Skincare",
  maquiagem: "Maquiagem",
  "corpo-e-banho": "Corpo & Banho",
  cabelo: "Cabelo",
  kit: "Kit",
  acessorio: "Acessório",
};

export const ORIGIN_LABELS: Record<string, string> = {
  arabe: "Árabe",
  nicho: "Nicho",
  importado: "Importado",
  nacional: "Nacional",
  designer: "Designer",
  artesanal: "Artesanal",
};

export const GENDER_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  unissex: "Unissex",
  infantil: "Infantil",
};