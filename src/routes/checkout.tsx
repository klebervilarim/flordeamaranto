import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ShippingOptions, useShippingQuote } from "@/components/cart/ShippingCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { cepDigits, maskCep } from "@/lib/shipping";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Flor de Amaranto" },
      { name: "description", content: "Finalize seu pedido com segurança na Flor de Amaranto." },
      { property: "og:title", content: "Checkout | Flor de Amaranto" },
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
  complement: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Cidade inválida").max(80),
  state: z.string().trim().min(2, "UF inválida").max(2),
});

function CheckoutPage() {
  const { lines, subtotal, clear, shipping, setShipping } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cep, setCep] = useState(shipping?.cep ? maskCep(shipping.cep) : "");
  const formRef = useRef<HTMLFormElement>(null);
  const { quote, loading: quoting, result: quoteResult, error: quoteError } = useShippingQuote();

  const shippingPrice = shipping?.price ?? 0;
  const discount = 0;
  const total = subtotal + shippingPrice;

  const onCepChange = (value: string) => {
    const masked = maskCep(value);
    setCep(masked);
    const digits = cepDigits(masked);
    if (digits.length === 8) {
      void quote(digits).then((res) => {
        if (!res) return;
        const form = formRef.current;
        if (form) {
          const set = (name: string, v: string) => {
            const el = form.elements.namedItem(name);
            if (el instanceof HTMLInputElement && v) el.value = v;
          };
          set("street", res.address.street);
          set("district", res.address.district);
          set("city", res.address.city);
          set("state", res.address.state);
        }
        if (res.options.length > 0) {
          const cheapest = res.options.reduce((a, b) => (a.price <= b.price ? a : b));
          setShipping({ cep: digits, ...cheapest });
        }
      });
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Entre para finalizar</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Você precisa estar conectado para concluir o pedido.
        </p>
        <Button asChild variant="gold" size="xl" className="mt-8">
          <Link to="/minha-conta">Entrar ou criar conta</Link>
        </Button>
      </div>
    );
  }

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
    if (!shipping) {
      toast.error("Calcule o frete", {
        description: "Informe o CEP e escolha uma opção de entrega.",
      });
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
            complement: d.complement ?? "",
            district: d.district ?? "",
            city: d.city,
            state: d.state.toUpperCase(),
            shipping_method: shipping.name,
            shipping_eta: shipping.eta,
          },
          payment_method: null,
          subtotal,
          shipping: shipping.price,
          discount,
          total,
          status: "pending",
          notes: `Entrega: ${shipping.name} — ${shipping.eta} (CEP ${shipping.cep})`,
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
      toast.success("Pedido criado!", { description: "Escolha a forma de pagamento." });
      void navigate({ to: "/pagamento/$id", params: { id: order.id } });
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

      <form ref={formRef} onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
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
              <Field
                name="zip"
                label="CEP"
                error={errors['zip']}
                value={cep}
                onChange={onCepChange}
                placeholder="00000-000"
                inputMode="numeric"
              />
              <Field name="street" label="Rua" error={errors['street']} />
              <Field name="number" label="Número" error={errors['number']} />
              <Field name="complement" label="Complemento (opcional)" placeholder="Apto, bloco, casa..." />
              <Field name="district" label="Bairro" />
              <Field name="city" label="Cidade" error={errors['city']} />
              <Field name="state" label="UF" error={errors['state']} />
            </div>
            {quoting && (
              <p className="mt-3 text-xs text-muted-foreground">Calculando frete...</p>
            )}
            {quoteError && <p className="mt-3 text-xs text-destructive">{quoteError}</p>}
            {quoteResult && (
              <div className="mt-4">
                <p className="eyebrow mb-3 text-muted-foreground">Opções de entrega</p>
                <ShippingOptions
                  options={quoteResult.options}
                  selectedId={shipping?.cep === quoteResult.cep ? shipping.id : undefined}
                  onSelect={(opt) => setShipping({ cep: quoteResult.cep, ...opt })}
                />
              </div>
            )}
          </fieldset>

          <div className="border border-border p-5 text-sm text-muted-foreground">
            <p className="eyebrow text-muted-foreground">Pagamento</p>
            <p className="mt-3">
              Na próxima etapa você conclui o pagamento no ambiente seguro do{" "}
              <strong className="text-foreground">Mercado Pago</strong> — com{" "}
              <strong className="text-foreground">Pix</strong> ou{" "}
              <strong className="text-foreground">cartão de crédito</strong> em até 12x.
            </p>
          </div>
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
              <dd>
                {shipping
                  ? shipping.price === 0
                    ? "Grátis"
                    : brl(shipping.price)
                  : "Informe o CEP"}
              </dd>
            </div>
            {shipping && (
              <p className="text-right text-xs text-muted-foreground">
                {shipping.name} — {shipping.eta}
              </p>
            )}
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
          <Button
            type="submit"
            variant="gold"
            size="xl"
            className="mt-6 w-full"
            disabled={submitting || !shipping}
          >
            {submitting
              ? "Processando..."
              : shipping
                ? "Ir para o pagamento"
                : "Calcule o frete para continuar"}
          </Button>
          {!shipping && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Informe o CEP e selecione uma opção de entrega para finalizar.
            </p>
          )}
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
  value,
  onChange,
  placeholder,
  inputMode,
  error,
}: {
  name: string;
  label: string;
  type?: string | undefined;
  defaultValue?: string | undefined;
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  inputMode?: "numeric" | "text" | undefined;
  error?: string | undefined;
}) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs tracking-[0.12em] uppercase">
        {label}
      </Label>
      {value !== undefined ? (
        <Input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="mt-2"
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          inputMode={inputMode}
          className="mt-2"
        />
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}