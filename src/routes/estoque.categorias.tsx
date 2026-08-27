import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { StockGate } from "@/components/stock/StockGate";
import { CadastroTable, type FieldConfig, type FormState } from "@/components/stock/CadastroTable";
import {
  listCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryRow,
} from "@/lib/registrations.functions";

export const Route = createFileRoute("/estoque/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — Flor de Amaranto" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <StockGate>
      <CategoriesPage />
    </StockGate>
  ),
});

const FIELDS: FieldConfig[] = [
  { key: "name", label: "Nome", type: "text", required: true },
  { key: "slug", label: "Slug", type: "text", required: true },
  { key: "productTypeSlug", label: "Tipo de produto (slug)", type: "text", nullable: true },
  { key: "description", label: "Descrição", type: "textarea", nullable: true, inTable: false },
  { key: "imageUrl", label: "URL da imagem", type: "text", nullable: true, inTable: false },
  { key: "sortOrder", label: "Ordem", type: "number" },
  { key: "active", label: "Status", type: "boolean" },
];

function toInput(v: FormState) {
  return {
    name: String(v["name"] ?? ""),
    slug: String(v["slug"] ?? ""),
    description: (v["description"] as string | null) ?? null,
    imageUrl: (v["imageUrl"] as string | null) ?? null,
    productTypeSlug: (v["productTypeSlug"] as string | null) ?? null,
    sortOrder: Number(v["sortOrder"] ?? 0),
    active: Boolean(v["active"]),
  };
}

function CategoriesPage() {
  const listFn = useServerFn(listCategoriesAdmin);
  const createFn = useServerFn(createCategory);
  const updateFn = useServerFn(updateCategory);
  const deleteFn = useServerFn(deleteCategory);

  const query = useQuery({
    queryKey: ["registrations-categories"],
    queryFn: () => listFn(),
    retry: false,
  });

  return (
    <CadastroTable<CategoryRow & FormState>
      title="Categoria"
      queryKey="registrations-categories"
      fields={FIELDS}
      items={(query.data ?? []) as (CategoryRow & FormState)[]}
      isLoading={query.isLoading}
      onCreate={(v) => createFn({ data: toInput(v) })}
      onUpdate={(id, v) => updateFn({ data: { id, ...toInput(v) } })}
      onDelete={(id) => deleteFn({ data: { id } })}
    />
  );
}
