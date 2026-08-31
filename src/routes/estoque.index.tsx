import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, LayoutDashboard, Loader2, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { PRODUCT_TYPE_LABELS } from "@/lib/catalog";
import { StockGate } from "@/components/stock/StockGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import placeholder from "@/assets/product-placeholder.jpg";
import { listStock, updateStockItem, type StockItem } from "@/lib/stock.functions";

export const Route = createFileRoute("/estoque/")({
  head: () => ({
    meta: [
      { title: "Estoque — Flor de Amaranto" },
      { name: "description", content: "Painel de estoque restrito da Flor de Amaranto." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  return (
    <StockGate>
      <StockPanel />
    </StockGate>
  );
}

function StockPanel() {
  const listFn = useServerFn(listStock);
  const saveFn = useServerFn(updateStockItem);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [edits, setEdits] = useState<
    Record<string, { stock?: number; price?: number; costPrice?: number }>
  >({});

  const stockQuery = useQuery({
    queryKey: ["stock-list"],
    queryFn: () => listFn(),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (input: {
      id: string;
      stock?: number;
      price?: number;
      costPrice?: number;
      purchaseLocation?: string;
    }) => saveFn({ data: input }),
    onSuccess: (_r, v) => {
      toast.success("Alteração salva.");
      setEdits((e) => {
        const next = { ...e };
        delete next[v.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["stock-list"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const items = stockQuery.data ?? [];

  const typeOptions = useMemo(() => {
    const types = [...new Set(items.map((p) => p.product_type))].sort();
    return types.map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t] ?? t }));
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((p) => {
      if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
    });
  }, [items, search, typeFilter]);

  const totals = useMemo(() => {
    let units = 0;
    let cost = 0;
    let revenue = 0;
    for (const p of items) {
      units += p.stock;
      cost += (p.cost_price ?? 0) * p.stock;
      revenue += (p.sale_price ?? p.price) * p.stock;
    }
    return { units, cost, revenue, skus: items.length };
  }, [items]);

  const setEdit = (id: string, field: "stock" | "price" | "costPrice", value: string) => {
    if (!value.trim()) return;
    const num = Number(value.replace(",", "."));
    if (Number.isNaN(num)) return;
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: num } }));
  };

  const rowValue = (p: StockItem, field: "stock" | "price" | "costPrice") => {
    const edited = edits[p.id]?.[field];
    if (edited != null) return String(edited).replace(".", ",");
    if (field === "stock") return String(p.stock);
    if (field === "price") return String(p.price).replace(".", ",");
    return p.cost_price != null ? String(p.cost_price).replace(".", ",") : "";
  };

  const isDirty = (id: string) => edits[id] != null && Object.keys(edits[id]!).length > 0;

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = items.map((p) => {
      const price = p.sale_price ?? p.price;
      return {
        SKU: p.sku,
        Produto: p.name,
        Marca: p.brands?.name ?? "",
        "Estoque atual": p.stock,
        "Estoque mínimo": p.min_stock,
        Status: stockStatus(p).label,
        "Preço de venda": price,
        "Valor total em estoque": Math.round(price * p.stock * 100) / 100,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 16 },
      { wch: 36 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `estoque-flor-de-amaranto-${date}.xlsx`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Área do administrador</p>
          <h1 className="mt-2 font-display text-4xl">Estoque</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outlineInk"
            size="pill"
            onClick={exportExcel}
            disabled={items.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          <Button asChild variant="outlineInk" size="pill">
            <Link to="/estoque/planilha">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Planilha
            </Link>
          </Button>
          <Button asChild variant="outlineInk" size="pill">
            <Link to="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-gold" />
            Acesso restrito ao administrador
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Produtos" value={String(totals.skus)} />
        <Stat label="Unidades" value={String(totals.units)} />
        <Stat label="Custo total" value={brl(totals.cost)} />
        <Stat label="Venda potencial" value={brl(totals.revenue)} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou SKU…"
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tipo de produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {typeOptions.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {stockQuery.isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stockQuery.isError ? (
        <p className="py-20 text-center text-sm text-destructive">{stockQuery.error.message}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
                <th className="py-3 pr-3">Produto</th>
                <th className="py-3 pr-3">Local de compra</th>
                <th className="py-3 pr-3">Estoque</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Custo</th>
                <th className="py-3 pr-3">Sugerido (+40%)</th>
                <th className="py-3 pr-3">Preço de venda</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image_url ?? placeholder}
                        alt={p.name}
                        width={44}
                        height={44}
                        loading="lazy"
                        className="h-11 w-11 object-cover"
                      />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku}
                          {p.brands?.name ? ` · ${p.brands.name}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <Select
                      value={p.purchase_location}
                      onValueChange={(v) => saveMutation.mutate({ id: p.id, purchaseLocation: v })}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Brasil">Brasil</SelectItem>
                        <SelectItem value="Paraguai">Paraguai</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 pr-3">
                    <Input
                      value={rowValue(p, "stock")}
                      inputMode="numeric"
                      className="h-8 w-20"
                      onChange={(e) => setEdit(p.id, "stock", e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={stockStatus(p)} />
                  </td>
                  <td className="py-3 pr-3">
                    <Input
                      value={rowValue(p, "costPrice")}
                      inputMode="decimal"
                      placeholder="—"
                      className="h-8 w-24"
                      onChange={(e) => setEdit(p.id, "costPrice", e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {(() => {
                      const cost = edits[p.id]?.costPrice ?? p.cost_price;
                      return cost != null ? brl(Math.round(cost * 1.4 * 100) / 100) : "—";
                    })()}
                  </td>
                  <td className="py-3 pr-3">
                    <Input
                      value={rowValue(p, "price")}
                      inputMode="decimal"
                      className="h-8 w-24"
                      onChange={(e) => setEdit(p.id, "price", e.target.value)}
                    />
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isDirty(p.id) && (
                        <Button
                          variant="gold"
                          size="sm"
                          disabled={saveMutation.isPending}
                          onClick={() => saveMutation.mutate({ id: p.id, ...edits[p.id] })}
                        >
                          Salvar
                        </Button>
                      )}
                      <Button asChild variant="outlineInk" size="sm">
                        <Link
                          to="/estoque/produto/$id"
                          params={{ id: p.id }}
                          aria-label={`Editar ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type StockStatus = { label: "Esgotado" | "Baixo" | "Normal"; color: string };

function stockStatus(p: StockItem): StockStatus {
  if (p.stock <= 0) return { label: "Esgotado", color: "bg-destructive" };
  if (p.stock <= p.min_stock) return { label: "Baixo", color: "bg-amber-500" };
  return { label: "Normal", color: "bg-emerald-500" };
}

function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${status.color}`} />
      {status.label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card px-4 py-3">
      <p className="text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}
