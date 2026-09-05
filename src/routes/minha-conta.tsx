import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha conta | Flor de Amaranto" },
      { name: "description", content: "Acesse sua conta para ver pedidos, favoritos e endereços." },
      { property: "og:title", content: "Minha conta | Flor de Amaranto" },
      { property: "og:description", content: "Pedidos, favoritos e dados pessoais." },
      { property: "og:url", content: "/minha-conta" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/minha-conta" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rule-gold" />
        <h1 className="font-display mt-4 text-4xl">Minha conta</h1>
        <p className="mt-3 text-sm text-muted-foreground">Conectado como {user.email}</p>
        <Button variant="outlineInk" className="mt-8" onClick={() => void signOut()}>
          Sair da conta
        </Button>

        <div className="mt-12">
          <h2 className="font-display text-2xl">Meus pedidos</h2>
          <OrderHistory userId={user.id} />
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada", { description: "Confirme seu e-mail para entrar." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">{mode === "in" ? "Entrar" : "Criar conta"}</h1>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email" className="text-xs tracking-[0.12em] uppercase">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-xs tracking-[0.12em] uppercase">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2"
          />
        </div>
        <Button type="submit" variant="gold" size="xl" className="w-full" disabled={busy}>
          {mode === "in" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <button
        className="mt-6 w-full text-xs tracking-[0.14em] text-muted-foreground uppercase hover:text-gold"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}

type OrderRow = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  total: number;
  payment_method: string | null;
};

type OrderItemRow = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  preparing: "Em preparação",
  shipped: "Enviado",
  in_transit: "A caminho",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function methodLabel(method: string | null) {
  if (!method) return "—";
  if (method === "pix") return "Pix";
  if (method === "cartao" || method === "card" || method === "checkout_pro") {
    return "Cartão de crédito";
  }
  return method;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function OrderHistory({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [items, setItems] = useState<Record<string, OrderItemRow[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: orderRows, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, created_at, status, payment_status, total, payment_method")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (ordersError) {
        setError("Não foi possível carregar seus pedidos.");
        setOrders([]);
        return;
      }
      const rows = (orderRows ?? []) as OrderRow[];
      setOrders(rows);
      if (rows.length > 0) {
        const { data: itemRows } = await supabase
          .from("order_items")
          .select("order_id, product_name, quantity, unit_price, total")
          .in(
            "order_id",
            rows.map((o) => o.id),
          );
        if (!active) return;
        const grouped: Record<string, OrderItemRow[]> = {};
        for (const item of (itemRows ?? []) as OrderItemRow[]) {
          (grouped[item.order_id] ??= []).push(item);
        }
        setItems(grouped);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (orders === null) {
    return (
      <div className="mt-6 grid place-items-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="mt-6 text-sm text-destructive">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="mt-6 border border-border bg-card/40 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido.</p>
        <Button asChild variant="outlineInk" size="pill" className="mt-4">
          <Link to="/perfumes">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="mt-6">
      {orders.map((order) => (
        <AccordionItem key={order.id} value={order.id}>
          <AccordionTrigger>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-4 text-left">
              <div>
                <p className="text-sm font-medium">Pedido {order.order_number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
                <span className="font-display text-lg">{brl(Number(order.total ?? 0))}</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground">
              Pagamento: {methodLabel(order.payment_method)}
            </p>
            <ul className="mt-3 divide-y divide-border">
              {(items[order.id] ?? []).map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span>
                    {item.quantity}× {item.product_name}
                  </span>
                  <span className="text-muted-foreground">{brl(Number(item.total))}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
