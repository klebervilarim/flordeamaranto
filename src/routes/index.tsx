import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, ShieldCheck, Truck } from "lucide-react";
import heroImage from "@/assets/hero-flor.jpg";
import heroArabes from "@/assets/hero-arabes.jpg";
import beautyImage from "@/assets/cat-beauty.jpg";
import styleDoces from "@/assets/styles/doces.jpg";
import styleAmadeirados from "@/assets/styles/amadeirados.jpg";
import styleEspeciados from "@/assets/styles/especiados.jpg";
import styleCitricos from "@/assets/styles/citricos.jpg";
import styleFlorais from "@/assets/styles/florais.jpg";
import styleAromaticos from "@/assets/styles/aromaticos.jpg";
import styleFrutados from "@/assets/styles/frutados.jpg";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/ProductGrid";
import { fetchBrands, fetchCollections, fetchProducts } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flor de Amaranto — Perfumes Árabes, Beleza e Autocuidado" },
      {
        name: "description",
        content:
          "Encontre a fragrância que combina com você. Perfumes árabes, de nicho e importados, skincare, cosméticos e maquiagem com curadoria premium.",
      },
      { property: "og:title", content: "Flor de Amaranto — Cosméticos e Beleza" },
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

const ESTILOS = [
  { label: "Doces", filtro: "doces", img: styleDoces },
  { label: "Amadeirados", filtro: "amadeirados", img: styleAmadeirados },
  { label: "Especiados", filtro: "especiados", img: styleEspeciados },
  { label: "Cítricos", filtro: "citricos", img: styleCitricos },
  { label: "Florais", filtro: "florais", img: styleFlorais },
  { label: "Aromáticos", filtro: "aromaticos", img: styleAromaticos },
  { label: "Frutados", filtro: "frutados", img: styleFrutados },
];

type Slide = {
  eyebrow: string;
  title: string;
  text: string;
  image: string;
  imageAlt: string;
  primary: { label: string; to: string; params?: { filtro: string } };
  secondary?: { label: string; to: string };
};

const SLIDES: Slide[] = [
  {
    eyebrow: "Perfumaria & Beleza",
    title: "Encontre a fragrância que combina com você.",
    text: "Perfumes, beleza e autocuidado selecionados para transformar sua experiência.",
    image: heroImage,
    imageAlt: "Perfume e cosméticos sobre seda com flores de amaranto",
    primary: { label: "Comprar perfumes", to: "/perfumes" },
    secondary: { label: "Explorar coleção", to: "/colecoes" },
  },
  {
    eyebrow: "Coleção em destaque",
    title: "Oud, âmbar e especiarias: o melhor da perfumaria árabe.",
    text: "Fragrâncias intensas e luxuosas das maiores casas do Oriente Médio.",
    image: heroArabes,
    imageAlt: "Frascos orientais de perfume árabe com detalhes dourados",
    primary: { label: "Ver perfumes árabes", to: "/perfumes/$filtro", params: { filtro: "arabes" } },
  },
  {
    eyebrow: "Preços especiais",
    title: "Ofertas da semana em perfumes e beleza.",
    text: "Descontos por tempo limitado na seleção mais desejada da casa.",
    image: beautyImage,
    imageAlt: "Cosméticos e perfumes em oferta",
    primary: { label: "Ver ofertas", to: "/ofertas" },
  },
];

function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
      {SLIDES.map((s, i) => (
        <div
          key={s.title}
          aria-hidden={i !== active}
          className={cn(
            "transition-opacity duration-1000",
            i === 0 ? "relative" : "absolute inset-0",
            i === active ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <img
            src={s.image}
            alt={s.imageAlt}
            width={1600}
            height={1024}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
          <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6">
            <p className="eyebrow text-gold">{s.eyebrow}</p>
            <h1 className="font-display mt-5 max-w-2xl text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
              {s.title}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-foreground/70 sm:text-base">
              {s.text}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="xl">
                <Link
                  to={s.primary.to as never}
                  {...(s.primary.params ? { params: s.primary.params as never } : {})}
                >
                  {s.primary.label}
                </Link>
              </Button>
              {s.secondary && (
                <Button asChild variant="outlineGold" size="xl">
                  <Link to={s.secondary.to as never}>{s.secondary.label}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            aria-label={`Ir para destaque ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === active ? "w-8 bg-gold" : "w-2.5 bg-ink-foreground/40 hover:bg-ink-foreground/70",
            )}
          />
        ))}
      </div>
      <button
        aria-label="Destaque anterior"
        onClick={() => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        className="absolute top-1/2 left-3 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-ink-foreground/25 text-ink-foreground/70 transition-colors hover:border-gold hover:text-gold sm:grid"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        aria-label="Próximo destaque"
        onClick={() => setActive((i) => (i + 1) % SLIDES.length)}
        className="absolute top-1/2 right-3 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-ink-foreground/25 text-ink-foreground/70 transition-colors hover:border-gold hover:text-gold sm:grid"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}

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
      <HeroCarousel />

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
        <SectionTitle eyebrow="Famílias olfativas" title="Escolha pelo estilo" />
        <div className="no-scrollbar mt-10 flex gap-8 overflow-x-auto pb-2 sm:justify-between">
          {ESTILOS.map((e) => (
            <Link
              key={e.filtro}
              to="/perfumes/$filtro"
              params={{ filtro: e.filtro }}
              className="group flex w-28 shrink-0 flex-col items-center gap-3"
            >
              <span className="overflow-hidden rounded-full border border-border transition-all group-hover:border-gold group-hover:shadow-gold">
                <img
                  src={e.img}
                  alt={`Ingredientes da família ${e.label}`}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-28 w-28 object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </span>
              <span className="text-xs tracking-[0.18em] uppercase transition-colors group-hover:text-gold">
                {e.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <SectionTitle eyebrow="Seleção da casa" title="Mais vendidos" to="/perfumes" />
        <div className="mt-8">
          <ProductGrid products={featured.slice(0, 8)} loading={isLoading} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
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
              src={heroArabes}
              alt="Perfumes árabes"
              loading="lazy"
              width={1600}
              height={1024}
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
