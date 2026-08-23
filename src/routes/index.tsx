import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, ShieldCheck, Truck } from "lucide-react";
import heroImage from "@/assets/hero-perfume.jpg";
import beautyImage from "@/assets/cat-beauty.jpg";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/ProductGrid";
import { fetchBrands, fetchCollections, fetchProducts } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oud Royale — Perfumes Árabes, Beleza e Autocuidado" },
      {
        name: "description",
        content:
          "Encontre a fragrância que combina com você. Perfumes árabes, de nicho e importados, skincare, cosméticos e maquiagem com curadoria premium.",
      },
      { property: "og:title", content: "Oud Royale — Perfumaria & Beleza Premium" },
      {
        property: "og:description",
        content: "Perfumes, beleza e autocuidado selecionados para transformar sua experiência.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const CATEGORIES = [
  { label: "Perfumes", to: "/perfumes" as const, hint: "Árabes, nicho e importados" },
  { label: "Skincare", to: "/skincare" as const, hint: "Rotina completa" },
  { label: "Cosméticos", to: "/cosmeticos" as const, hint: "Beleza diária" },
  { label: "Maquiagem", to: "/maquiagem" as const, hint: "Cor e acabamento" },
  { label: "Corpo & Banho", to: "/corpo-e-banho" as const, hint: "Ritual de autocuidado" },
  { label: "Ofertas", to: "/ofertas" as const, hint: "Preços especiais" },
];

function Home() {
  const { data: featured = [], isLoading } = useQuery({
    queryKey: ["home-featured"],
    queryFn: () => fetchProducts({ collectionSlug: "mais-vendidos", sort: "rating" }),
  });
  const { data: novelties = [] } = useQuery({
    queryKey: ["home-new"],
    queryFn: () => fetchProducts({ collectionSlug: "novidades", sort: "new" }),
  });
  const { data: collections = [] } = useQuery({ queryKey: ["collections"], queryFn: fetchCollections });
  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: fetchBrands });

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <img
          src={heroImage}
          alt="Frasco de perfume árabe dourado sobre mármore negro"
          width={1600}
          height={1104}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6">
          <p className="eyebrow text-gold">Perfumaria & Beleza</p>
          <h1 className="font-display mt-5 max-w-2xl text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Encontre a fragrância que combina com você.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-foreground/70 sm:text-base">
            Perfumes, beleza e autocuidado selecionados para transformar sua experiência.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="xl">
              <Link to="/perfumes">Comprar perfumes</Link>
            </Button>
            <Button asChild variant="outlineGold" size="xl">
              <Link to="/colecoes">Explorar coleção</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 text-xs sm:grid-cols-3 sm:px-6">
          {[
            { icon: Truck, label: "Frete grátis acima de R$ 399" },
            { icon: ShieldCheck, label: "100% originais e lacrados" },
            { icon: Sparkles, label: "Amostra premium em todo pedido" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-gold" />
              <span className="tracking-[0.08em] uppercase">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="Navegue" title="Categorias" />
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.to}
              to={cat.to}
              className="group flex items-center justify-between border border-border bg-card px-5 py-6 transition-colors hover:border-gold"
            >
              <span>
                <span className="font-display block text-xl">{cat.label}</span>
                <span className="text-xs text-muted-foreground">{cat.hint}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Link
            to="/perfumes/$filtro"
            params={{ filtro: "arabes" }}
            className="group relative isolate flex min-h-[300px] flex-col justify-end overflow-hidden bg-ink p-8 text-ink-foreground"
          >
            <img
              src={heroImage}
              alt="Perfumes árabes"
              loading="lazy"
              width={1600}
              height={1104}
              className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
            <div className="relative">
              <p className="eyebrow text-gold">Coleção em destaque</p>
              <h3 className="font-display mt-2 text-3xl">Descubra os melhores perfumes árabes</h3>
              <span className="mt-3 inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase">
                Ver coleção <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/skincare"
            className="group relative isolate flex min-h-[300px] flex-col justify-end overflow-hidden bg-sand p-8"
          >
            <img
              src={beautyImage}
              alt="Cosméticos e skincare"
              loading="lazy"
              width={900}
              height={1100}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="relative">
              <p className="eyebrow text-cocoa">Beleza</p>
              <h3 className="font-display mt-2 text-3xl">Cosméticos e skincare</h3>
              <span className="mt-3 inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase">
                Explorar <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <SectionTitle eyebrow="Seleção da casa" title="Mais vendidos" to="/perfumes" />
        <div className="mt-8">
          <ProductGrid products={featured.slice(0, 8)} loading={isLoading} />
        </div>
      </section>

      <section className="bg-ink py-16 text-ink-foreground">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
          <p className="eyebrow text-gold">Encontre seu perfume ideal</p>
          <h2 className="font-display mt-4 text-3xl sm:text-4xl">
            Responda 7 perguntas e receba 3 recomendações
          </h2>
          <p className="mt-3 text-sm text-ink-foreground/60">
            Um quiz criado para traduzir seu gosto em fragrância — família olfativa, projeção,
            fixação e ocasião.
          </p>
          <Button asChild variant="gold" size="xl" className="mt-8">
            <Link to="/quiz">Fazer o quiz</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="Recém-chegados" title="Novidades" to="/colecoes" />
        <div className="mt-8">
          <ProductGrid products={novelties.slice(0, 4)} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <SectionTitle eyebrow="Curadoria" title="Coleções" to="/colecoes" />
        <div className="no-scrollbar mt-8 flex gap-3 overflow-x-auto">
          {collections.map((c) => (
            <Link
              key={c.id}
              to="/colecoes/$slug"
              params={{ slug: c.slug }}
              className="shrink-0 border border-border px-5 py-3 text-xs tracking-[0.16em] uppercase transition-colors hover:border-gold hover:text-gold"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <SectionTitle eyebrow="Casas" title="Marcas" to="/marcas" />
        <div className="mt-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((b) => (
            <Link
              key={b.id}
              to="/marcas/$slug"
              params={{ slug: b.slug }}
              className="font-display bg-card px-4 py-8 text-center text-lg transition-colors hover:text-gold"
            >
              {b.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionTitle({
  eyebrow,
  title,
  to,
}: {
  eyebrow: string;
  title: string;
  to?: "/perfumes" | "/colecoes" | "/marcas";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow text-gold">{eyebrow}</p>
        <h2 className="font-display mt-2 text-3xl sm:text-4xl">{title}</h2>
      </div>
      {to && (
        <Link
          to={to}
          className="text-xs tracking-[0.18em] text-muted-foreground uppercase hover:text-gold"
        >
          Ver tudo
        </Link>
      )}
    </div>
  );
}