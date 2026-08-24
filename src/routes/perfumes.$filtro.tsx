import { createFileRoute, notFound } from "@tanstack/react-router";
import { CatalogPage } from "@/components/product/CatalogPage";
import type { CatalogFilters } from "@/lib/catalog";

type Preset = { title: string; subtitle: string; base: CatalogFilters };

const PRESETS: Record<string, Preset> = {
  arabes: {
    title: "Perfumes Árabes",
    subtitle: "Oud, âmbar, resinas e especiarias: a assinatura do Oriente Médio.",
    base: { productTypes: ["perfume", "miniatura"], origins: ["arabe"] },
  },
  miniaturas: {
    title: "Miniaturas",
    subtitle: "Perfumes em miniatura de 25ml — perfeitos para conhecer novas fragrâncias.",
    base: { productTypes: ["miniatura"] },
  },
  nicho: {
    title: "Perfumes de Nicho",
    subtitle: "Criações autorais, produção limitada e matérias-primas raras.",
    base: { productTypes: ["perfume"], origins: ["nicho"] },
  },
  importados: {
    title: "Perfumes Importados",
    subtitle: "Seleção internacional de grandes casas.",
    base: { productTypes: ["perfume"], origins: ["importado"] },
  },
  nacionais: {
    title: "Perfumes Nacionais",
    subtitle: "O melhor da perfumaria brasileira.",
    base: { productTypes: ["perfume"], origins: ["nacional"] },
  },
  masculinos: {
    title: "Perfumes Masculinos",
    subtitle: "Amadeirados, aromáticos e couros marcantes.",
    base: { productTypes: ["perfume"], genders: ["masculino"] },
  },
  femininos: {
    title: "Perfumes Femininos",
    subtitle: "Florais, gourmands e orientais.",
    base: { productTypes: ["perfume"], genders: ["feminino"] },
  },
  unissex: {
    title: "Perfumes Unissex",
    subtitle: "Fragrâncias sem gênero, para todos.",
    base: { productTypes: ["perfume"], genders: ["unissex"] },
  },
  doces: {
    title: "Perfumes Doces",
    subtitle: "Baunilha, caramelo e frutas maduras: a família gourmand.",
    base: { productTypes: ["perfume"], families: ["Gourmand"] },
  },
  amadeirados: {
    title: "Perfumes Amadeirados",
    subtitle: "Sândalo, cedro e vetiver: estrutura e elegância.",
    base: { productTypes: ["perfume"], families: ["Amadeirado"] },
  },
  especiados: {
    title: "Perfumes Especiados",
    subtitle: "Canela, cardamomo e pimenta: calor e presença.",
    base: { productTypes: ["perfume"], families: ["Especiado"] },
  },
  citricos: {
    title: "Perfumes Cítricos",
    subtitle: "Bergamota, limão e neroli: frescura luminosa.",
    base: { productTypes: ["perfume"], families: ["Cítrico"] },
  },
  florais: {
    title: "Perfumes Florais",
    subtitle: "Jasmim, rosa e peônia: o coração da perfumaria.",
    base: { productTypes: ["perfume"], families: ["Floral"] },
  },
  frutados: {
    title: "Perfumes Frutados",
    subtitle: "Frutas vermelhas, pêssego e figo: doçura vibrante.",
    base: { productTypes: ["perfume"], families: ["Frutado"] },
  },
  aromaticos: {
    title: "Perfumes Aromáticos",
    subtitle: "Lavanda, hortelã e alecrim: frescor verde e herbal.",
    base: { productTypes: ["perfume"], families: ["Aromático"] },
  },
};

export const Route = createFileRoute("/perfumes/$filtro")({
  loader: ({ params }) => {
    const preset = PRESETS[params.filtro];
    if (!preset) throw notFound();
    return { preset };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Indisponível | Flor de Amaranto" }, { name: "robots", content: "noindex" }] };
    }
    const { title, subtitle } = loaderData.preset;
    return {
      meta: [
        { title: `${title} | Flor de Amaranto` },
        { name: "description", content: subtitle },
        { property: "og:title", content: `${title} | Flor de Amaranto` },
        { property: "og:description", content: subtitle },
        { property: "og:url", content: `/perfumes/${params.filtro}` },
      ],
      links: [{ rel: "canonical", href: `/perfumes/${params.filtro}` }],
    };
  },
  component: FilteredPerfumes,
  errorComponent: () => <Fallback />,
  notFoundComponent: () => <Fallback />,
});

function FilteredPerfumes() {
  const { preset } = Route.useLoaderData();
  return (
    <CatalogPage
      title={preset.title}
      subtitle={preset.subtitle}
      base={preset.base}
      facets={["genders", "origins", "families", "brandSlugs", "longevity", "sillage"]}
    />
  );
}

function Fallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Coleção não encontrada</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tente navegar pelo catálogo completo de perfumes.
      </p>
    </div>
  );
}