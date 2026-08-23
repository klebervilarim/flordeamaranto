import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { fetchCollections } from "@/lib/catalog";

export const Route = createFileRoute("/colecoes/")({
  head: () => ({
    meta: [
      { title: "Coleções curadas | Flor de Amaranto" },
      {
        name: "description",
        content: "Coleções temáticas: mais vendidos, novidades, oud intenso, gourmands e muito mais.",
      },
      { property: "og:title", content: "Coleções | Flor de Amaranto" },
      { property: "og:description", content: "Curadoria temática de perfumes e beleza." },
      { property: "og:url", content: "/colecoes" },
    ],
    links: [{ rel: "canonical", href: "/colecoes" }],
  }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { data: collections = [] } = useQuery({ queryKey: ["collections"], queryFn: fetchCollections });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">Coleções</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Seleções feitas à mão pela nossa curadoria para facilitar sua escolha.
      </p>

      <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Link
            key={c.id}
            to="/colecoes/$slug"
            params={{ slug: c.slug }}
            className="group flex flex-col justify-between bg-card p-7 transition-colors hover:bg-sand"
          >
            <div>
              <h2 className="font-display text-2xl">{c.name}</h2>
              {c.description && (
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
              )}
            </div>
            <span className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase group-hover:text-gold">
              Ver produtos <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}