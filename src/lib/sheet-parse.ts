// Leitura das planilhas de estoque pelo NOME das colunas (com sinônimos),
// para aceitar tanto a planilha padrão quanto a exportação da tela de Estoque.

export type ProductField = "sku" | "name" | "price" | "cost" | "quantity";
export type SupplierField = "sku" | "name" | "supplier" | "quantity" | "cost";

function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PRODUCT_ALIASES: Record<ProductField, string[]> = {
  sku: ["codigo", "sku", "cod", "referencia"],
  name: ["descricao", "produto", "nome", "nome do produto"],
  price: ["valor", "preco de venda", "preco", "valor de venda", "venda"],
  cost: ["custo", "preco de custo", "valor de custo", "custo unitario"],
  quantity: ["quantidade", "estoque atual", "estoque", "qtd", "qtde"],
};

const SUPPLIER_ALIASES: Record<SupplierField, string[]> = {
  sku: PRODUCT_ALIASES.sku,
  name: PRODUCT_ALIASES.name,
  supplier: ["fornecedor", "nome do fornecedor"],
  quantity: PRODUCT_ALIASES.quantity,
  cost: PRODUCT_ALIASES.cost,
};

function mapHeaders<F extends string>(
  header: unknown[],
  aliases: Record<F, string[]>,
): Partial<Record<F, number>> {
  const result: Partial<Record<F, number>> = {};
  header.forEach((cell, index) => {
    const h = norm(cell);
    for (const field of Object.keys(aliases) as F[]) {
      if (result[field] == null && aliases[field].includes(h)) result[field] = index;
    }
  });
  return result;
}

export function parseNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  let s = String(value).replace(/[^0-9,.-]/g, "");
  if (!s) return undefined;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const parsed = Number(s);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export type ParsedProduct = {
  sku: string;
  name?: string | undefined;
  price?: number | undefined;
  cost?: number | undefined;
  quantity?: number | undefined;
};

export type ParsedSupplier = { sku: string; supplier: string; quantity: number };

/** rows = planilha como matriz (linha 0 = cabeçalho). */
export function parseProductRows(rows: unknown[][]): ParsedProduct[] {
  const [header = [], ...body] = rows;
  let cols = mapHeaders(header, PRODUCT_ALIASES);
  if (cols.sku == null) {
    // Planilha antiga sem cabeçalho reconhecível: Código, Descrição, Valor, Quantidade
    cols = { sku: 0, name: 1, price: 2, quantity: 3 };
  }
  const get = (row: unknown[], f: ProductField) => {
    const i = cols[f];
    return i == null ? undefined : row[i];
  };
  return body
    .map((row) => {
      const qty = parseNumber(get(row, "quantity"));
      return {
        sku: String(get(row, "sku") ?? "").trim(),
        name: String(get(row, "name") ?? "").trim() || undefined,
        price: parseNumber(get(row, "price")),
        cost: parseNumber(get(row, "cost")),
        quantity: qty != null ? Math.max(0, Math.round(qty)) : undefined,
      };
    })
    .filter((p) => p.sku);
}

export function parseSupplierRows(rows: unknown[][]): ParsedSupplier[] {
  const [header = [], ...body] = rows;
  let cols = mapHeaders(header, SUPPLIER_ALIASES);
  if (cols.sku == null || cols.supplier == null) {
    cols = { sku: 0, name: 1, supplier: 2, quantity: 3 };
  }
  return body
    .map((row) => ({
      sku: String(row[cols.sku!] ?? "").trim(),
      supplier: String(row[cols.supplier!] ?? "").trim(),
      quantity: Math.max(0, Math.round(parseNumber(row[cols.quantity ?? -1]) ?? 0)),
    }))
    .filter((s) => s.sku && s.supplier);
}
