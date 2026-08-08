import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

export const Route = createFileRoute("/skincare")({
  head: () => ({
    meta: [
      { title: "Skincare — Séruns, Hidratantes e Proteção | Oud Royale" },
      {
        name: "description",
        content:
          "Skincare por tipo de pele e objetivo: hidratação, anti-idade, controle de oleosidade, acne e proteção.",
      },
      { property: "og:title", content: "Skincare | Oud Royale" },
      { property: "og:description", content: "Rotina completa de cuidados para a pele." },
      { property: "og:url", content: "/skincare" },
    ],
    links: [{ rel: "canonical", href: "/skincare" }],
  }),
  component: () => (
    <CatalogPage
      title="Skincare"
      subtitle="Escolha por tipo de pele, objetivo e ingredientes principais."
      base={{ productTypes: ["skincare"] }}
      facets={["skinTypes", "goals", "brandSlugs"]}
    />
  ),
});