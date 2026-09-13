import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import placeholder from "@/assets/product-placeholder.jpg";
import { CouponInput } from "@/components/cart/CouponInput";
import { ShippingCalculator } from "@/components/cart/ShippingCalculator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/hooks/useCart";
import { brl } from "@/lib/format";

/** Painel lateral com o carrinho, acionado pelo header e pelo popup de "adicionado à sacola". */
export function CartDrawer() {
  const { cartOpen, closeCart, lines, subtotal, discount, shipping, remove, setQuantity } =
    useCart();
  const shippingPrice = shipping?.price ?? 0;
  const total = Math.max(subtotal + shippingPrice - discount, 0);

  return (
    <Sheet open={cartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-normal">Carrinho de Compras</SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">Sua sacola está vazia.</p>
            <Button variant="gold" onClick={closeCart} asChild>
              <Link to="/perfumes">Começar a comprar</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y divide-border">
                {lines.map((line) => (
                  <li key={line.id} className="flex gap-3 py-4">
                    <img
                      src={line.image ?? placeholder}
                      alt={line.name}
                      className="h-16 w-16 shrink-0 bg-secondary object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center border border-border">
                          <button
                            type="button"
                            aria-label="Diminuir"
                            className="px-2 py-1.5 hover:text-gold"
                            onClick={() => setQuantity(line.id, line.quantity - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Aumentar"
                            className="px-2 py-1.5 hover:text-gold"
                            onClick={() => setQuantity(line.id, line.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-medium">
                          {brl(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Remover item"
                      onClick={() => remove(line.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <ShippingCalculator />
                <CouponInput />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{brl(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frete</dt>
                  <dd>
                    {shipping
                      ? shippingPrice === 0
                        ? "Grátis"
                        : brl(shippingPrice)
                      : "Calcule para ver"}
                  </dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald">
                    <dt>Desconto</dt>
                    <dd>-{brl(discount)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm">Total</span>
                <span className="font-display text-2xl">{brl(total)}</span>
              </div>
              <Button asChild variant="gold" size="xl" className="mt-4 w-full" onClick={closeCart}>
                <Link to="/checkout">Iniciar compra</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
