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
      { name: "description", content: "Cadastro e gestão das marcas da Flor de Amaranto." },
      { property: "og:title", content: "Cadastro de marcas — Flor de Amaranto" },
      { property: "og:description", content: "Gestão das marcas cadastradas na Flor de Amaranto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
      pageTitle="Marcas"
      createLabel="Nova marca"
      queryKey="registrations-brands"
      fields={FIELDS}
      items={(query.data ?? []).map((brand) => ({ ...brand, logoUrl: brand.logo_url })) as (BrandRow & FormState)[]}
      isLoading={query.isLoading}
      error={query.error?.message}
      onCreate={(v) => createFn({ data: toBrandInput(v) })}
      onUpdate={(id, v) => updateFn({ data: { id, ...toBrandInput(v) } })}
      onDelete={(id) => deleteFn({ data: { id } })}
    />
  );
}
