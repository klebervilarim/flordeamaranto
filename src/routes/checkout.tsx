import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Oud Royale" },
      { name: "description", content: "Finalize seu pedido com segurança na Oud Royale." },
      { property: "og:title", content: "Checkout | Oud Royale" },
      { property: "og:description", content: "Finalize seu pedido com segurança." },
      { property: "og:url", content: "/checkout" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: CheckoutPage,
});

const schema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  zip: z.string().trim().min(8, "CEP inválido").max(9),
  street: z.string().trim().min(3, "Endereço inválido").max(160),
  number: z.string().trim().min(1, "Informe o número").max(10),
  city: z.string().trim().min(2, "Cidade inválida").max(80),
  state: z.string().trim().min(2, "UF inválida").max(2),
});

const FREE_SHIPPING = 399;

function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payment, setPayment] = useState("pix");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shipping = subtotal >= FREE_SHIPPING || subtotal === 0 ? 0 : 29.9;
  const discount = payment === "pix" ? subtotal * 0.05 : 0;
  const total = subtotal + shipping - discount;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Nada para finalizar</h1>
        <Button asChild variant="gold" size="xl" className="mt-8">
          <Link to="/perfumes">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(form) as Record<string, string>);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const d = parsed.data;
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          shipping_address: {
            name: d.name,
            email: d.email,
            phone: d.phone,
            zip: d.zip,
            street: d.street,
            number: d.number,
            city: d.city,
            state: d.state.toUpperCase(),
          },
          payment_method: payment,
          subtotal,
          shipping,
          discount,
          total,
          status: "pending",
        })
        .select("id, order_number")
        .single();
      if (error) throw error;

      await supabase.from("order_items").insert(
        lines.map((l) => ({
          order_id: order.id,
          product_id: l.id,
          product_name: l.name,
          unit_price: l.price,
          quantity: l.quantity,
          total: l.price * l.quantity,
        })),
      );

      clear();
      toast.success("Pedido realizado!", { description: `Número ${order.order_number ?? order.id}` });
      void navigate({ to: "/minha-conta" });
    } catch {
      toast.error("Não foi possível concluir o pedido", {
        description: "Revise seus dados e tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">Checkout</h1>

      <form onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          <fieldset>
            <legend className="eyebrow text-muted-foreground">Seus dados</legend>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Nome completo" error={errors['name']} />
              <Field name="email" label="E-mail" type="email" defaultValue={user?.email ?? ""} error={errors['email']} />
              <Field name="phone" label="Telefone / WhatsApp" error={errors['phone']} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow text-muted-foreground">Entrega</legend>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field name="zip" label="CEP" error={errors['zip']} />
              <Field name="street" label="Rua" error={errors['street']} />
              <Field name="number" label="Número" error={errors['number']} />
              <Field name="city" label="Cidade" error={errors['city']} />
              <Field name="state" label="UF" error={errors['state']} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow text-muted-foreground">Pagamento</legend>
            <RadioGroup value={payment} onValueChange={setPayment} className="mt-5 space-y-3">
              {[
                { value: "pix", label: "Pix — 5% de desconto" },
                { value: "cartao", label: "Cartão de crédito — até 6x sem juros" },
                { value: "boleto", label: "Boleto bancário" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-3 border border-border px-5 py-4">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="cursor-pointer text-sm font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
        </div>

        <aside className="h-fit border border-border p-6 lg:sticky lg:top-28">
          <h2 className="eyebrow text-muted-foreground">Resumo</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-muted-foreground">
                  {l.quantity}× {l.name}
                </span>
                <span>{brl(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete</dt>
              <dd>{shipping === 0 ? "Grátis" : brl(shipping)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald">
                <dt>Desconto Pix</dt>
                <dd>-{brl(discount)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
            <span className="text-sm">Total</span>
            <span className="font-display text-3xl">{brl(total)}</span>
          </div>
          <Button type="submit" variant="gold" size="xl" className="mt-6 w-full" disabled={submitting}>
            {submitting ? "Processando..." : "Concluir pedido"}
          </Button>
        </aside>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  type?: string | undefined;
  defaultValue?: string | undefined;
  error?: string | undefined;
}) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs tracking-[0.12em] uppercase">
        {label}
      </Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} className="mt-2" />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}