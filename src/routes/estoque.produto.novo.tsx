import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { slugify } from "@/lib/utils";
import { GENDER_LABELS, ORIGIN_LABELS, PRODUCT_TYPE_LABELS } from "@/lib/catalog";
import { StockGate } from "@/components/stock/StockGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import placeholder from "@/assets/product-placeholder.jpg";
import { createProduct, listStockBrands } from "@/lib/stock.functions";

export const Route = createFileRoute("/estoque/produto/novo")({
  head: () => ({
    meta: [
      { title: "Novo produto — Flor de Amaranto" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewProductPage,
});

function NewProductPage() {
  return (
    <StockGate>
      <NewProductLoader />
    </StockGate>
  );
}

function NewProductLoader() {
  const getBrands = useServerFn(listStockBrands);
  const brandsQuery = useQuery({
    queryKey: ["stock-brands"],
    queryFn: () => getBrands(),
    retry: false,
  });

  if (brandsQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <NewProductEditor brands={brandsQuery.data ?? []} />;
}

const NONE = "__none__";

function num(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function NewProductEditor({ brands }: { brands: { id: string; name: string }[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createProduct);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [brandId, setBrandId] = useState(NONE);
  const [productType, setProductType] = useState("perfume");
  const [volume, setVolume] = useState("");
  const [gender, setGender] = useState(NONE);
  const [origin, setOrigin] = useState(NONE);
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [purchaseLocation, setPurchaseLocation] = useState("Brasil");
  const [inspiration, setInspiration] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [secondaryImageUrl, setSecondaryImageUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [isNew, setIsNew] = useState(true);

  const cost = num(costPrice);
  const suggested = cost != null ? Math.round(cost * 1.4 * 100) / 100 : null;

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const priceNum = num(price);
      if (!name.trim()) throw new Error("Informe o nome do produto.");
      if (!sku.trim()) throw new Error("Informe o SKU.");
      if (!slug.trim()) throw new Error("Informe o slug.");
      if (priceNum == null || priceNum <= 0) throw new Error("Informe um preço de venda válido.");
      return createFn({
        data: {
          name: name.trim(),
          sku: sku.trim(),
          slug: slug.trim(),
          brandId: brandId === NONE ? null : brandId,
          productType: productType || "perfume",
          volume: volume.trim() || null,
          gender: gender === NONE ? null : gender,
          origin: origin === NONE ? null : origin,
          price: priceNum,
          salePrice: num(salePrice),
          costPrice: cost,
          stock: Math.max(0, Math.trunc(num(stock) ?? 0)),
          purchaseLocation,
          inspiration: inspiration.trim() || null,
          shortDescription: shortDescription.trim() || null,
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          secondaryImageUrl: secondaryImageUrl.trim() || null,
          status: status as "active" | "draft" | "archived",
          featured,
          bestseller,
          isNew,
        },
      });
    },
    onSuccess: (res) => {
      toast.success("Produto criado.");
      queryClient.invalidateQueries({ queryKey: ["stock-list"] });
      navigate({ to: "/estoque/produto/$id", params: { id: res.id } });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        to="/estoque"
        className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao estoque
      </Link>

      <h1 className="mt-4 font-display text-3xl sm:text-4xl">Novo produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha os dados e salve. As fotos podem ser enviadas em seguida.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">
        <div>
          <div className="border border-border bg-secondary/40">
            <img
              src={imageUrl || placeholder}
              alt={name || "Novo produto"}
              className="aspect-square w-full object-cover"
            />
          </div>
          <div className="mt-3">
            <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
              URL da imagem
            </Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1"
            />
          </div>
          <div className="mt-8">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              2ª foto · Fragrantica
            </p>
            <div className="mt-2">
              <Label htmlFor="secondaryImageUrl" className="text-xs text-muted-foreground">
                URL da Fragrantica
              </Label>
              <Input
                id="secondaryImageUrl"
                value={secondaryImageUrl}
                onChange={(e) => setSecondaryImageUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do produto">
              <Input value={name} onChange={(e) => onNameChange(e.target.value)} />
            </Field>
            <Field label="SKU">
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </Field>
            <Field label="Slug">
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </Field>
            <Field label="Marca">
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem marca</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo do produto">
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue placeholder="Perfume" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Volume">
              <Input
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="100 ml"
              />
            </Field>
            <Field label="Local de compra">
              <Select value={purchaseLocation} onValueChange={setPurchaseLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Brasil">Brasil</SelectItem>
                  <SelectItem value="Paraguai">Paraguai</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gênero">
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {Object.entries(GENDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Origem">
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Preço de custo">
              <Input
                value={costPrice}
                inputMode="decimal"
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </Field>
            <Field label="Sugerido (+40%)">
              <div className="flex h-10 items-center border border-border bg-secondary/40 px-3 text-sm">
                {suggested != null ? brl(suggested) : "—"}
              </div>
            </Field>
            <Field label="Preço de venda">
              <Input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Preço promocional">
              <Input
                value={salePrice}
                inputMode="decimal"
                placeholder="—"
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </Field>
            <Field label="Estoque">
              <Input value={stock} inputMode="numeric" onChange={(e) => setStock(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-6">
            <Check id="featured" label="Destaque" checked={featured} onChange={setFeatured} />
            <Check
              id="bestseller"
              label="Mais vendido"
              checked={bestseller}
              onChange={setBestseller}
            />
            <Check id="isNew" label="Novidade" checked={isNew} onChange={setIsNew} />
          </div>

          <Field label="Inspiração">
            <Input
              value={inspiration}
              onChange={(e) => setInspiration(e.target.value)}
              placeholder="Ex.: Libre Intense — Yves Saint Laurent"
            />
          </Field>
          <Field label="Descrição curta">
            <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          </Field>
          <Field label="Descrição completa">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </Field>

          <div className="flex items-center gap-3 border-t border-border pt-6">
            <Button
              variant="gold"
              size="pill"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Criando…" : "Criar produto"}
            </Button>
            <Button asChild variant="outlineInk" size="pill">
              <Link to="/estoque">Cancelar</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs tracking-[0.12em] text-muted-foreground uppercase">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}
