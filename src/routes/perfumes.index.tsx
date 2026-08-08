import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

export const Route = createFileRoute("/perfumes/")({
  head: () => ({
    meta: [
      { title: "Perfumes — Árabes, Nicho, Importados | Oud Royale" },
      {
        name: "description",
        content:
          "Catálogo completo de perfumes com filtros por gênero, origem, marca, família olfativa, fixação e projeção.",
      },
      { property: "og:title", content: "Perfumes | Oud Royale" },
      { property: "og:description", content: "Perfumes árabes, de nicho, importados e nacionais." },
      { property: "og:url", content: "/perfumes" },
    ],
    links: [{ rel: "canonical", href: "/perfumes" }],
  }),
  component: () => (
    <CatalogPage
      title="Perfumes"
      subtitle="Árabes, de nicho, importados e nacionais — masculinos, femininos e unissex."
      base={{ productTypes: ["perfume"] }}
      facets={["genders", "origins", "families", "brandSlugs", "longevity", "sillage"]}
    />
  ),
});