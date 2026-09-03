import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/pagamento/sucesso/$id")({
  head: () => ({
    meta: [
      { title: "Pedido confirmado | Flor de Amaranto" },
      {
        name: "description",
        content: "Seu pagamento foi confirmado e seu pedido já está sendo preparado.",
      },
      { property: "og:title", content: "Pedido confirmado | Flor de Amaranto" },
      {
        property: "og:description",
        content: "Seu pagamento foi confirmado e seu pedido já está sendo preparado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/pagamento/sucesso" }],
  }),
  component: SuccessPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  subtotal: number;
  shipping: number;
  discount: number | null;
  total: number | null;
  payment_method: string | null;
  payment_status: string;
  status: string | null;
  created_at: string | null;
};

function methodLabel(method: string | null) {
  if (!method) return "—";
  if (method === "pix") return "Pix";
  if (method === "cartao" || method === "card") return "Cartão de crédito";
  return method;
}

function SuccessPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Sync status with Mercado Pago on return (webhook backup).
      try {
        await checkOrderPayment({ data: { orderId: id } });
      } catch {
        // ignore — page still renders current status
      }
      if (!active) return;
      const { data } = await supabase
        .from("orders")
        .select(
          "id, order_number, subtotal, shipping, discount, total, payment_method, payment_status, status, created_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      setOrder((data as OrderRow | null) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Entre para ver seu pedido</h1>
        <Button asChild variant="gold" size="xl" className="mt-8">
          <Link to="/minha-conta">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">
        Carregando confirmação...
      </div>
    );
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

  const total = Number(order.total ?? 0);
  const confirmed = order.payment_status === "paid";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <div className="rule-gold mx-auto w-24" />
      <h1 className="font-display mt-6 text-4xl">
        {confirmed ? "Pagamento aprovado!" : "Pedido recebido!"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {confirmed ? (
          <>
            Pedido <span className="font-medium text-foreground">{order.order_number}</span>{" "}
            confirmado. Já estamos preparando seu envio.
          </>
        ) : (
          <>
            Pedido <span className="font-medium text-foreground">{order.order_number}</span>{" "}
            registrado. Assim que o pagamento for confirmado, avisaremos por e-mail.
          </>
        )}
      </p>

      <dl className="mt-10 space-y-3 border border-border bg-card/40 px-6 py-5 text-left text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Número do pedido</dt>
          <dd className="font-medium">{order.order_number}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Forma de pagamento</dt>
          <dd className="font-medium">{methodLabel(order.payment_method)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{brl(Number(order.subtotal ?? 0))}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Frete</dt>
          <dd>{Number(order.shipping ?? 0) === 0 ? "Grátis" : brl(Number(order.shipping ?? 0))}</dd>
        </div>
        {Number(order.discount ?? 0) > 0 && (
          <div className="flex justify-between text-emerald">
            <dt>Desconto</dt>
            <dd>-{brl(Number(order.discount ?? 0))}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="text-sm">Total</dt>
          <dd className="font-display text-2xl">{brl(total)}</dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="gold" size="xl">
          <Link to="/minha-conta">Ver meus pedidos</Link>
        </Button>
        <Button asChild variant="outline" size="xl">
          <Link to="/perfumes">Continuar comprando</Link>
        </Button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Guarde o número do seu pedido para futuras consultas. Em caso de dúvidas, fale com a nossa
        central de atendimento.
      </p>
    </div>
  );
}
