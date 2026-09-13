import { X } from "lucide-react";
import { toast } from "sonner";
import placeholder from "@/assets/product-placeholder.jpg";
import { Button } from "@/components/ui/button";
import { brl, discountPercent } from "@/lib/format";
import type { Product } from "@/lib/catalog";

/** Popup exibido ao adicionar um produto à sacola, com atalho para abrir o carrinho. */
export function showAddedToCartToast(product: Product, quantity: number, openCart: () => void) {
  const price = product.sale_price ?? product.price;
  const off = discountPercent(product.price, product.sale_price);
  const lineTotal = price * quantity;

  toast.custom((t) => (
    <div className="w-full max-w-sm border border-border bg-card p-4 shadow-luxe">
      <div className="flex items-start gap-3">
        <img
          src={product.image_url ?? placeholder}
          alt={product.name}
          className="h-14 w-14 shrink-0 bg-secondary object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {quantity}x {brl(price)}
            </span>
            {off > 0 && (
              <span className="bg-ink px-1.5 py-0.5 text-[0.65rem] text-gold uppercase">
                {off}% OFF
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => toast.dismiss(t)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 text-sm font-medium">Adicionado ao carrinho!</p>

      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">
          Total ({quantity} produto{quantity > 1 ? "s" : ""}):
        </span>
        <span className="font-display text-lg">{brl(lineTotal)}</span>
      </div>

      <Button
        variant="gold"
        className="mt-3 w-full"
        onClick={() => {
          toast.dismiss(t);
          openCart();
        }}
      >
        Ver carrinho
      </Button>
    </div>
  ));
}
