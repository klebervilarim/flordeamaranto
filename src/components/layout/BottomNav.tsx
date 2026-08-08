import { Link } from "@tanstack/react-router";
import { Heart, Home, Search, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";

export function BottomNav() {
  const { count } = useCart();
  const { ids } = useFavorites();

  const items = [
    { to: "/", label: "Home", icon: Home, badge: 0 },
    { to: "/busca", label: "Buscar", icon: Search, badge: 0 },
    { to: "/favoritos", label: "Favoritos", icon: Heart, badge: ids.length },
    { to: "/carrinho", label: "Sacola", icon: ShoppingBag, badge: count },
    { to: "/minha-conta", label: "Conta", icon: User, badge: 0 },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-foreground" }}
              className="relative flex flex-col items-center gap-1 py-2.5 text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase"
            >
              <Icon className="h-[18px] w-[18px]" />
              {badge > 0 && (
                <span className="absolute top-1 right-[22%] grid h-4 min-w-4 place-items-center rounded-full bg-gradient-gold px-1 text-[0.55rem] font-semibold text-gold-foreground">
                  {badge}
                </span>
              )}
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}