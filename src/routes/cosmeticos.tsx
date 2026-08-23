import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

export const Route = createFileRoute("/cosmeticos")({
  head: () => ({
    meta: [
      { title: "Cosméticos | Flor de Amaranto" },
      {
        name: "description",
        content: "Cosméticos e beleza: skincare, maquiagem e cuidados diários com curadoria premium.",
      },
      { property: "og:title", content: "Cosméticos | Flor de Amaranto" },
      { property: "og:description", content: "Beleza e autocuidado com curadoria premium." },
      { property: "og:url", content: "/cosmeticos" },
    ],
    links: [{ rel: "canonical", href: "/cosmeticos" }],
  }),
  component: () => (
    <CatalogPage
      title="Cosméticos"
      subtitle="Skincare, maquiagem e cuidados diários reunidos em um só lugar."
      base={{ productTypes: ["cosmetico", "skincare", "maquiagem"] }}
      facets={["skinTypes", "goals", "finishes", "brandSlugs"]}
    />
  ),
});