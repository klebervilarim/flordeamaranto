import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/ProductGrid";
import { fetchProducts } from "@/lib/catalog";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus favoritos | Flor de Amaranto" },
      { name: "description", content: "Os produtos que você salvou para comprar depois." },
      { property: "og:title", content: "Favoritos | Flor de Amaranto" },
      { property: "og:description", content: "Sua lista de desejos na Flor de Amaranto." },
      { property: "og:url", content: "/favoritos" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/favoritos" }],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { ids } = useFavorites();
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => fetchProducts({}),
  });
  const products = all.filter((p) => ids.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">Favoritos</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {ids.length === 0 ? "Você ainda não salvou nenhum produto." : `${products.length} produtos salvos.`}
      </p>
      <div className="mt-8">
        {ids.length === 0 ? (
          <Button asChild variant="gold" size="xl">
            <Link to="/perfumes">Descobrir produtos</Link>
          </Button>
        ) : (
          <ProductGrid products={products} loading={isLoading} />
        )}
      </div>
    </div>
  );
}