import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { StockGate } from "@/components/stock/StockGate";
import { CadastroTable, type FieldConfig, type FormState } from "@/components/stock/CadastroTable";
import {
  listProductTypesAdmin,
  createProductType,
  updateProductType,
  deleteProductType,
  type ProductTypeRow,
} from "@/lib/registrations.functions";

export const Route = createFileRoute("/estoque/tipos-produto")({
  head: () => ({
    meta: [
      { title: "Tipos de produto — Flor de Amaranto" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <StockGate>
      <ProductTypesPage />
    </StockGate>
  ),
});

const FIELDS: FieldConfig[] = [
  { key: "name", label: "Nome", type: "text", required: true },
  { key: "slug", label: "Slug", type: "text", required: true },
  { key: "icon", label: "Ícone", type: "text", nullable: true, inTable: false },
  { key: "sortOrder", label: "Ordem", type: "number" },
  { key: "active", label: "Status", type: "boolean" },
];

function toInput(v: FormState) {
  return {
    name: String(v["name"] ?? ""),
    slug: String(v["slug"] ?? ""),
    icon: (v["icon"] as string | null) ?? null,
    sortOrder: Number(v["sortOrder"] ?? 0),
    active: Boolean(v["active"]),
  };
}

function ProductTypesPage() {
  const listFn = useServerFn(listProductTypesAdmin);
  const createFn = useServerFn(createProductType);
  const updateFn = useServerFn(updateProductType);
  const deleteFn = useServerFn(deleteProductType);

  const query = useQuery({
    queryKey: ["registrations-product-types"],
    queryFn: () => listFn(),
    retry: false,
  });

  return (
    <CadastroTable<ProductTypeRow & FormState>
      title="Tipo de produto"
      queryKey="registrations-product-types"
      fields={FIELDS}
      items={(query.data ?? []) as (ProductTypeRow & FormState)[]}
      isLoading={query.isLoading}
      onCreate={(v) => createFn({ data: toInput(v) })}
      onUpdate={(id, v) => updateFn({ data: { id, ...toInput(v) } })}
      onDelete={(id) => deleteFn({ data: { id } })}
    />
  );
}
