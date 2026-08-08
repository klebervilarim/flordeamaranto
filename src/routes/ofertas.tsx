import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

export const Route = createFileRoute("/ofertas")({
  head: () => ({
    meta: [
      { title: "Ofertas — Perfumes e Beleza com Desconto | Oud Royale" },
      {
        name: "description",
        content: "Descontos especiais em perfumes árabes, skincare, maquiagem e corpo & banho.",
      },
      { property: "og:title", content: "Ofertas | Oud Royale" },
      { property: "og:description", content: "Preços especiais por tempo limitado." },
      { property: "og:url", content: "/ofertas" },
    ],
    links: [{ rel: "canonical", href: "/ofertas" }],
  }),
  component: () => (
    <CatalogPage
      title="Ofertas"
      subtitle="Seleção com preços especiais por tempo limitado."
      base={{ onlyOffers: true }}
      facets={["genders", "origins", "families", "brandSlugs"]}
    />
  ),
});