import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { StockGate } from "@/components/stock/StockGate";
import { Button } from "@/components/ui/button";
import { exportStockSheet, importStockSheet } from "@/lib/sheet.functions";

export const Route = createFileRoute("/estoque/planilha")({
  head: () => ({
    meta: [
      { title: "Planilha de estoque — Flor de Amaranto" },
      {
        name: "description",
        content: "Exporte e importe a planilha padrão de produtos e fornecedores.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <StockGate>
      <SheetPanel />
    </StockGate>
  ),
});

const PRODUCT_HEADERS = ["Código", "Descrição", "Valor", "Quantidade"];
const SUPPLIER_HEADERS = ["Código", "Descrição", "Fornecedor", "Quantidade"];

function num(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(String(value).replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function SheetPanel() {
  const exportFn = useServerFn(exportStockSheet);
  const importFn = useServerFn(importStockSheet);
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    updated: number;
    supplierLinks: number;
    errors: string[];
    errorCount: number;
  } | null>(null);

  const dataQuery = useQuery({
    queryKey: ["stock-sheet"],
    queryFn: () => exportFn(),
    retry: false,
  });

  const download = () => {
    const data = dataQuery.data;
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const products = XLSX.utils.aoa_to_sheet([
      PRODUCT_HEADERS,
      ...data.products.map((p) => [p.sku, p.name, p.price, p.stock]),
    ]);
    products["!cols"] = [{ wch: 18 }, { wch: 56 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, products, "Produtos");

    const suppliers = XLSX.utils.aoa_to_sheet([
      SUPPLIER_HEADERS,
      ...data.suppliers.map((s) => [s.sku, s.name, s.supplier, s.quantity]),
    ]);
    suppliers["!cols"] = [{ wch: 18 }, { wch: 56 }, { wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, suppliers, "Produto por Fornecedor");

    XLSX.writeFile(wb, `estoque-flor-de-amaranto-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const productSheet = wb.Sheets["Produtos"] ?? wb.Sheets[wb.SheetNames[0]!];
      const supplierSheet =
        wb.Sheets["Produto por Fornecedor"] ??
        (wb.SheetNames[1] ? wb.Sheets[wb.SheetNames[1]] : undefined);
      if (!productSheet) throw new Error("A planilha não tem a aba de produtos.");

      const rawProducts = XLSX.utils.sheet_to_json<Record<string, unknown>>(productSheet, {
        header: PRODUCT_HEADERS,
        range: 1,
        defval: "",
      });
      const products = rawProducts
        .filter((r) => String(r["Código"] ?? "").trim())
        .map((r) => ({
          sku: String(r["Código"]).trim(),
          name: String(r["Descrição"] ?? "").trim() || undefined,
          price: num(r["Valor"]),
          quantity: num(r["Quantidade"]) != null ? Math.round(num(r["Quantidade"])!) : undefined,
        }));

      const rawSuppliers = supplierSheet
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(supplierSheet, {
            header: SUPPLIER_HEADERS,
            range: 1,
            defval: "",
          })
        : [];
      const suppliers = rawSuppliers
        .filter(
          (r) => String(r["Código"] ?? "").trim() && String(r["Fornecedor"] ?? "").trim(),
        )
        .map((r) => ({
          sku: String(r["Código"]).trim(),
          supplier: String(r["Fornecedor"]).trim(),
          quantity: Math.round(num(r["Quantidade"]) ?? 0),
        }));

      if (products.length === 0 && suppliers.length === 0)
        throw new Error("Nenhuma linha válida encontrada na planilha.");
      return importFn({ data: { products, suppliers } });
    },
    onSuccess: (res) => {
      setResult(res);
      toast.success(`${res.updated} produto(s) atualizado(s).`);
      dataQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="eyebrow text-gold">Estoque</p>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl">Exportar / Importar planilha</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        A planilha padrão tem duas abas: <strong>Produtos</strong> (Código, Descrição, Valor,
        Quantidade) e <strong>Produto por Fornecedor</strong> (Código, Descrição, Fornecedor,
        Quantidade). Quando um produto aparece na aba de fornecedores, a quantidade final é a soma
        das quantidades de todos os fornecedores.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="border border-border p-6">
          <h2 className="font-display text-xl">Exportar</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {dataQuery.data
              ? `${dataQuery.data.products.length} produtos e ${dataQuery.data.suppliers.length} vínculos com fornecedor.`
              : "Carregando dados do estoque…"}
          </p>
          <Button
            variant="gold"
            size="pill"
            className="mt-4"
            disabled={!dataQuery.data}
            onClick={download}
          >
            <Download className="mr-2 h-4 w-4" /> Baixar planilha
          </Button>
        </div>

        <div className="border border-border p-6">
          <h2 className="font-display text-xl">Importar</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Envie a planilha alterada (.xlsx). Os produtos são localizados pelo código (SKU).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) importMutation.mutate(file);
            }}
          />
          <Button
            variant="outlineInk"
            size="pill"
            className="mt-4"
            disabled={importMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Enviar planilha
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-8 border border-border p-6">
          <h2 className="font-display text-xl">Resultado da importação</h2>
          <p className="mt-2 text-sm">
            {result.updated} produto(s) atualizado(s) · {result.supplierLinks} vínculo(s) de
            fornecedor.
          </p>
          {result.errorCount > 0 && (
            <div className="mt-3">
              <p className="text-sm text-destructive">{result.errorCount} aviso(s):</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {result.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <Button variant="ghost" size="pill" asChild>
          <Link to="/estoque">Voltar ao estoque</Link>
        </Button>
      </div>
    </div>
  );
}
