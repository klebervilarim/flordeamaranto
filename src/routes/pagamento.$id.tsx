import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { startCheckoutPro } from "@/lib/payments.functions";

export const Route = createFileRoute("/pagamento/$id")({
  head: () => ({
    meta: [
      { title: "Pagamento | Flor de Amaranto" },
      { name: "description", content: "Conclua seu pedido com segurança pelo Mercado Pago." },
      { property: "og:title", content: "Pagamento | Flor de Amaranto" },
      { property: "og:description", content: "Conclua seu pedido com segurança pelo Mercado Pago." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/pagamento" }],
  }),
  component: PaymentPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  subtotal: number;
  shipping: number;
  total: number;
  payment_status: string;
  shipping_address: Record<string, string> | null;
};

function maskDoc(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function validDoc(value: string) {
  const d = value.replace(/\D/g, "");
  return d.length === 11 || d.length === 14;
}

type ItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

function PaymentPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerDoc, setPayerDoc] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const [{ data: orderData }, { data: itemData }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, subtotal, shipping, total, payment_status, shipping_address")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("id, product_name, quantity, unit_price")
          .eq("order_id", id),
      ]);
      if (!active) return;
      const row = (orderData as OrderRow | null) ?? null;
      setOrder(row);
      const addr = row?.shipping_address ?? {};
      setPayerName(addr["name"] ?? "");
      setPayerEmail(addr["email"] ?? user?.email ?? "");
      setItems((itemData as ItemRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, user?.email]);

  // Redirect already-paid orders to the success page.
  useEffect(() => {
    if (order?.payment_status === "paid") {
      void navigate({ to: "/pagamento/sucesso/$id", params: { id } });
    }
  }, [order?.payment_status, id, navigate]);

  const onPay = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const res = await startCheckoutPro({
        data: {
          orderId: order.id,
          name: payerName.trim(),
          email: payerEmail.trim(),
          document: payerDoc,
        },
      });
      if (!res.ok) {
        toast.error("Não foi possível iniciar o pagamento", { description: res.error });
        return;
      }
      window.location.href = res.data.initPoint;
    } catch {
      toast.error("Não foi possível iniciar o pagamento");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Entre para pagar</h1>
        <Button asChild variant="gold" size="xl" className="mt-8">
          <Link to="/minha-conta">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">Carregando pedido...</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Pedido não encontrado</h1>
        <Button asChild variant="gold" size="xl" className="mt-8">
          <Link to="/perfumes">Continuar comprando</Link>
        </Button>
      </div>
    );
  }

  const subtotal = Number(order.subtotal ?? 0);
  const shippingPrice = Number(order.shipping ?? 0);
  const total = subtotal + shippingPrice;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">Pagamento</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pedido {order.order_number}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <div className="border border-border p-6">
            <h2 className="eyebrow text-muted-foreground">Como funciona</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Você será redirecionado para o ambiente seguro do{" "}
              <strong className="text-foreground">Mercado Pago</strong> para concluir o pagamento com{" "}
              <strong className="text-foreground">Pix</strong>,{" "}
              <strong className="text-foreground">cartão de crédito</strong> em até 12x ou outras
              formas disponíveis. Após a confirmação, você volta automaticamente para a loja.
            </p>
          </div>

          <div className="border border-border p-6">
            <h2 className="eyebrow text-muted-foreground">Dados do pagador</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              O CPF/CNPJ é obrigatório para gerar o Pix e liberar o botão de pagamento no Mercado Pago.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted-foreground">Nome completo</span>
                <input
                  className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">E-mail</span>
                <input
                  type="email"
                  className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">CPF / CNPJ</span>
                <input
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  value={payerDoc}
                  onChange={(e) => setPayerDoc(maskDoc(e.target.value))}
                />
              </label>
            </div>
          </div>

          <ul className="space-y-3 text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 border-b border-border pb-3">
                <span className="min-w-0 truncate text-muted-foreground">
                  {it.quantity}× {it.product_name}
                </span>
                <span>{brl(it.unit_price * it.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="h-fit border border-border p-6 lg:sticky lg:top-28">
          <h2 className="eyebrow text-muted-foreground">Resumo</h2>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Produtos</dt>
              <dd>{brl(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete</dt>
              <dd>{shippingPrice === 0 ? "Grátis" : brl(shippingPrice)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
            <span className="text-sm">Total</span>
            <span className="font-display text-3xl">{brl(total)}</span>
          </div>
          <Button variant="gold" size="xl" className="mt-6 w-full" onClick={() => void onPay()} disabled={submitting}>
            {submitting ? "Redirecionando..." : "Pagar com Mercado Pago"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Ambiente seguro Mercado Pago — Pix, cartão e mais.
          </p>
        </aside>
      </div>
    </div>
  );
}
