import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { assertAdmin, recordStockMovement } from "./stock.server";

export type SheetProductRow = {
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  stock: number;
};

export type SheetSupplierRow = {
  sku: string;
  name: string;
  supplier: string;
  quantity: number;
  cost: number | null;
};

export const exportStockSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      products: SheetProductRow[];
      suppliers: SheetSupplierRow[];
      supplierNames: string[];
    }> => {
      await assertAdmin(context.supabase, context.userId);
      const { data: products, error } = await context.supabase
        .from("products")
        .select("id, sku, name, price, stock")
        .neq("status", "archived")
        .order("name")
        .limit(2000);
      if (error) throw new Error("Falha ao exportar produtos.");

      const { data: costs } = await context.supabase
        .from("product_costs")
        .select("product_id, cost_price");
      const costMap = new Map((costs ?? []).map((c) => [c.product_id, c.cost_price]));

      const { data: suppliers } = await context.supabase
        .from("suppliers")
        .select("id, name")
        .order("name");
      const supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

      const { data: links } = await context.supabase
        .from("product_suppliers")
        .select("product_id, supplier_id, quantity, cost_price");

      const productMap = new Map((products ?? []).map((p) => [p.id, p]));

      return {
        products: (products ?? []).map((p) => ({
          sku: p.sku,
          name: p.name,
          price: Number(p.price),
          cost: costMap.get(p.id) ?? null,
          stock: p.stock,
        })),
        suppliers: (links ?? [])
          .filter((l) => productMap.has(l.product_id))
          .map((l) => ({
            sku: productMap.get(l.product_id)!.sku,
            name: productMap.get(l.product_id)!.name,
            supplier: supplierMap.get(l.supplier_id) ?? "",
            quantity: l.quantity,
            cost: l.cost_price ?? costMap.get(l.product_id) ?? null,
          })),
        supplierNames: (suppliers ?? []).map((s) => s.name),
      };
    },
  );

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "produto";
}

const importSchema = z.object({
  products: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        name: z.string().trim().max(200).optional(),
        brand: z.string().trim().max(120).optional(),
        price: z.number().nonnegative().optional(),
        cost: z.number().nonnegative().optional(),
        quantity: z.number().int().min(0).optional(),
      }),
    )
    .max(3000),
  suppliers: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        supplier: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(0),
      }),
    )
    .max(6000),
});

