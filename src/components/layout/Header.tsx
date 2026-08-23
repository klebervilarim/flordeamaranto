import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import emblemAsset from "@/assets/emblem-flor-de-amaranto.png.asset.json";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Perfumes", to: "/perfumes" },
  { label: "Cosméticos", to: "/cosmeticos" },
  { label: "Skincare", to: "/skincare" },
  { label: "Corpo & Banho", to: "/corpo-e-banho" },
  { label: "Maquiagem", to: "/maquiagem" },
  { label: "Marcas", to: "/marcas" },
  { label: "Ofertas", to: "/ofertas" },
] as const;

type SubLink = { label: string; to: string; params?: { filtro: string } };

const SUB: SubLink[] = [
  { label: "Perfumes Árabes", to: "/perfumes/$filtro", params: { filtro: "arabes" } },
  { label: "Nicho", to: "/perfumes/$filtro", params: { filtro: "nicho" } },
  { label: "Importados", to: "/perfumes/$filtro", params: { filtro: "importados" } },
  { label: "Nacionais", to: "/perfumes/$filtro", params: { filtro: "nacionais" } },
  { label: "Quiz de fragrância", to: "/quiz" },
];

export function Header() {
  const { count } = useCart();
  const { ids } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setSearchOpen(false);
    navigate({ to: "/busca", search: { q: term.trim() } });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 text-foreground backdrop-blur">
      <div className="bg-gradient-gold py-1.5 text-center text-[0.68rem] tracking-[0.2em] uppercase text-gold-foreground">
        Frete grátis acima de R$ 399 · 3x sem juros
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Abrir menu"
                className="grid h-10 w-10 shrink-0 place-items-center lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-sm border-0 bg-background p-0">
              <div className="flex h-full flex-col overflow-y-auto p-6 text-foreground">
                <div className="flex items-center gap-3">
                  <img src={emblemAsset.url} alt="Flor de Amaranto" className="h-12 w-auto" />
                  <span className="font-display text-xl tracking-[0.18em]">FLOR DE AMARANTO</span>
                </div>
                <nav className="mt-8 flex flex-col gap-1">
                  {NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className="border-b border-border py-3 text-sm tracking-[0.12em] uppercase"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <p className="eyebrow mt-8 text-gold">Coleções</p>
                <nav className="mt-3 flex flex-col gap-2">
                  {SUB.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to as never}
                      {...(item.params ? { params: item.params as never } : {})}
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex min-w-0 justify-center lg:justify-start">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src={emblemAsset.url}
              alt="Flor de Amaranto — Cosméticos e Beleza"
              className="h-10 w-auto shrink-0 sm:h-12"
            />
            <span className="min-w-0 text-center lg:text-left">
              <span className="font-display block truncate text-lg tracking-[0.16em] text-primary sm:text-xl">
                FLOR DE AMARANTO
              </span>
              <span className="hidden text-[0.6rem] tracking-[0.32em] text-gold uppercase sm:block">
                Cosméticos e Beleza
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <Link
            to="/minha-conta"
            aria-label="Minha conta"
            className="hidden h-10 w-10 place-items-center sm:grid"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to="/favoritos"
            aria-label="Favoritos"
            className="relative hidden h-10 w-10 place-items-center sm:grid"
          >
            <Heart className="h-5 w-5" />
            {ids.length > 0 && <Badge value={ids.length} />}
          </Link>
          <Link to="/carrinho" aria-label="Sacola" className="relative grid h-10 w-10 place-items-center">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && <Badge value={count} />}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} className="border-t border-border px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Busque por marca, nota, família olfativa..."
              className="border-input bg-transparent text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" variant="gold">
              Buscar
            </Button>
          </div>
        </form>
      )}

      <nav className="hidden border-t border-border lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-6 py-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-gold" }}
              className="text-[0.7rem] tracking-[0.22em] uppercase transition-colors hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <span className="absolute top-1 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-gold px-1 text-[0.6rem] font-semibold text-gold-foreground">
      {value}
    </span>
  );
}