import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { StockGate } from "@/components/stock/StockGate";
import { CadastroTable, type FieldConfig, type FormState } from "@/components/stock/CadastroTable";
import {
  listBrandsAdmin,
  createBrand,
  updateBrand,
  deleteBrand,
  type BrandRow,
} from "@/lib/registrations.functions";

export const Route = createFileRoute("/estoque/marcas")({
  head: () => ({
    meta: [
      { title: "Marcas — Flor de Amaranto" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <StockGate>
      <BrandsPage />
    </StockGate>
  ),
});

const FIELDS: FieldConfig[] = [
  { key: "name", label: "Nome", type: "text", required: true },
  { key: "slug", label: "Slug", type: "text", required: true },
  { key: "description", label: "Descrição", type: "textarea", nullable: true, inTable: false },
  { key: "logoUrl", label: "URL do logo", type: "text", nullable: true, inTable: false },
  { key: "country", label: "País", type: "text", nullable: true },
  { key: "origin", label: "Origem", type: "text", nullable: true, inTable: false },
  { key: "featured", label: "Destaque", type: "boolean" },
  { key: "active", label: "Status", type: "boolean" },
];

function toBrandInput(v: FormState) {
  return {
    name: String(v["name"] ?? ""),
    slug: String(v["slug"] ?? ""),
    description: (v["description"] as string | null) ?? null,
    logoUrl: (v["logoUrl"] as string | null) ?? null,
    country: (v["country"] as string | null) ?? null,
    origin: (v["origin"] as string | null) ?? null,
    featured: Boolean(v["featured"]),
    active: Boolean(v["active"]),
  };
}

function BrandsPage() {
  const listFn = useServerFn(listBrandsAdmin);
  const createFn = useServerFn(createBrand);
  const updateFn = useServerFn(updateBrand);
  const deleteFn = useServerFn(deleteBrand);

  const query = useQuery({
    queryKey: ["registrations-brands"],
    queryFn: () => listFn(),
    retry: false,
  });

  return (
    <CadastroTable<BrandRow & FormState>
      title="Marca"
      queryKey="registrations-brands"
      fields={FIELDS}
      items={(query.data ?? []) as (BrandRow & FormState)[]}
      isLoading={query.isLoading}
      onCreate={(v) => createFn({ data: toBrandInput(v) })}
      onUpdate={(id, v) => updateFn({ data: { id, ...toBrandInput(v) } })}
      onDelete={(id) => deleteFn({ data: { id } })}
    />
  );
}
