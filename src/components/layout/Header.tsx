import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { fetchBrandCounts } from "@/lib/catalog";
import emblemAsset from "@/assets/emblem-flor-de-amaranto.png.asset.json";

type SubLink = { label: string; to: string; params?: { filtro: string } };

const PERFUME_ORIGENS: SubLink[] = [
  { label: "Perfumes Árabes", to: "/perfumes/$filtro", params: { filtro: "arabes" } },
  { label: "Nicho", to: "/perfumes/$filtro", params: { filtro: "nicho" } },
  { label: "Importados", to: "/perfumes/$filtro", params: { filtro: "importados" } },
  { label: "Nacionais", to: "/perfumes/$filtro", params: { filtro: "nacionais" } },
  { label: "Masculinos", to: "/perfumes/$filtro", params: { filtro: "masculinos" } },
  { label: "Femininos", to: "/perfumes/$filtro", params: { filtro: "femininos" } },
];

export const FAMILIAS: SubLink[] = [
  { label: "Doces", to: "/perfumes/$filtro", params: { filtro: "doces" } },
  { label: "Amadeirados", to: "/perfumes/$filtro", params: { filtro: "amadeirados" } },
  { label: "Especiados", to: "/perfumes/$filtro", params: { filtro: "especiados" } },
  { label: "Cítricos", to: "/perfumes/$filtro", params: { filtro: "citricos" } },
  { label: "Florais", to: "/perfumes/$filtro", params: { filtro: "florais" } },
  { label: "Frutados", to: "/perfumes/$filtro", params: { filtro: "frutados" } },
  { label: "Aromáticos", to: "/perfumes/$filtro", params: { filtro: "aromaticos" } },
];

const NAV_SIMPLE = [
  { label: "Home", to: "/" },
  { label: "Cosméticos", to: "/cosmeticos" },
  { label: "Skincare", to: "/skincare" },
  { label: "Corpo & Banho", to: "/corpo-e-banho" },
  { label: "Maquiagem", to: "/maquiagem" },
  { label: "Ofertas", to: "/ofertas" },
] as const;

