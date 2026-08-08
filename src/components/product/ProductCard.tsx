import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import placeholder from "@/assets/product-placeholder.jpg";
import { cn } from "@/lib/utils";
import { brl, discountPercent, installments } from "@/lib/format";
import { ORIGIN_LABELS, PRODUCT_TYPE_LABELS, type Product } from "@/lib/catalog";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const off = discountPercent(product.price, product.sale_price);
  const current = product.sale_price ?? product.price;
  const { n, value } = installments(current);
  const fav = isFavorite(product.id);

  const badge = product.exclusive
    ? "Exclusivo"
    : off > 0
      ? `${off}% OFF`
      : product.is_new
        ? "Novo"
        : product.bestseller
          ? "Mais vendido"
          : product.stock > 0 && product.stock <= 5
            ? "Últimas unidades"
            : null;

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-secondary">
        <Link to="/produto/$slug" params={{ slug: product.slug }} className="block">
          <img
            src={product.image_url ?? placeholder}
            alt={product.name}
            loading="lazy"
            width={900}
            height={900}
            className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </Link>

        {badge && (
          <span className="absolute top-2 left-2 bg-ink px-2 py-1 text-[0.6rem] tracking-[0.16em] text-gold uppercase">
            {badge}
          </span>
        )}

        <button
          type="button"
          aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={() => toggle(product.id)}
          className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-card/85 backdrop-blur"
        >
          <Heart className={cn("h-4 w-4", fav && "fill-destructive text-destructive")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <p className="eyebrow text-muted-foreground">{product.brands?.name}</p>
        <Link to="/produto/$slug" params={{ slug: product.slug }} className="mt-1">
          <h3 className="font-display text-base leading-snug sm:text-lg">{product.name}</h3>
        </Link>

        <p className="mt-1 text-[0.68rem] tracking-[0.1em] text-muted-foreground uppercase">
          {PRODUCT_TYPE_LABELS[product.product_type] ?? product.product_type}
          {product.origin ? ` · ${ORIGIN_LABELS[product.origin] ?? product.origin}` : ""}
          {product.volume ? ` · ${product.volume}` : ""}
        </p>

        {product.rating > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" />
            {product.rating.toFixed(1)}
            <span className="opacity-60">({product.rating_count})</span>
          </p>
        )}

        <div className="mt-2">
          {off > 0 && (
            <span className="mr-2 text-xs text-muted-foreground line-through">
              {brl(product.price)}
            </span>
          )}
          <span className="text-base font-medium">{brl(current)}</span>
          <p className="text-xs text-muted-foreground">
            {n}x de {brl(value)} sem juros
          </p>
        </div>

        <Button
          variant="outlineInk"
          size="pill"
          className="mt-3 w-full"
          disabled={product.stock <= 0}
          onClick={() => add(product)}
        >
          {product.stock <= 0 ? "Esgotado" : "Adicionar"}
        </Button>
      </div>
    </article>
  );
}