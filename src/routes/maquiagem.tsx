import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

export const Route = createFileRoute("/maquiagem")({
  head: () => ({
    meta: [
      { title: "Maquiagem — Base, Batom e Mais | Flor de Amaranto" },
      {
        name: "description",
        content: "Maquiagem com filtros por cor, tom, acabamento, cobertura e tipo de pele.",
      },
      { property: "og:title", content: "Maquiagem | Flor de Amaranto" },
      { property: "og:description", content: "Cor, acabamento e cobertura para todos os tons." },
      { property: "og:url", content: "/maquiagem" },
    ],
    links: [{ rel: "canonical", href: "/maquiagem" }],
  }),
  component: () => (
    <CatalogPage
      title="Maquiagem"
      subtitle="Filtre por acabamento, tipo de pele e marca."
      base={{ productTypes: ["maquiagem"] }}
      facets={["finishes", "skinTypes", "brandSlugs"]}
    />
  ),
});