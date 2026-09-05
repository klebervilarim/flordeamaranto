import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
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
import {
  getStockProduct,
  listStockBrands,
  updateProduct,
  uploadProductImage,
  type StockProductDetail,
} from "@/lib/stock.functions";

export const Route = createFileRoute("/estoque/produto/$id")({
  head: () => ({
    meta: [
      { title: "Editar produto — Flor de Amaranto" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  return (
    <StockGate>
      <ProductEditorLoader id={id} />
    </StockGate>
  );
}

function ProductEditorLoader({ id }: { id: string }) {
  const getProduct = useServerFn(getStockProduct);
  const getBrands = useServerFn(listStockBrands);

  const productQuery = useQuery({
    queryKey: ["stock-product", id],
    queryFn: () => getProduct({ data: { id } }),
    retry: false,
  });
  const brandsQuery = useQuery({
    queryKey: ["stock-brands"],
    queryFn: () => getBrands(),
    retry: false,
  });

  if (productQuery.isLoading || brandsQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Produto não encontrado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {productQuery.error?.message ?? "Verifique o endereço e tente novamente."}
        </p>
        <Button asChild variant="outlineInk" size="pill" className="mt-8">
          <Link to="/estoque">Voltar ao estoque</Link>
        </Button>
      </div>
    );
  }

  return (
    <ProductEditor
      key={productQuery.data.id}
      product={productQuery.data}
      brands={brandsQuery.data ?? []}
    />
  );
}

const NONE = "__none__";

function num(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function money(value: number | null): string {
  return value != null ? String(value).replace(".", ",") : "";
}

function ProductEditor({
  product,
  brands,
}: {
  product: StockProductDetail;
  brands: { id: string; name: string }[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveFn = useServerFn(updateProduct);
  const uploadFn = useServerFn(uploadProductImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const secondaryFileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [brandId, setBrandId] = useState(product.brand_id ?? NONE);
  const [productType, setProductType] = useState(product.product_type || "perfume");
  const [volume, setVolume] = useState(product.volume ?? "");
  const [gender, setGender] = useState(product.gender ?? NONE);
  const [origin, setOrigin] = useState(product.origin ?? NONE);
  const [price, setPrice] = useState(money(product.price));
  const [salePrice, setSalePrice] = useState(money(product.sale_price));
  const [costPrice, setCostPrice] = useState(money(product.cost_price));
  const [stock, setStock] = useState(String(product.stock));
  const [purchaseLocation, setPurchaseLocation] = useState(product.purchase_location || "Brasil");
  const [inspiration, setInspiration] = useState(product.inspiration ?? "");
  const [shortDescription, setShortDescription] = useState(product.short_description ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [secondaryImageUrl, setSecondaryImageUrl] = useState(product.secondary_image_url ?? "");
  const [status, setStatus] = useState(product.status);
  const [featured, setFeatured] = useState(product.featured);
  const [bestseller, setBestseller] = useState(product.bestseller);
  const [isNew, setIsNew] = useState(product.is_new);
  const [uploading, setUploading] = useState(false);

  const cost = num(costPrice);
  const suggested = cost != null ? Math.round(cost * 1.4 * 100) / 100 : null;

  const saveMutation = useMutation({
    mutationFn: () => {
      const priceNum = num(price);
      if (priceNum == null || priceNum <= 0) throw new Error("Informe um preço de venda válido.");
      return saveFn({
        data: {
          id: product.id,
          name: name.trim(),
          sku: sku.trim(),
          brandId: brandId === NONE ? null : brandId,
          productType: productType || "perfume",
          volume: volume.trim() || null,
          gender: gender === NONE ? null : gender,
          origin: origin === NONE ? null : origin,
          categorySlug: null,
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
    onSuccess: () => {
      toast.success("Produto salvo.");
      queryClient.removeQueries({ queryKey: ["stock-product", product.id] });
      queryClient.invalidateQueries({ queryKey: ["stock-list"] });
      navigate({ to: "/estoque" });
    },
    onError: (e) => toast.error(e.message),
  });

  const onPickFile = async (file: File, slot: "main" | "secondary" = "main") => {
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 6 MB).");
      return;
    }
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
        reader.readAsDataURL(file);
      });
      const res = await uploadFn({
        data: {
          productId: product.id,
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          dataBase64,
        },
      });
      if (slot === "secondary") setSecondaryImageUrl(res.url);
      else setImageUrl(res.url);
      toast.success("Foto enviada. Clique em Salvar para aplicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar a foto.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (secondaryFileRef.current) secondaryFileRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        to="/estoque"
        className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao estoque
      </Link>

      <h1 className="mt-4 font-display text-3xl sm:text-4xl">Editar produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">{product.slug}</p>

      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">
        <div>
          <div className="border border-border bg-secondary/40">
            <img
              src={imageUrl || placeholder}
              alt={name}
              className="aspect-square w-full object-cover"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
            }}
          />
          <Button
            variant="outlineInk"
            size="sm"
            className="mt-3 w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Enviando…" : "Trocar foto"}
          </Button>
          <div className="mt-3">
            <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
              Ou cole a URL da imagem
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
            <div className="mt-2 border border-border bg-secondary/40">
              <img
                src={secondaryImageUrl || placeholder}
                alt={`${name} — Fragrantica`}
                className="aspect-square w-full object-cover"
              />
            </div>
            <input
              ref={secondaryFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPickFile(f, "secondary");
              }}
            />
            <div className="mt-3 flex gap-2">
              <Button
                variant="outlineInk"
                size="sm"
                className="flex-1"
                disabled={uploading}
                onClick={() => secondaryFileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Enviando…" : "Enviar 2ª foto"}
              </Button>
              {secondaryImageUrl && (
                <Button variant="ghost" size="sm" onClick={() => setSecondaryImageUrl("")}>
                  Remover
                </Button>
              )}
            </div>
            <div className="mt-3">
              <Label htmlFor="secondaryImageUrl" className="text-xs text-muted-foreground">
                Ou cole a URL da Fragrantica
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
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="SKU">
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
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
              disabled={saveMutation.isPending || uploading}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Salvando…" : "Salvar alterações"}
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
