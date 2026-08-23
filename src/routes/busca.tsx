import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/ProductGrid";
import { fetchProducts } from "@/lib/catalog";

type SearchParams = { q?: string };

export const Route = createFileRoute("/busca")({
  validateSearch: (search: Record<string, unknown>): SearchParams =>
    typeof search['q'] === "string" && search['q'] ? { q: search['q'] } : {},
  head: () => ({
    meta: [
      { title: "Buscar produtos | Flor de Amaranto" },
      { name: "description", content: "Busque perfumes, skincare, maquiagem e mais no catálogo." },
      { property: "og:title", content: "Busca | Flor de Amaranto" },
      { property: "og:description", content: "Encontre rapidamente o que procura." },
      { property: "og:url", content: "/busca" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/busca" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => (q ? fetchProducts({ search: q }) : Promise.resolve([])),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">Busca</h1>

      <form
        className="mt-6 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ to: "/busca", search: term.trim() ? { q: term.trim() } : {} });
        }}
      >
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Perfume árabe, sérum de vitamina C..."
          aria-label="Buscar produtos"
        />
        <Button type="submit" variant="ink">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        {q ? `${products.length} resultados para "${q}"` : "Digite um termo para buscar."}
      </p>

      <div className="mt-8">
        <ProductGrid products={products} loading={Boolean(q) && isLoading} />
      </div>
    </div>
  );
}