import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Minus, Plus, Star, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import placeholder from "@/assets/product-placeholder.jpg";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProductGrid } from "@/components/product/ProductGrid";
import { fetchProductBySlug, fetchProducts, GENDER_LABELS, ORIGIN_LABELS } from "@/lib/catalog";
import { brl, discountPercent, installments, stockLabel } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ params }) => {
    const product = await fetchProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Produto indisponível | Flor de Amaranto" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.product;
    const desc = p.short_description ?? `${p.name} disponível na Flor de Amaranto.`;
    return {
      meta: [
        { title: `${p.name} | Flor de Amaranto` },
        { name: "description", content: desc.slice(0, 155) },
        { property: "og:title", content: `${p.name} | Flor de Amaranto` },
        { property: "og:description", content: desc.slice(0, 155) },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `/produto/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/produto/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            sku: p.sku,
            brand: p.brands?.name,
            description: desc,
            offers: {
              "@type": "Offer",
              priceCurrency: "BRL",
              price: p.sale_price ?? p.price,
              availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          }),
        },
      ],
    };
  },
  component: ProductPage,
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
});

function Missing() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl">Produto não encontrado</h1>
      <Button asChild variant="ink" className="mt-6">
        <Link to="/perfumes">Ver catálogo</Link>
      </Button>
    </div>
  );
}

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const [qty, setQty] = useState(1);

  const price = product.sale_price ?? product.price;
  const off = discountPercent(product.price, product.sale_price);
  const parc = installments(price);
  const fav = isFavorite(product.id);

  const { data: related = [] } = useQuery({
    queryKey: ["related", product.id, product.product_type],
    queryFn: () => fetchProducts({ productTypes: [product.product_type], sort: "rating" }),
  });

  const specs: [string, string][] = [
    ["Marca", product.brands?.name ?? "—"],
    ["Tipo", product.product_type],
    ["Volume", product.volume ?? "—"],
    product.gender ? ["Gênero", GENDER_LABELS[product.gender] ?? product.gender] : null,
    product.origin ? ["Origem", ORIGIN_LABELS[product.origin] ?? product.origin] : null,
    product.longevity ? ["Fixação", product.longevity] : null,
    product.sillage ? ["Projeção", product.sillage] : null,
    product.finish ? ["Acabamento", product.finish] : null,
    product.coverage ? ["Cobertura", product.coverage] : null,
    ["SKU", product.sku],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
        <Link to="/" className="hover:text-gold">
          Início
        </Link>
        <span className="mx-2">/</span>
        <Link to="/perfumes" className="hover:text-gold">
          Catálogo
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <div className="relative bg-sand">
          {off > 0 && (
            <span className="absolute top-4 left-4 z-10 bg-ink px-3 py-1 text-[11px] tracking-[0.14em] text-ink-foreground uppercase">
              -{off}%
            </span>
          )}
          <img
            src={product.image_url || placeholder}
            alt={product.name}
            width={1000}
            height={1000}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div>
          {product.brands && (
            <Link
              to="/marcas/$slug"
              params={{ slug: product.brands.slug }}
              className="eyebrow text-gold"
            >
              {product.brands.name}
            </Link>
          )}
          <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{product.name}</h1>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="flex items-center gap-0.5 text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3.5 w-3.5"
                  fill={i < Math.round(product.rating) ? "currentColor" : "none"}
                />
              ))}
            </span>
            <span className="text-muted-foreground">
              {product.rating.toFixed(1)} ({product.rating_count})
            </span>
          </div>

          {product.short_description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.short_description}
            </p>
          )}

          <div className="mt-7 border-y border-border py-6">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl">{brl(price)}</span>
              {off > 0 && (
                <span className="text-sm text-muted-foreground line-through">{brl(product.price)}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              em até {parc.n}x de {brl(parc.value)} sem juros · {brl(price * 0.95)} no Pix
            </p>
            <p className="mt-3 text-xs tracking-[0.14em] uppercase">{stockLabel(product.stock)}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-border">
              <button
                aria-label="Diminuir quantidade"
                className="px-3 py-3 hover:text-gold"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button
                aria-label="Aumentar quantidade"
                className="px-3 py-3 hover:text-gold"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="gold"
              size="xl"
              className="flex-1"
              disabled={product.stock <= 0}
              onClick={() => add(product, qty)}
            >
              {product.stock > 0 ? "Adicionar à sacola" : "Esgotado"}
            </Button>
            <Button
              variant="outlineInk"
              size="xl"
              aria-label="Favoritar"
              onClick={() => toggle(product.id)}
            >
              <Heart className="h-5 w-5" fill={fav ? "currentColor" : "none"} />
            </Button>
          </div>

          <div className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gold" /> Frete grátis +R$399
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" /> Produto original
            </span>
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-gold" /> Troca em 7 dias
            </span>
          </div>

          <Accordion type="multiple" className="mt-8" defaultValue={["desc"]}>
            <AccordionItem value="desc">
              <AccordionTrigger>Descrição</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {product.description ?? product.short_description ?? "Sem descrição."}
              </AccordionContent>
            </AccordionItem>

            {(product.top_notes.length > 0 || product.olfactory_families.length > 0) && (
              <AccordionItem value="notes">
                <AccordionTrigger>Pirâmide olfativa</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  {product.olfactory_families.length > 0 && (
                    <NoteRow label="Famílias" values={product.olfactory_families} />
                  )}
                  <NoteRow label="Saída" values={product.top_notes} />
                  <NoteRow label="Corpo" values={product.heart_notes} />
                  <NoteRow label="Fundo" values={product.base_notes} />
                </AccordionContent>
              </AccordionItem>
            )}

            {(product.skin_types.length > 0 || product.ingredients.length > 0) && (
              <AccordionItem value="skin">
                <AccordionTrigger>Pele e ingredientes</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <NoteRow label="Tipos de pele" values={product.skin_types} />
                  <NoteRow label="Objetivos" values={product.goals} />
                  <NoteRow label="Ingredientes" values={product.ingredients} />
                  <NoteRow label="Benefícios" values={product.benefits} />
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="specs">
              <AccordionTrigger>Especificações</AccordionTrigger>
              <AccordionContent>
                <dl className="divide-y divide-border text-sm">
                  {specs.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionContent>
            </AccordionItem>

            {(product.usage_instructions || product.warnings) && (
              <AccordionItem value="use">
                <AccordionTrigger>Modo de uso e cuidados</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  {product.usage_instructions && <p>{product.usage_instructions}</p>}
                  {product.warnings && <p>{product.warnings}</p>}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </div>

      <section className="mt-20">
        <div className="rule-gold" />
        <h2 className="font-display mt-4 text-3xl">Você também pode gostar</h2>
        <div className="mt-8">
          <ProductGrid products={related.filter((p) => p.id !== product.id).slice(0, 4)} />
        </div>
      </section>
    </div>
  );
}

function NoteRow({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <p>
      <span className="text-foreground">{label}: </span>
      {values.join(", ")}
    </p>
  );
}