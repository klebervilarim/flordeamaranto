import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

const label = (slug: string) =>
  slug.replace(/-/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export const Route = createFileRoute("/marcas/$slug")({
  head: ({ params }) => {
    const name = label(params.slug);
    return {
      meta: [
        { title: `${name} | Marcas Oud Royale` },
        { name: "description", content: `Todos os produtos da marca ${name} disponíveis na Oud Royale.` },
        { property: "og:title", content: `${name} | Oud Royale` },
        { property: "og:description", content: `Catálogo completo da marca ${name}.` },
        { property: "og:url", content: `/marcas/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/marcas/${params.slug}` }],
    };
  },
  component: BrandDetail,
});

function BrandDetail() {
  const { slug } = Route.useParams();
  return (
    <CatalogPage
      title={label(slug)}
      subtitle="Todos os produtos desta marca."
      base={{ brandSlugs: [slug] }}
      facets={["genders", "origins", "families", "skinTypes"]}
    />
  );
}