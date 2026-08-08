import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { fetchBrands, fetchProducts, type CatalogFilters, type Product } from "@/lib/catalog";
import { ProductGrid } from "./ProductGrid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";

export type FacetKey =
  | "genders"
  | "origins"
  | "families"
  | "brandSlugs"
  | "longevity"
  | "sillage"
  | "skinTypes"
  | "goals"
  | "finishes";

const FAMILIES = [
  "Amadeirado",
  "Oriental",
  "Floral",
  "Cítrico",
  "Frutado",
  "Gourmand",
  "Aromático",
  "Couro",
  "Chipre",
  "Aquático",
  "Musk",
  "Âmbar",
  "Especiado",
  "Verde",
];

const SKIN_TYPES = ["Seca", "Oleosa", "Mista", "Normal", "Sensível"];
const GOALS = [
  "Hidratação",
  "Anti-idade",
  "Controle de oleosidade",
  "Acne",
  "Uniformização",
  "Iluminação",
  "Proteção",
  "Revitalização",
];
const FINISHES = ["Matte", "Natural", "Acetinado", "Glow"];
const LEVELS = ["Baixa", "Média", "Alta", "Muito alta"];

type Selections = Partial<Record<FacetKey, string[]>>;

export function CatalogPage({
  title,
  subtitle,
  base,
  facets,
}: {
  title: string;
  subtitle?: string;
  base: CatalogFilters;
  facets: FacetKey[];
}) {
  const [selections, setSelections] = useState<Selections>({});
  const [maxPrice, setMaxPrice] = useState(900);
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("relevance");

  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: fetchBrands });

  const filters: CatalogFilters = useMemo(
    () => ({
      ...base,
      ...selections,
      maxPrice: maxPrice < 900 ? maxPrice : undefined,
      onlyOffers: onlyOffers || base.onlyOffers,
      inStock,
      sort,
    }),
    [base, selections, maxPrice, onlyOffers, inStock, sort],
  );

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
  });

  const toggle = (key: FacetKey, value: string) =>
    setSelections((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next.length ? next : undefined };
    });

  const facetConfig: Record<FacetKey, { label: string; options: { value: string; label: string }[] }> =
    {
      genders: {
        label: "Gênero",
        options: [
          { value: "masculino", label: "Masculino" },
          { value: "feminino", label: "Feminino" },
          { value: "unissex", label: "Unissex" },
        ],
      },
      origins: {
        label: "Origem / Estilo",
        options: [
          { value: "arabe", label: "Árabe" },
          { value: "nicho", label: "Nicho" },
          { value: "importado", label: "Importado" },
          { value: "nacional", label: "Nacional" },
          { value: "designer", label: "Designer" },
        ],
      },
      families: {
        label: "Família olfativa",
        options: FAMILIES.map((f) => ({ value: f, label: f })),
      },
      brandSlugs: {
        label: "Marca",
        options: brands.map((b) => ({ value: b.slug, label: b.name })),
      },
      longevity: { label: "Fixação", options: LEVELS.map((l) => ({ value: l, label: l })) },
      sillage: { label: "Projeção", options: LEVELS.map((l) => ({ value: l, label: l })) },
      skinTypes: { label: "Tipo de pele", options: SKIN_TYPES.map((s) => ({ value: s, label: s })) },
      goals: { label: "Objetivo", options: GOALS.map((g) => ({ value: g, label: g })) },
      finishes: { label: "Acabamento", options: FINISHES.map((f) => ({ value: f, label: f })) },
    };

  const FilterPanel = (
    <div className="space-y-7">
      {facets.map((key) => {
        const cfg = facetConfig[key];
        if (!cfg.options.length) return null;
        return (
          <div key={key}>
            <p className="eyebrow text-muted-foreground">{cfg.label}</p>
            <div className="no-scrollbar mt-3 max-h-56 space-y-2.5 overflow-y-auto">
              {cfg.options.map((opt) => {
                const id = `${key}-${opt.value}`;
                return (
                  <div key={id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={id}
                      checked={(selections[key] ?? []).includes(opt.value)}
                      onCheckedChange={() => toggle(key, opt.value)}
                    />
                    <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                      {opt.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div>
        <p className="eyebrow text-muted-foreground">Preço até</p>
        <Slider
          className="mt-4"
          value={[maxPrice]}
          min={50}
          max={900}
          step={50}
          onValueChange={([v]) => setMaxPrice(v)}
        />
        <p className="mt-2 text-sm">{maxPrice >= 900 ? "Qualquer preço" : `até ${brl(maxPrice)}`}</p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="offers"
            checked={onlyOffers}
            onCheckedChange={(v) => setOnlyOffers(Boolean(v))}
          />
          <Label htmlFor="offers" className="cursor-pointer text-sm font-normal">
            Somente promoções
          </Label>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox id="stock" checked={inStock} onCheckedChange={(v) => setInStock(Boolean(v))} />
          <Label htmlFor="stock" className="cursor-pointer text-sm font-normal">
            Disponível em estoque
          </Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <div className="rule-gold" />
        <h1 className="font-display mt-4 text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{FilterPanel}</aside>

        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Carregando..." : `${products.length} produtos`}
            </p>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outlineInk" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="font-display text-2xl">Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="pt-6">{FilterPanel}</div>
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-9 w-[168px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevância</SelectItem>
                  <SelectItem value="price-asc">Menor preço</SelectItem>
                  <SelectItem value="price-desc">Maior preço</SelectItem>
                  <SelectItem value="rating">Melhor avaliados</SelectItem>
                  <SelectItem value="new">Novidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ProductGrid products={products} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}