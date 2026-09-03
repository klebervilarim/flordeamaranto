import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, CreditCard, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isValidCpfCnpj } from "@/lib/brazil-document";
import { brl } from "@/lib/format";
import {
  checkOrderPayment,
  getMercadoPagoPublicConfig,
  processDirectPayment,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/pagamento/$id")({
  head: () => ({
    meta: [
      { title: "Pagamento | Flor de Amaranto" },
      { name: "description", content: "Pague seu pedido por Pix ou cartão com segurança." },
      { property: "og:title", content: "Pagamento | Flor de Amaranto" },
      { property: "og:description", content: "Pague seu pedido por Pix ou cartão com segurança." },
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

type ItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type PixData = {
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  expires_at: string | null;
};

type MercadoPagoCardToken = { id: string };
type MercadoPagoMethod = { id: string; issuer?: { id?: string | number } };
type MercadoPagoClient = {
  createCardToken: (data: Record<string, string>) => Promise<MercadoPagoCardToken>;
  getPaymentMethods: (data: { bin: string }) => Promise<{ results?: MercadoPagoMethod[] }>;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoClient;
  }
}

function maskDoc(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskCard(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function maskExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

async function loadMercadoPagoSdk() {
  if (window.MercadoPago) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.mercadopago.com/js/v2"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("SDK indisponível")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("SDK indisponível"));
    document.head.appendChild(script);
  });
}

function PaymentPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const getPublicConfig = useServerFn(getMercadoPagoPublicConfig);
  const payDirect = useServerFn(processDirectPayment);
  const checkPayment = useServerFn(checkOrderPayment);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerDoc, setPayerDoc] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [pix, setPix] = useState<PixData | null>(null);

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
      const address = row?.shipping_address ?? {};
      setPayerName(address["name"] ?? "");
      setCardHolder(address["name"] ?? "");
      setPayerEmail(address["email"] ?? user?.email ?? "");
      setItems((itemData as ItemRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, user?.email]);

  useEffect(() => {
    if (order?.payment_status === "paid") {
      void navigate({ to: "/pagamento/sucesso/$id", params: { id } });
    }
  }, [order?.payment_status, id, navigate]);

  useEffect(() => {
    if (!pix) return;
    const timer = window.setInterval(() => {
      void checkPayment({ data: { orderId: id } }).then((result) => {
        if (result.status === "paid") {
          window.clearInterval(timer);
          void navigate({ to: "/pagamento/sucesso/$id", params: { id } });
        }
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pix, checkPayment, id, navigate]);

  const payerIsValid =
    payerName.trim().length >= 3 &&
    /\S+@\S+\.\S+/.test(payerEmail.trim()) &&
    isValidCpfCnpj(payerDoc);
  const cardIsValid =
    cardNumber.replace(/\D/g, "").length >= 13 &&
    cardHolder.trim().length >= 3 &&
    /^\d{2}\/\d{2}$/.test(cardExpiry) &&
    cardCvv.replace(/\D/g, "").length >= 3;

  const onPay = async () => {
    if (!order || !payerIsValid) return;
    setSubmitting(true);
    try {
      const payer = { name: payerName.trim(), email: payerEmail.trim(), document: payerDoc };
      if (method === "pix") {
        const result = await payDirect({ data: { orderId: order.id, method: "pix", payer } });
        if (!result.ok) throw new Error(result.error);
        if (result.data.status === "approved") {
          await navigate({ to: "/pagamento/sucesso/$id", params: { id } });
          return;
        }
        if (!result.data.pix?.qr_code && !result.data.pix?.ticket_url) {
          throw new Error("O Mercado Pago não retornou o código Pix. Tente novamente.");
        }
        setPix(result.data.pix ?? null);
        toast.success("Pix gerado com sucesso");
        return;
      }

      if (!cardIsValid) return;
      await loadMercadoPagoSdk();
      const config = await getPublicConfig();
      const MercadoPago = window.MercadoPago;
      if (!MercadoPago) throw new Error("Não foi possível carregar o pagamento seguro.");
      const mp = new MercadoPago(config.publicKey, { locale: "pt-BR" });
      const number = cardNumber.replace(/\D/g, "");
      const expiry = cardExpiry.split("/");
      const methods = await mp.getPaymentMethods({ bin: number.slice(0, 6) });
      const paymentMethod = methods.results?.[0];
      if (!paymentMethod) throw new Error("Bandeira do cartão não reconhecida.");
      const token = await mp.createCardToken({
        cardNumber: number,
        cardholderName: cardHolder.trim(),
        cardExpirationMonth: expiry[0] ?? "",
        cardExpirationYear: `20${expiry[1] ?? ""}`,
        securityCode: cardCvv,
        identificationType: payerDoc.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF",
        identificationNumber: payerDoc.replace(/\D/g, ""),
      });
      const result = await payDirect({
        data: {
          orderId: order.id,
          method: "card",
          payer,
          token: token.id,
          paymentMethodId: paymentMethod.id,
          issuerId: paymentMethod.issuer?.id ? String(paymentMethod.issuer.id) : undefined,
          installments: installmentCount,
        },
      });
      if (!result.ok) throw new Error(result.error);
      if (result.data.status === "approved") {
        await navigate({ to: "/pagamento/sucesso/$id", params: { id } });
      } else if (result.data.status === "in_process" || result.data.status === "pending") {
        toast.success("Pagamento em análise", {
          description: "A confirmação será atualizada automaticamente.",
        });
        await navigate({ to: "/pagamento/sucesso/$id", params: { id } });
      } else {
        throw new Error("Pagamento recusado. Revise os dados ou tente outro cartão.");
      }
    } catch (error) {
      toast.error("Não foi possível processar o pagamento", {
        description: error instanceof Error ? error.message : "Revise os dados e tente novamente.",
      });
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
  if (loading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">
        Carregando pedido...
      </div>
    );
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
        <div className="space-y-6">
          <section className="border border-border p-6">
            <h2 className="eyebrow text-muted-foreground">Dados do pagador</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <PaymentField label="Nome completo" value={payerName} onChange={setPayerName} />
              <PaymentField
                label="E-mail"
                type="email"
                value={payerEmail}
                onChange={setPayerEmail}
              />
              <div className="sm:col-span-2">
                <PaymentField
                  label="CPF / CNPJ"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={payerDoc}
                  onChange={(value) => setPayerDoc(maskDoc(value))}
                />
                {payerDoc.length > 0 && !isValidCpfCnpj(payerDoc) && (
                  <p className="mt-1 text-xs text-destructive">CPF/CNPJ inválido</p>
                )}
              </div>
            </div>
          </section>

          <section className="border border-border p-6">
            <h2 className="eyebrow text-muted-foreground">Forma de pagamento</h2>
            {pix ? (
              <PixResult
                pix={pix}
                onCopy={() =>
                  void navigator.clipboard
                    .writeText(pix.qr_code ?? "")
                    .then(() => toast.success("Código Pix copiado"))
                }
              />
            ) : (
              <Tabs
                value={method}
                onValueChange={(value) => setMethod(value as "pix" | "card")}
                className="mt-5"
              >
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-none">
                  <TabsTrigger value="pix" className="gap-2 rounded-none">
                    <QrCode className="size-4" /> Pix
                  </TabsTrigger>
                  <TabsTrigger value="card" className="gap-2 rounded-none">
                    <CreditCard className="size-4" /> Cartão
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="pix" className="pt-5">
                  <p className="text-sm text-muted-foreground">
                    O QR Code e o código Pix serão gerados aqui, sem sair da loja. A confirmação
                    ocorre automaticamente.
                  </p>
                </TabsContent>
                <TabsContent value="card" className="pt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <PaymentField
                        label="Número do cartão"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(value) => setCardNumber(maskCard(value))}
                      />
                    </div>
                    <PaymentField
                      label="Nome impresso no cartão"
                      autoComplete="cc-name"
                      value={cardHolder}
                      onChange={setCardHolder}
                    />
                    <div />
                    <PaymentField
                      label="Validade"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(value) => setCardExpiry(maskExpiry(value))}
                    />
                    <PaymentField
                      label="Código de segurança"
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="CVV"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(value) => setCardCvv(value.replace(/\D/g, ""))}
                    />
                    <div className="sm:col-span-2">
                      <Label htmlFor="installments">Parcelas</Label>
                      <select
                        id="installments"
                        className="mt-1 h-9 w-full border border-input bg-background px-3 text-sm"
                        value={installmentCount}
                        onChange={(event) => setInstallmentCount(Number(event.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                          <option key={count} value={count}>
                            {count}x de {brl(total / count)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Os dados do cartão são tokenizados pelo Mercado Pago e não ficam armazenados na
                    loja.
                  </p>
                </TabsContent>
              </Tabs>
            )}
          </section>

          <ul className="space-y-3 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-border pb-3">
                <span className="min-w-0 truncate text-muted-foreground">
                  {item.quantity}× {item.product_name}
                </span>
                <span>{brl(item.unit_price * item.quantity)}</span>
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
          {!pix && (
            <Button
              variant="gold"
              size="xl"
              className="mt-6 w-full"
              onClick={() => void onPay()}
              disabled={submitting || !payerIsValid || (method === "card" && !cardIsValid)}
            >
              {submitting ? "Processando..." : method === "pix" ? "Gerar Pix" : "Pagar com cartão"}
            </Button>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Pagamento processado com segurança pelo Mercado Pago.
          </p>
        </aside>
      </div>
    </div>
  );
}

function PaymentField({
  label,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  label: string;
  onChange: (value: string) => void;
}) {
  const inputId = `payment-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        className="mt-1 rounded-none"
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </div>
  );
}

function PixResult({ pix, onCopy }: { pix: PixData; onCopy: () => void }) {
  return (
    <div className="mt-5 text-center">
      <CheckCircle2 className="mx-auto size-8 text-emerald" />
      <h3 className="font-display mt-3 text-2xl">Pix gerado</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Escaneie o QR Code ou copie o código. Esta página confirmará o pagamento automaticamente.
      </p>
      {pix.qr_code_base64 && (
        <img
          src={`data:image/png;base64,${pix.qr_code_base64}`}
          alt="QR Code Pix do pedido"
          className="mx-auto mt-5 size-56 border border-border bg-background p-3"
        />
      )}
      {pix.qr_code && (
        <div className="mt-5 flex gap-2">
          <Input readOnly value={pix.qr_code} className="rounded-none font-mono text-xs" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCopy}
            aria-label="Copiar código Pix"
          >
            <Copy className="size-4" />
          </Button>
        </div>
      )}
      {pix.ticket_url && !pix.qr_code_base64 && (
        <Button asChild variant="outline" className="mt-5">
          <a href={pix.ticket_url} target="_blank" rel="noreferrer">
            Abrir Pix
          </a>
        </Button>
      )}
    </div>
  );
}
