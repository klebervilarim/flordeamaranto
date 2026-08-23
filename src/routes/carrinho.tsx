import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import placeholder from "@/assets/product-placeholder.jpg";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { brl, installments } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Sacola de compras | Flor de Amaranto" },
      { name: "description", content: "Revise os itens da sua sacola e finalize sua compra." },
      { property: "og:title", content: "Sacola | Flor de Amaranto" },
      { property: "og:description", content: "Revise seus itens e finalize a compra." },
      { property: "og:url", content: "/carrinho" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/carrinho" }],
  }),
  component: CartPage,
});

const FREE_SHIPPING = 399;

function CartPage() {
  const { lines, subtotal, setQuantity, remove } = useCart();
  const shipping = subtotal >= FREE_SHIPPING || subtotal === 0 ? 0 : 29.9;
  const total = subtotal + shipping;
  const parc = installments(total);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Sua sacola está vazia</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Explore nossa curadoria de perfumes e beleza.
        </p>
        <Button asChild variant="gold" size="xl" className="mt-8">
          <Link to="/perfumes">Começar a comprar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">Sacola</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="divide-y divide-border border-y border-border">
          {lines.map((line) => (
            <li key={line.id} className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 py-5 sm:gap-6">
              <Link to="/produto/$slug" params={{ slug: line.slug }} className="bg-sand">
                <img
                  src={line.image || placeholder}
                  alt={line.name}
                  width={160}
                  height={160}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </Link>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                      {line.brand}
                    </p>
                    <Link
                      to="/produto/$slug"
                      params={{ slug: line.slug }}
                      className="font-display block truncate text-lg hover:text-gold"
                    >
                      {line.name}
                    </Link>
                    {line.volume && (
                      <p className="text-xs text-muted-foreground">{line.volume}</p>
                    )}
                  </div>
                  <button
                    aria-label="Remover item"
                    onClick={() => remove(line.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center border border-border">
                    <button
                      aria-label="Diminuir"
                      className="px-2.5 py-2 hover:text-gold"
                      onClick={() => setQuantity(line.id, line.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm">{line.quantity}</span>
                    <button
                      aria-label="Aumentar"
                      className="px-2.5 py-2 hover:text-gold"
                      onClick={() => setQuantity(line.id, line.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-display text-lg">{brl(line.price * line.quantity)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit border border-border p-6 lg:sticky lg:top-28">
          <h2 className="eyebrow text-muted-foreground">Resumo</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="Subtotal" value={brl(subtotal)} />
            <Row label="Frete" value={shipping === 0 ? "Grátis" : brl(shipping)} />
          </dl>
          {subtotal < FREE_SHIPPING && (
            <p className="mt-4 bg-sand px-3 py-2 text-xs text-cocoa">
              Faltam {brl(FREE_SHIPPING - subtotal)} para frete grátis.
            </p>
          )}
          <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
            <span className="text-sm">Total</span>
            <span className="font-display text-3xl">{brl(total)}</span>
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {parc.n}x de {brl(parc.value)} sem juros
          </p>
          <Button asChild variant="gold" size="xl" className="mt-6 w-full">
            <Link to="/checkout">Finalizar compra</Link>
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link to="/perfumes">Continuar comprando</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}