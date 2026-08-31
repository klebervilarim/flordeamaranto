import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, recordStockMovement } from "./stock.server";

export type SheetProductRow = {
  sku: string;
  name: string;
  price: number;
  stock: number;
};

export type SheetSupplierRow = {
  sku: string;
  name: string;
  supplier: string;
  quantity: number;
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

      const { data: suppliers } = await context.supabase
        .from("suppliers")
        .select("id, name")
        .order("name");
      const supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

      const { data: links } = await context.supabase
        .from("product_suppliers")
        .select("product_id, supplier_id, quantity");

      const productMap = new Map((products ?? []).map((p) => [p.id, p]));

      return {
        products: (products ?? []).map((p) => ({
          sku: p.sku,
          name: p.name,
          price: Number(p.price),
          stock: p.stock,
        })),
        suppliers: (links ?? [])
          .filter((l) => productMap.has(l.product_id))
          .map((l) => ({
            sku: productMap.get(l.product_id)!.sku,
            name: productMap.get(l.product_id)!.name,
            supplier: supplierMap.get(l.supplier_id) ?? "",
            quantity: l.quantity,
          })),
        supplierNames: (suppliers ?? []).map((s) => s.name),
      };
    },
  );

const importSchema = z.object({
  products: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        name: z.string().trim().max(200).optional(),
        price: z.number().nonnegative().optional(),
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

    // 2. Produtos
    for (const row of data.products) {
      const key = row.sku.trim().toUpperCase();
      const product = bySku.get(key);
      if (!product) {
        errors.push(`Produto não encontrado: ${row.sku}`);
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (row.name && row.name !== product.name) patch["name"] = row.name;
      if (row.price != null && row.price > 0 && Number(row.price) !== Number(product.price))
        patch["price"] = row.price;
      const nextStock = totals.has(key) ? totals.get(key)! : row.quantity;
      if (nextStock != null && nextStock !== product.stock) patch["stock"] = nextStock;
      if (Object.keys(patch).length === 0) continue;
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

    return { updated, supplierLinks, errors: errors.slice(0, 30), errorCount: errors.length };
  });
