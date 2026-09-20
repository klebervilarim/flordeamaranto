import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StockGate } from "@/components/stock/StockGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import { listStock, type StockItem } from "@/lib/stock.functions";
import {
  createManualSale,
  MANUAL_PAYMENT_LABELS,
  MANUAL_PAYMENT_METHODS,
  type ManualPaymentMethod,
} from "@/lib/manual-sales.functions";
import placeholder from "@/assets/product-placeholder.jpg";

export const Route = createFileRoute("/estoque/venda-manual")({
  head: () => ({
    meta: [
      { title: "Venda manual — Flor de Amaranto" },
      {
        name: "description",
        content: "Registro de vendas feitas fora do site, com baixa no estoque.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VendaManualPage,
});

function VendaManualPage() {
  return (
    <StockGate>
      <ManualSalePanel />
    </StockGate>
  );
}

type CartLine = { product: StockItem; quantity: number };

function unitPrice(p: StockItem) {
  return p.sale_price ?? p.price;
}

function ManualSalePanel() {
  const listFn = useServerFn(listStock);
  const createFn = useServerFn(createManualSale);
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ManualPaymentMethod>("pix");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);

  const stockQuery = useQuery({
    queryKey: ["stock-list"],
    queryFn: () => listFn(),
    retry: false,
  });

  const products = stockQuery.data ?? [];

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const inCart = new Set(lines.map((l) => l.product.id));
    return products
      .filter(
        (p) =>
          !inCart.has(p.id) &&
          (p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [products, search, lines]);

  const total = lines.reduce((s, l) => s + unitPrice(l.product) * l.quantity, 0);

  const addLine = (p: StockItem) => {
    setLines((ls) => [...ls, { product: p, quantity: 1 }]);
    setSearch("");
  };

  const setQuantity = (id: string, qty: number) => {
    setLines((ls) =>
      ls.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, qty) } : l)),
    );
  };

  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.product.id !== id));

  const createMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          paymentMethod,
          note: note.trim() || undefined,
          items: lines.map((l) => ({
            productId: l.product.id,
            productName: l.product.name,
            unitPrice: unitPrice(l.product),
            quantity: l.quantity,
          })),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Venda ${r.saleNumber} registrada e estoque atualizado.`);
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethod("pix");
      setNote("");
      setLines([]);
      void queryClient.invalidateQueries({ queryKey: ["stock-list"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const insufficient = lines.find((l) => l.quantity > l.product.stock);
  const canSubmit =
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 8 &&
    lines.length > 0 &&
    !createMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/estoque">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao estoque
        </Link>
      </Button>

      <p className="eyebrow text-gold">Área do administrador</p>
      <h1 className="mt-2 font-display text-4xl">Venda manual</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Registre pedidos feitos fora do site (presencial, WhatsApp). O estoque é baixado
        automaticamente e a venda aparece na lista de pedidos.
      </p>

      <div className="mt-8 space-y-8">
        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-xl">1. Cliente</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="customer-name">Nome</Label>
              <Input
                id="customer-name"
                className="mt-2"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome de quem comprou"
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Telefone</Label>
              <Input
                id="customer-phone"
                className="mt-2"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(11) 99999-0000"
              />
            </div>
          </div>
        </section>

        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-xl">2. Produtos</h2>
          <div className="relative mt-4 max-w-md">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto por nome ou código…"
            />
            <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          {suggestions.length > 0 && (
            <ul className="mt-2 max-w-md divide-y divide-border border border-border bg-background">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => addLine(p)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                  >
                    <img
                      src={p.image_url ?? placeholder}
                      alt={p.name}
                      width={36}
                      height={36}
                      className="h-9 w-9 object-cover"
                    />
                    <span className="flex-1 text-sm">
                      <span className="block font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.sku} · {p.stock} em estoque
                      </span>
                    </span>
                    <span className="text-sm">{brl(unitPrice(p))}</span>
                    <Plus className="h-4 w-4 text-gold" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {lines.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Nenhum produto adicionado. Busque acima e clique para incluir.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {lines.map((l) => (
                <li
                  key={l.product.id}
                  className="flex flex-wrap items-center gap-3 border border-border p-3"
                >
                  <img
                    src={l.product.image_url ?? placeholder}
                    alt={l.product.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.product.sku} · {brl(unitPrice(l.product))} · {l.product.stock} em estoque
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => setQuantity(l.product.id, Number(e.target.value) || 1)}
                    className="h-8 w-20"
                    inputMode="numeric"
                  />
                  <span className="w-24 text-right text-sm font-medium">
                    {brl(unitPrice(l.product) * l.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(l.product.id)}
                    aria-label={`Remover ${l.product.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {insufficient && (
            <p className="mt-3 text-xs text-amber-600">
              Atenção: "{insufficient.product.name}" tem apenas {insufficient.product.stock} em
              estoque — a baixa será limitada ao disponível.
            </p>
          )}
        </section>

        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-xl">3. Pagamento</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Forma de pagamento</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as ManualPaymentMethod)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MANUAL_PAYMENT_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sale-note">Observação (opcional)</Label>
              <Textarea
                id="sale-note"
                className="mt-2"
                rows={1}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: entrega em mãos, retirada…"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <p className="font-display text-2xl">Total: {brl(total)}</p>
            <Button
              variant="gold"
              size="pill"
              disabled={!canSubmit}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando…
                </>
              ) : (
                "Registrar venda e dar baixa no estoque"
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
