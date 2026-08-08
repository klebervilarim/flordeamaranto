import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

export const Route = createFileRoute("/corpo-e-banho")({
  head: () => ({
    meta: [
      { title: "Corpo & Banho — Hidratantes, Óleos e Body Splash | Oud Royale" },
      {
        name: "description",
        content: "Hidratantes, óleos corporais, sabonetes e body splash para um ritual de autocuidado.",
      },
      { property: "og:title", content: "Corpo & Banho | Oud Royale" },
      { property: "og:description", content: "Ritual de autocuidado perfumado." },
      { property: "og:url", content: "/corpo-e-banho" },
    ],
    links: [{ rel: "canonical", href: "/corpo-e-banho" }],
  }),
  component: () => (
    <CatalogPage
      title="Corpo & Banho"
      subtitle="Hidratantes, óleos, sabonetes e body splash perfumados."
      base={{ productTypes: ["corpo-e-banho", "cabelo"] }}
      facets={["families", "brandSlugs"]}
    />
  ),
});