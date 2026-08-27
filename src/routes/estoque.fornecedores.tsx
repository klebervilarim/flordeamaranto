import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { StockGate } from "@/components/stock/StockGate";
import { CadastroTable, type FieldConfig, type FormState } from "@/components/stock/CadastroTable";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type SupplierRow,
} from "@/lib/registrations.functions";

export const Route = createFileRoute("/estoque/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — Flor de Amaranto" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <StockGate>
      <SuppliersPage />
    </StockGate>
  ),
});

const FIELDS: FieldConfig[] = [
  { key: "name", label: "Nome", type: "text", required: true },
  { key: "document", label: "CNPJ/CPF", type: "text", nullable: true },
  { key: "email", label: "E-mail", type: "text", nullable: true },
  { key: "phone", label: "Telefone", type: "text", nullable: true },
  { key: "city", label: "Cidade", type: "text", nullable: true },
  { key: "country", label: "País", type: "text", nullable: true },
  { key: "website", label: "Site", type: "text", nullable: true, inTable: false },
  { key: "notes", label: "Observações", type: "textarea", nullable: true, inTable: false },
  { key: "isActive", label: "Status", type: "boolean" },
];

function toInput(v: FormState) {
  return {
    name: String(v["name"] ?? ""),
    document: (v["document"] as string | null) ?? null,
    email: (v["email"] as string | null) ?? null,
    phone: (v["phone"] as string | null) ?? null,
    country: (v["country"] as string | null) ?? null,
    city: (v["city"] as string | null) ?? null,
    website: (v["website"] as string | null) ?? null,
    notes: (v["notes"] as string | null) ?? null,
    isActive: Boolean(v["isActive"]),
  };
}

function SuppliersPage() {
  const listFn = useServerFn(listSuppliers);
  const createFn = useServerFn(createSupplier);
  const updateFn = useServerFn(updateSupplier);
  const deleteFn = useServerFn(deleteSupplier);

  const query = useQuery({
    queryKey: ["registrations-suppliers"],
    queryFn: () => listFn(),
    retry: false,
  });

  const items = (query.data ?? []).map((s) => ({ ...s, isActive: s.is_active })) as (SupplierRow &
    FormState)[];

  return (
    <CadastroTable<SupplierRow & FormState>
      title="Fornecedor"
      queryKey="registrations-suppliers"
      fields={FIELDS}
      items={items}
      isLoading={query.isLoading}
      onCreate={(v) => createFn({ data: toInput(v) })}
      onUpdate={(id, v) => updateFn({ data: { id, ...toInput(v) } })}
      onDelete={(id) => deleteFn({ data: { id } })}
    />
  );
}
