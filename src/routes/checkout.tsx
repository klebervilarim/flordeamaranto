import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

const personalSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
});

const addressSchema = z.object({
  zip: z.string().trim().min(8, "CEP inválido").max(9),
  street: z.string().trim().min(3, "Endereço inválido").max(160),
  number: z.string().trim().min(1, "Informe o número").max(10),
  complement: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Cidade inválida").max(80),
  state: z.string().trim().min(2, "UF inválida").max(2),
});

const schema = personalSchema.merge(addressSchema);

type FormState = {
  name: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

function validateStep<Shape extends z.ZodRawShape>(
  partialSchema: z.ZodObject<Shape>,
  data: Record<string, unknown>,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) {
  const parsed = partialSchema.safeParse(data);
  const fields = Object.keys(partialSchema.shape);
  setErrors((prev) => {
    const next = { ...prev };
    for (const f of fields) delete next[f];
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
    }
    return next;
  });
  return parsed.success;
}

function CheckoutPage() {
  const { lines, subtotal, clear, shipping, setShipping } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cep, setCep] = useState(shipping?.cep ? maskCep(shipping.cep) : "");
  const { quote, loading: quoting, result: quoteResult, error: quoteError } = useShippingQuote();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: user?.email ?? "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
  });
  const updateField = (name: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);

  const shippingPrice = shipping?.price ?? 0;
  const discount = 0;
  const total = subtotal + shippingPrice;

  const isStep1Filled =
    form.name.trim() !== "" && form.email.trim() !== "" && form.phone.trim() !== "";
  const isStep2Filled =
    cepDigits(cep).length === 8 &&
    form.street.trim() !== "" &&
    form.number.trim() !== "" &&
    form.city.trim() !== "" &&
    form.state.trim() !== "";

  const onCepChange = (value: string) => {
    const masked = maskCep(value);
    setCep(masked);
    setShipping(null);
    setStep2Done(false);
    setStep3Done(false);
    const digits = cepDigits(masked);
    if (digits.length === 8) {
      void quote(digits).then((res) => {
        if (!res) return;
        setForm((prev) => ({
          ...prev,
          street: res.address.street || prev.street,
          district: res.address.district || prev.district,
          city: res.address.city || prev.city,
          state: res.address.state || prev.state,
        }));
      });
    }
  };

  const onSaveStep1 = () => {
    if (validateStep(personalSchema, form, setErrors)) setStep1Done(true);
  };

  const onSaveStep2 = async () => {
    if (!validateStep(addressSchema, { ...form, zip: cep }, setErrors)) return;
    const digits = cepDigits(cep);
    const currentQuote = quoteResult?.cep === digits ? quoteResult : await quote(digits);
    if (!currentQuote) {
      toast.error("Não foi possível calcular o frete", {
        description: "Confira o CEP e tente novamente.",
      });
      return;
    }
    setStep2Done(true);
  };

  const checkoutComplete = step1Done && step2Done && step3Done && Boolean(shipping);

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
    if (!checkoutComplete) {
      toast.error("Complete todas as etapas", {
        description: "Salve seus dados, endereço e escolha a forma de envio.",
      });
      return;
    }
    const parsed = schema.safeParse({ ...form, zip: cep });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    if (!shipping) {
      toast.error("Escolha a forma de envio", {
        description: "Selecione uma opção de entrega para continuar.",
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
          user_id: user.id,
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

      <form onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Etapa 1 — Dados pessoais */}
          <StepSection number={1} title="Dados pessoais" status={step1Done ? "done" : "active"}>
            {step1Done ? (
              <StepSummary onEdit={() => setStep1Done(false)}>
                {form.name} · {form.email} · {form.phone}
              </StepSummary>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    name="name"
                    label="Nome completo"
                    value={form.name}
                    onChange={(v) => updateField("name", v)}
                    error={errors["name"]}
                  />
                  <Field
                    name="email"
                    label="E-mail"
                    type="email"
                    value={form.email}
                    onChange={(v) => updateField("email", v)}
                    error={errors["email"]}
                  />
                  <Field
                    name="phone"
                    label="Telefone / WhatsApp"
                    value={form.phone}
                    onChange={(v) => updateField("phone", v)}
                    error={errors["phone"]}
                  />
                </div>
                <Button
                  type="button"
                  variant="gold"
                  className="mt-5"
                  disabled={!isStep1Filled}
                  onClick={onSaveStep1}
                >
                  Salvar e continuar
                </Button>
              </>
            )}
          </StepSection>

          {/* Etapa 2 — Endereço de entrega */}
          <StepSection
            number={2}
            title="Endereço de entrega"
            status={!step1Done ? "locked" : step2Done ? "done" : "active"}
          >
            {!step1Done ? (
              <LockedNotice />
            ) : step2Done ? (
              <StepSummary
                onEdit={() => {
                  setStep2Done(false);
                  setStep3Done(false);
                }}
              >
                {form.street}, {form.number}
                {form.complement ? ` - ${form.complement}` : ""} —{" "}
                {form.district ? `${form.district}, ` : ""}
                {form.city}/{form.state} — CEP {cep}
              </StepSummary>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    name="zip"
                    label="CEP"
                    error={errors["zip"]}
                    value={cep}
                    onChange={onCepChange}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  <Field
                    name="street"
                    label="Rua"
                    value={form.street}
                    onChange={(v) => updateField("street", v)}
                    error={errors["street"]}
                  />
                  <Field
                    name="number"
                    label="Número"
                    value={form.number}
                    onChange={(v) => updateField("number", v)}
                    error={errors["number"]}
                  />
                  <Field
                    name="complement"
                    label="Complemento (opcional)"
                    placeholder="Apto, bloco, casa..."
                    value={form.complement}
                    onChange={(v) => updateField("complement", v)}
                  />
                  <Field
                    name="district"
                    label="Bairro"
                    value={form.district}
                    onChange={(v) => updateField("district", v)}
                  />
                  <Field
                    name="city"
                    label="Cidade"
                    value={form.city}
                    onChange={(v) => updateField("city", v)}
                    error={errors["city"]}
                  />
                  <Field
                    name="state"
                    label="UF"
                    value={form.state}
                    onChange={(v) => updateField("state", v)}
                    error={errors["state"]}
                  />
                </div>
                {quoting && (
                  <p className="mt-3 text-xs text-muted-foreground">Calculando frete...</p>
                )}
                {quoteError && <p className="mt-3 text-xs text-destructive">{quoteError}</p>}
                <Button
                  type="button"
                  variant="gold"
                  className="mt-5"
                  disabled={!isStep2Filled || quoting}
                  onClick={() => void onSaveStep2()}
                >
                  Salvar e continuar
                </Button>
              </>
            )}
          </StepSection>

          {/* Etapa 3 — Forma de envio */}
          <StepSection
            number={3}
            title="Forma de envio"
            status={!step2Done ? "locked" : step3Done ? "done" : "active"}
          >
            {!step2Done ? (
              <LockedNotice />
            ) : step3Done && shipping ? (
              <StepSummary onEdit={() => setStep3Done(false)}>
                {shipping.name} · {shipping.eta} · {shipping.price === 0 ? "Grátis" : brl(shipping.price)}
              </StepSummary>
            ) : quoteResult ? (
              <ShippingOptions
                options={quoteResult.options}
                selectedId={shipping?.cep === quoteResult.cep ? shipping.id : undefined}
                onSelect={(opt) => {
                  setShipping({ cep: quoteResult.cep, ...opt });
                  setStep3Done(true);
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Não foi possível calcular o frete para este CEP. Volte à etapa anterior e confira o
                endereço.
              </p>
            )}
          </StepSection>

          {/* Etapa 4 — Pagamento */}
          <StepSection number={4} title="Pagamento" status={!step3Done ? "locked" : "done"}>
            {!step3Done ? (
              <LockedNotice />
            ) : (
              <p className="text-sm text-muted-foreground">
                Na próxima etapa você conclui o pagamento no ambiente seguro do{" "}
                <strong className="text-foreground">Mercado Pago</strong> — com{" "}
                <strong className="text-foreground">Pix</strong> ou{" "}
                <strong className="text-foreground">cartão de crédito</strong> em até 12x.
              </p>
            )}
          </StepSection>
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
            disabled={submitting || !checkoutComplete}
          >
            {submitting
              ? "Processando..."
              : checkoutComplete
                ? "Ir para o pagamento"
                : "Complete as etapas acima para continuar"}
          </Button>
          {!checkoutComplete && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Preencha seus dados, endereço e escolha a forma de envio para finalizar.
            </p>
          )}
        </aside>
      </form>
    </div>
  );
}

function StepSection({
  number,
  title,
  status,
  children,
}: {
  number: number;
  title: string;
  status: "locked" | "active" | "done";
  children: React.ReactNode;
}) {
  return (
    <fieldset className={status === "locked" ? "opacity-60" : undefined}>
      <legend className="flex w-full items-center gap-3">
        <span
          className={
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium " +
            (status === "done" ? "bg-gold/40 text-gold-foreground" : "bg-gold text-gold-foreground")
          }
        >
          {status === "done" ? "✓" : number}
        </span>
        <span className="eyebrow text-muted-foreground">{title}</span>
      </legend>
      <div className="mt-5 border-t border-border pt-5">{children}</div>
    </fieldset>
  );
}

function LockedNotice() {
  return (
    <p className="border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      Finalize a etapa anterior para continuar.
    </p>
  );
}

function StepSummary({ children, onEdit }: { children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <p className="text-muted-foreground">{children}</p>
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onEdit}
        className="h-auto shrink-0 p-0 text-xs"
      >
        Alterar
      </Button>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  inputMode,
  error,
}: {
  name: string;
  label: string;
  type?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  inputMode?: "numeric" | "text" | undefined;
  error?: string | undefined;
}) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs tracking-[0.12em] uppercase">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
