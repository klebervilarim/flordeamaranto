import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";

const label = (slug: string) =>
  slug.replace(/-/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export const Route = createFileRoute("/colecoes/$slug")({
  head: ({ params }) => {
    const name = label(params.slug);
    return {
      meta: [
        { title: `${name} | Coleções Flor de Amaranto` },
        { name: "description", content: `Produtos selecionados da coleção ${name} na Flor de Amaranto.` },
        { property: "og:title", content: `${name} | Flor de Amaranto` },
        { property: "og:description", content: `Curadoria da coleção ${name}.` },
        { property: "og:url", content: `/colecoes/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/colecoes/${params.slug}` }],
    };
  },
  component: CollectionDetail,
});

function CollectionDetail() {
  const { slug } = Route.useParams();
  return (
    <CatalogPage
      title={label(slug)}
      subtitle="Coleção curada pela Flor de Amaranto."
      base={{ collectionSlug: slug }}
      facets={["genders", "origins", "families", "brandSlugs"]}
    />
  );
}