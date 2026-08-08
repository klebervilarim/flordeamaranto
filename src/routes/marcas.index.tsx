import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchBrands, ORIGIN_LABELS } from "@/lib/catalog";

export const Route = createFileRoute("/marcas/")({
  head: () => ({
    meta: [
      { title: "Marcas — Lattafa, Afnan e mais | Oud Royale" },
      {
        name: "description",
        content: "Conheça as casas de perfumaria e beleza disponíveis na Oud Royale.",
      },
      { property: "og:title", content: "Marcas | Oud Royale" },
      { property: "og:description", content: "As casas que compõem nossa curadoria." },
      { property: "og:url", content: "/marcas" },
    ],
    links: [{ rel: "canonical", href: "/marcas" }],
  }),
  component: BrandsPage,
});

function BrandsPage() {
  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: fetchBrands });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">Marcas</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Casas árabes, de nicho e nacionais selecionadas pela nossa curadoria.
      </p>

      <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <Link
            key={b.id}
            to="/marcas/$slug"
            params={{ slug: b.slug }}
            className="bg-card p-7 transition-colors hover:bg-sand"
          >
            <h2 className="font-display text-2xl">{b.name}</h2>
            <p className="eyebrow mt-1 text-gold">
              {[b.origin ? (ORIGIN_LABELS[b.origin] ?? b.origin) : null, b.country]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {b.description && (
              <p className="mt-3 text-sm text-muted-foreground">{b.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}