import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { payOrder, checkOrderPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/pagamento/$id")({
  head: () => ({
    meta: [
      { title: "Pagamento | Flor de Amaranto" },
      { name: "description", content: "Escolha Pix ou cartão de crédito e conclua seu pedido com segurança." },
      { property: "og:title", content: "Pagamento | Flor de Amaranto" },
      { property: "og:description", content: "Escolha Pix ou cartão de crédito e conclua seu pedido." },
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
  shipping_address: Record<string, unknown> | null;
};

type PixData = {
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  expires_at: string | null;
};

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function PaymentPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [paid, setPaid] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    document: "",
    number: "",
    exp: "",
    cvv: "",
    holder: "",
  });
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, subtotal, shipping, total, payment_status, shipping_address")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      setOrder((data as OrderRow | null) ?? null);
      if (data) {
        const addr = (data.shipping_address ?? {}) as Record<string, string>;
        setForm((f) => ({
          ...f,
          name: f.name || (addr['name'] ?? ""),
          email: f.email || (addr['email'] ?? user?.email ?? ""),
        }));
        if (data.payment_status === "paid") setPaid(true);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, user?.email]);

  useEffect(() => {
    if (!pix || paid) return;
    const tick = async () => {
      const res = await checkOrderPayment({ data: { orderId: id } });
      if (res.status === "paid") {
        setPaid(true);
        if (pollRef.current) window.clearInterval(pollRef.current);
      }
    };
    pollRef.current = window.setInterval(() => void tick(), 5000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [pix, paid, id]);

  const subtotal = Number(order?.subtotal ?? 0);
  const shippingPrice = Number(order?.shipping ?? 0);
  const discount = method === "pix" ? subtotal * 0.05 : 0;
  const total = subtotal + shippingPrice - discount;

  const onPay = async () => {
    if (!order) return;
    if (form.name.trim().length < 3 || !form.email.includes("@") || digitsOnly(form.document).length < 11) {
      toast.error("Dados incompletos", { description: "Informe nome, e-mail e CPF válidos." });
      return;
    }
    if (method === "card") {
      if (digitsOnly(form.number).length < 13 || digitsOnly(form.exp).length < 4 || form.cvv.length < 3 || form.holder.trim().length < 2) {
        toast.error("Dados do cartão incompletos");
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await payOrder({
        data: {
          orderId: order.id,
          buyer: { name: form.name, email: form.email, document: digitsOnly(form.document) },
          payment:
            method === "pix"
              ? { method: "pix" as const }
              : {
                  method: "card" as const,
                  installments,
                  card: { number: form.number, exp: form.exp, cvv: form.cvv, holder: form.holder },
                },
        },
      });
      if (!res.ok) {
        toast.error("Pagamento não concluído", { description: res.error });
        return;
      }
      if (res.data.pix) {
        setPix(res.data.pix);
        toast.success("Pix gerado!", { description: "Escaneie o QR Code ou copie o código." });
      } else if (res.data.status === "approved") {
        setPaid(true);
      } else {
        toast.message("Pagamento em análise", { description: "Avisaremos assim que for aprovado." });
        void navigate({ to: "/minha-conta" });
      }
    } catch {
      toast.error("Não foi possível processar o pagamento");
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

  if (paid) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="rule-gold mx-auto w-24" />
        <h1 className="font-display mt-6 text-4xl">Pagamento aprovado!</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Pedido {order.order_number} confirmado. Já estamos preparando seu envio.
        </p>
        <Button asChild variant="gold" size="xl" className="mt-8">
          <Link to="/minha-conta">Ver meus pedidos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">Pagamento</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pedido {order.order_number}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {pix ? (
            <div className="border border-border p-6 text-center">
              <h2 className="eyebrow text-muted-foreground">Pague com Pix</h2>
              {pix.qr_code_base64 && (
                <img
                  src={`data:image/png;base64,${pix.qr_code_base64}`}
                  alt="QR Code Pix do pedido"
                  className="mx-auto mt-5 h-56 w-56"
                />
              )}
              {pix.qr_code && (
                <>
                  <p className="mt-5 text-xs break-all text-muted-foreground">{pix.qr_code}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      void navigator.clipboard.writeText(pix.qr_code ?? "");
                      toast.success("Código Pix copiado");
                    }}
                  >
                    Copiar código Pix
                  </Button>
                </>
              )}
              <p className="mt-6 text-xs text-muted-foreground">
                Aguardando confirmação do pagamento... esta tela atualiza automaticamente.
              </p>
            </div>
          ) : (
            <>
              <fieldset>
                <legend className="eyebrow text-muted-foreground">Dados do pagador</legend>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <PField label="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                  <PField label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                  <PField label="CPF" value={form.document} onChange={(v) => setForm({ ...form, document: v })} />
                </div>
              </fieldset>

              <fieldset>
                <legend className="eyebrow text-muted-foreground">Forma de pagamento</legend>
                <RadioGroup
                  value={method}
                  onValueChange={(v) => setMethod(v as "pix" | "card")}
                  className="mt-5 space-y-3"
                >
                  <div className="flex items-center gap-3 border border-border px-5 py-4">
                    <RadioGroupItem value="pix" id="m-pix" />
                    <Label htmlFor="m-pix" className="cursor-pointer text-sm font-normal">
                      Pix — 5% de desconto, aprovação imediata
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 border border-border px-5 py-4">
                    <RadioGroupItem value="card" id="m-card" />
                    <Label htmlFor="m-card" className="cursor-pointer text-sm font-normal">
                      Cartão de crédito — até 12x
                    </Label>
                  </div>
                </RadioGroup>

                {method === "card" && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <PField label="Número do cartão" value={form.number} onChange={(v) => setForm({ ...form, number: v })} />
                    <PField label="Nome impresso" value={form.holder} onChange={(v) => setForm({ ...form, holder: v })} />
                    <PField label="Validade (MM/AA)" value={form.exp} onChange={(v) => setForm({ ...form, exp: v })} />
                    <PField label="CVV" value={form.cvv} onChange={(v) => setForm({ ...form, cvv: v })} />
                    <div>
                      <Label className="text-xs tracking-[0.12em] uppercase">Parcelas</Label>
                      <select
                        className="border-input bg-background mt-2 h-10 w-full border px-3 text-sm"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}x de {brl(total / n)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </fieldset>
            </>
          )}
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
          {!pix && (
            <Button variant="gold" size="xl" className="mt-6 w-full" onClick={() => void onPay()} disabled={submitting}>
              {submitting ? "Processando..." : method === "pix" ? "Gerar Pix" : "Pagar com cartão"}
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}

function PField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs tracking-[0.12em] uppercase">{label}</Label>
      <Input className="mt-2" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    </div>
  );
}
