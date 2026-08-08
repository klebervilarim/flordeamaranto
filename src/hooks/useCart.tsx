import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/catalog";

export type CartLine = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  volume: string | null;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (product: Product, quantity?: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

const KEY = "oud-royale-cart";
const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartState>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal,
      add: (product, quantity = 1) => {
        setLines((prev) => {
          const existing = prev.find((l) => l.id === product.id);
          if (existing) {
            return prev.map((l) =>
              l.id === product.id ? { ...l, quantity: l.quantity + quantity } : l,
            );
          }
          return [
            ...prev,
            {
              id: product.id,
              slug: product.slug,
              name: product.name,
              brand: product.brands?.name ?? "",
              price: product.sale_price ?? product.price,
              image: product.image_url,
              volume: product.volume,
              quantity,
            },
          ];
        });
        toast.success("Adicionado à sacola", { description: product.name });
      },
      remove: (id) => setLines((prev) => prev.filter((l) => l.id !== id)),
      setQuantity: (id, quantity) =>
        setLines((prev) =>
          quantity <= 0
            ? prev.filter((l) => l.id !== id)
            : prev.map((l) => (l.id === id ? { ...l, quantity } : l)),
        ),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}