export function Header() {
  const { count } = useCart();
  const { ids } = useFavorites();
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  const { data: brandCounts = [] } = useQuery({
    queryKey: ["brand-counts"],
    queryFn: fetchBrandCounts,
    staleTime: 5 * 60 * 1000,
  });

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

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
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
                {[
                  { label: "Home", to: "/" },
                  { label: "Perfumes", to: "/perfumes" },
                  ...NAV_SIMPLE.slice(1),
                  { label: "Marcas", to: "/marcas" },
                ].map((item) => (
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
              <p className="eyebrow mt-8 text-gold">Perfumes</p>
              <nav className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {PERFUME_ORIGENS.map((item) => (
                  <MobileLink key={item.label} item={item} close={() => setMenuOpen(false)} />
                ))}
              </nav>
              <p className="eyebrow mt-8 text-gold">Escolha pelo estilo</p>
              <nav className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {FAMILIAS.map((item) => (
                  <MobileLink key={item.label} item={item} close={() => setMenuOpen(false)} />
                ))}
              </nav>
              <p className="eyebrow mt-8 text-gold">Descubra</p>
              <nav className="mt-3 flex flex-col gap-2">
                <Link
                  to="/quiz"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-muted-foreground"
                >
                  Quiz de fragrância
                </Link>
                <Link
                  to="/colecoes"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-muted-foreground"
                >
                  Coleções
                </Link>
              </nav>
              {isAdmin && (
                <>
                  <p className="eyebrow mt-8 text-gold">Administração</p>
                  <nav className="mt-3 flex flex-col gap-2">
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted-foreground"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/estoque"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted-foreground"
                    >
                      Estoque
                    </Link>
                  </nav>
                  <p className="eyebrow mt-8 text-gold">Cadastros</p>
                  <nav className="mt-3 flex flex-col gap-2">
                    <Link
                      to="/estoque/marcas"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted-foreground"
                    >
                      Marcas
                    </Link>
                    <Link
                      to="/estoque/tipos-produto"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted-foreground"
                    >
                      Tipos de produto
                    </Link>
                    <Link
                      to="/estoque/categorias"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted-foreground"
                    >
                      Categorias
                    </Link>
                    <Link
                      to="/estoque/fornecedores"
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-muted-foreground"
                    >
                      Fornecedores
                    </Link>
                  </nav>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <img
            src={emblemAsset.url}
            alt="Flor de Amaranto — Cosméticos e Beleza"
            className="h-10 w-auto shrink-0 sm:h-12"
          />
          <span className="hidden min-w-0 sm:block">
            <span className="font-display block truncate text-lg tracking-[0.16em] text-primary lg:text-xl">
              FLOR DE AMARANTO
            </span>
            <span className="hidden text-[0.6rem] tracking-[0.32em] text-gold uppercase lg:block">
              Cosméticos e Beleza
            </span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-xl lg:block">
          <div className="relative">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Digite o que você procura"
              aria-label="Buscar produtos"
              className="h-11 rounded-full border-input bg-secondary/60 pr-12 text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-gradient-gold text-gold-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <button
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center lg:hidden"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Dashboard do administrador"
              className="hidden h-10 w-10 place-items-center text-gold sm:grid"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
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
          <Link
            to="/carrinho"
            aria-label="Sacola"
            className="relative grid h-10 w-10 place-items-center"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && <Badge value={count} />}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <form
          onSubmit={submitSearch}
          className="border-t border-border px-4 py-3 sm:px-6 lg:hidden"
        >
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
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-6">
          <NavLink to="/" label="Home" />

          <div className="group relative">
            <button className="flex items-center gap-1 py-3 text-[0.7rem] tracking-[0.22em] uppercase transition-colors hover:text-gold">
              Perfumes{" "}
              <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute top-full left-1/2 z-50 -translate-x-1/2 pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div className="grid w-[540px] grid-cols-2 gap-8 border border-border bg-card p-6 shadow-luxe">
                <div>
                  <p className="eyebrow text-gold">Coleções</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {PERFUME_ORIGENS.map((item) => (
                      <DropLink key={item.label} item={item} />
                    ))}
                    <Link
                      to="/perfumes"
                      className="mt-1 text-xs font-medium tracking-[0.14em] text-gold uppercase"
                    >
                      Ver todos os perfumes →
                    </Link>
                  </div>
                </div>
                <div>
                  <p className="eyebrow text-gold">Escolha pelo estilo</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {FAMILIAS.map((item) => (
                      <DropLink key={item.label} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <button className="flex items-center gap-1 py-3 text-[0.7rem] tracking-[0.22em] uppercase transition-colors hover:text-gold">
              Marcas <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute top-full left-1/2 z-50 -translate-x-1/2 pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div className="max-h-[70vh] w-72 overflow-y-auto border border-border bg-card p-5 shadow-luxe">
                <div className="flex flex-col gap-2">
                  {brandCounts.map((b) => (
                    <Link
                      key={b.slug}
                      to="/marcas/$slug"
                      params={{ slug: b.slug }}
                      className="flex items-center justify-between text-sm text-foreground transition-colors hover:text-gold"
                    >
                      <span>{b.name}</span>
                      <span className="text-xs text-muted-foreground">({b.count})</span>
                    </Link>
                  ))}
                  <Link
                    to="/marcas"
                    className="mt-1 text-xs font-medium tracking-[0.14em] text-gold uppercase"
                  >
                    Todas as marcas →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {NAV_SIMPLE.slice(1).map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}

          {isAdmin && (
            <div className="group relative">
              <button className="flex items-center gap-1 py-3 text-[0.7rem] tracking-[0.22em] text-gold uppercase transition-colors hover:text-gold">
                Admin{" "}
                <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible absolute top-full right-0 z-50 pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="flex w-56 flex-col gap-2 border border-border bg-card p-5 shadow-luxe">
                  <Link
                    to="/admin"
                    className="text-sm text-foreground transition-colors hover:text-gold"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/estoque"
                    className="text-sm text-foreground transition-colors hover:text-gold"
                  >
                    Estoque
                  </Link>
                </div>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="group relative">
              <button className="flex items-center gap-1 py-3 text-[0.7rem] tracking-[0.22em] text-gold uppercase transition-colors hover:text-gold">
                Cadastros{" "}
                <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible absolute top-full right-0 z-50 pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="flex w-56 flex-col gap-2 border border-border bg-card p-5 shadow-luxe">
                  <Link
                    to="/estoque/marcas"
                    className="text-sm text-foreground transition-colors hover:text-gold"
                  >
                    Marcas
                  </Link>
                  <Link
                    to="/estoque/tipos-produto"
                    className="text-sm text-foreground transition-colors hover:text-gold"
                  >
                    Tipos de produto
                  </Link>
                  <Link
                    to="/estoque/categorias"
                    className="text-sm text-foreground transition-colors hover:text-gold"
                  >
                    Categorias
                  </Link>
                  <Link
                    to="/estoque/fornecedores"
                    className="text-sm text-foreground transition-colors hover:text-gold"
                  >
                    Fornecedores
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "text-gold" }}
      className="py-3 text-[0.7rem] tracking-[0.22em] uppercase transition-colors hover:text-gold"
    >
      {label}
    </Link>
  );
}

function DropLink({ item }: { item: SubLink }) {
  return (
    <Link
      to={item.to as never}
      {...(item.params ? { params: item.params as never } : {})}
      className="text-sm text-foreground transition-colors hover:text-gold"
    >
      {item.label}
    </Link>
  );
}

function MobileLink({ item, close }: { item: SubLink; close: () => void }) {
  return (
    <Link
      to={item.to as never}
      {...(item.params ? { params: item.params as never } : {})}
      onClick={close}
      className="text-sm text-muted-foreground"
    >
      {item.label}
    </Link>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <span className="absolute top-1 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-gold px-1 text-[0.6rem] font-semibold text-gold-foreground">
      {value}
    </span>
  );
}