export const importStockSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;

    const { data: allProducts, error } = await supabase
      .from("products")
      .select("id, sku, name, price, stock")
      .limit(3000);
    if (error) throw new Error("Falha ao carregar produtos.");
    const bySku = new Map((allProducts ?? []).map((p) => [p.sku.trim().toUpperCase(), p]));

    const { data: supplierRows } = await supabase.from("suppliers").select("id, name");
    const supplierByName = new Map(
      (supplierRows ?? []).map((s) => [s.name.trim().toLowerCase(), s.id]),
    );

    const { data: brandRows } = await supabase.from("brands").select("id, name");
    const brandByName = new Map(
      (brandRows ?? []).map((b) => [b.name.trim().toLowerCase(), b.id]),
    );
    const resolveBrandId = async (brandName: string): Promise<string | null> => {
      const key = brandName.trim().toLowerCase();
      const existing = brandByName.get(key);
      if (existing) return existing;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: created, error: brandError } = await supabaseAdmin
        .from("brands")
        .insert({ name: brandName.trim(), slug: slugify(brandName) })
        .select("id")
        .maybeSingle();
      if (brandError || !created) return null;
      brandByName.set(key, created.id);
      return created.id;
    };

    const errors: string[] = [];
    let updated = 0;
    let supplierLinks = 0;

    // 1. Quantidades por fornecedor
    const totals = new Map<string, number>();
    for (const row of data.suppliers) {
      const key = row.sku.trim().toUpperCase();
      const product = bySku.get(key);
      if (!product) {
        errors.push(`Produto não encontrado (fornecedor): ${row.sku}`);
        continue;
      }
      let supplierId = supplierByName.get(row.supplier.trim().toLowerCase());
      if (!supplierId) {
        const { data: created, error: createError } = await supabase
          .from("suppliers")
          .insert({ name: row.supplier.trim() })
          .select("id")
          .maybeSingle();
        if (createError || !created) {
          errors.push(`Falha ao criar fornecedor: ${row.supplier}`);
          continue;
        }
        supplierId = created.id;
        supplierByName.set(row.supplier.trim().toLowerCase(), supplierId);
      }
      const { error: upsertError } = await supabase.from("product_suppliers").upsert(
        {
          product_id: product.id,
          supplier_id: supplierId,
          quantity: row.quantity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,supplier_id" },
      );
      if (upsertError) {
        errors.push(`Falha ao salvar fornecedor ${row.supplier} (${row.sku}).`);
        continue;
      }
      supplierLinks += 1;
      totals.set(key, (totals.get(key) ?? 0) + row.quantity);
    }

    // 2. Produtos: atualiza os existentes (pelo SKU) e cadastra os novos
    let created = 0;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const row of data.products) {
      const key = row.sku.trim().toUpperCase();
      const product = bySku.get(key);
      if (!product) {
        if (!row.name) {
          errors.push(`Produto novo sem descrição: ${row.sku}`);
          continue;
        }
        if (row.price == null || row.price <= 0) {
          errors.push(`Produto novo sem valor de venda: ${row.sku}`);
          continue;
        }
        const stock = totals.has(key) ? totals.get(key)! : (row.quantity ?? 0);
        const slug = `${slugify(row.name)}-${key.toLowerCase()}`.slice(0, 180);
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("products")
          .insert({
            sku: row.sku.trim(),
            name: row.name,
            slug,
            product_type: "perfume",
            price: row.price,
            stock,
            purchase_location: "Brasil",
            status: "active",
          })
          .select("id")
          .maybeSingle();
        if (insertError || !inserted) {
          errors.push(`Falha ao cadastrar ${row.sku}.`);
          continue;
        }
        bySku.set(key, {
          id: inserted.id,
          sku: row.sku.trim(),
          name: row.name,
          price: row.price,
          stock,
        });
        created += 1;
        if (stock > 0) {
          await recordStockMovement(supabase, {
            productId: inserted.id,
            previousQuantity: 0,
            newQuantity: stock,
            createdBy: context.userId,
            note: "Cadastro por importação de planilha",
          });
        }
        if (row.cost != null) {
          await supabaseAdmin.from("product_costs").upsert(
            { product_id: inserted.id, cost_price: row.cost, updated_at: new Date().toISOString() },
            { onConflict: "product_id" },
          );
        }
        continue;
      }
      const patch: Database["public"]["Tables"]["products"]["Update"] = {};
      if (row.name && row.name !== product.name) patch["name"] = row.name;
      if (row.price != null && row.price > 0 && Number(row.price) !== Number(product.price))
        patch["price"] = row.price;
      const nextStock = totals.has(key) ? totals.get(key)! : row.quantity;
      if (nextStock != null && nextStock !== product.stock) patch["stock"] = nextStock;
      if (Object.keys(patch).length > 0) {
        const { error: updateError } = await supabase
          .from("products")
          .update(patch)
          .eq("id", product.id);
        if (updateError) {
          errors.push(`Falha ao atualizar ${row.sku}.`);
          continue;
        }
        updated += 1;
        if (patch["stock"] != null) {
          await recordStockMovement(supabase, {
            productId: product.id,
            previousQuantity: product.stock,
            newQuantity: nextStock!,
            createdBy: context.userId,
            note: "Importação de planilha",
          });
        }
      }
      if (row.cost != null) {
        await supabaseAdmin.from("product_costs").upsert(
          { product_id: product.id, cost_price: row.cost, updated_at: new Date().toISOString() },
          { onConflict: "product_id" },
        );
      }
    }

    // 3. Produtos que só apareceram na aba de fornecedores
    for (const [key, total] of totals) {
      if (data.products.some((p) => p.sku.trim().toUpperCase() === key)) continue;
      const product = bySku.get(key);
      if (!product || product.stock === total) continue;
      await supabase.from("products").update({ stock: total }).eq("id", product.id);
      await recordStockMovement(supabase, {
        productId: product.id,
        previousQuantity: product.stock,
        newQuantity: total,
        createdBy: context.userId,
        note: "Importação de planilha (fornecedores)",
      });
      updated += 1;
    }

    return { updated, created, supplierLinks, errors: errors.slice(0, 30), errorCount: errors.length };
  });
