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

export type ShippingChoice = {
  cep: string;
  id: string;
  name: string;
  price: number;
  eta: string;
};

export type AppliedCoupon = {
  code: string;
  type: string;
  value: number;
  minOrder: number;
};

type CartState = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  shipping: ShippingChoice | null;
  coupon: AppliedCoupon | null;
  discount: number;
  add: (product: Product, quantity?: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  setShipping: (shipping: ShippingChoice | null) => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;
  clear: () => void;
};

const KEY = "oud-royale-cart";
const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [shipping, setShipping] = useState<ShippingChoice | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // formato antigo: apenas a lista de itens
          setLines(parsed as CartLine[]);
        } else if (parsed && typeof parsed === "object") {
          const stored = parsed as {
            lines?: CartLine[];
            shipping?: ShippingChoice | null;
            coupon?: AppliedCoupon | null;
          };
          setLines(stored.lines ?? []);
          setShipping(stored.shipping ?? null);
          setCoupon(stored.coupon ?? null);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEY, JSON.stringify({ lines, shipping, coupon }));
  }, [lines, shipping, coupon, hydrated]);

  const value = useMemo<CartState>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const rawDiscount = !coupon
      ? 0
      : coupon.type === "percent"
        ? subtotal * (coupon.value / 100)
        : coupon.value;
    const discount =
      coupon && subtotal >= coupon.minOrder
        ? Math.min(Math.round(rawDiscount * 100) / 100, subtotal)
        : 0;
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal,
      shipping,
      coupon,
      discount,
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
      setShipping,
      setCoupon,
      clear: () => {
        setLines([]);
        setShipping(null);
        setCoupon(null);
      },
    };
  }, [lines, shipping, coupon]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
