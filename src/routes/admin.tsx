import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, Package, ShoppingBag, Users, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { getStockStatus } from "@/lib/stock.functions";
import { getAdminDashboard, type AdminDashboard } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Flor de Amaranto" },
      { name: "description", content: "Painel administrativo da Flor de Amaranto." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  paid: "Pago",
  preparing: "Em preparação",
  shipped: "Enviado",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
};

function AdminPage() {
  const { user, loading } = useAuth();
  const getStatus = useServerFn(getStockStatus);
  const dashFn = useServerFn(getAdminDashboard);

  const statusQuery = useQuery({
    queryKey: ["stock-status"],
    queryFn: () => getStatus(),
    enabled: Boolean(user),
    retry: false,
  });

  const isAdmin = Boolean(statusQuery.data?.isAdmin);

  const dashQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => dashFn(),
    enabled: isAdmin,
    retry: false,
  });

  if (loading || (user && statusQuery.isLoading)) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <Gate title="Área restrita" text="Entre com a sua conta de administrador para ver o painel.">
        <Button asChild variant="gold" size="pill">
          <Link to="/minha-conta">Entrar</Link>
        </Button>
      </Gate>
    );
  }

  if (!isAdmin) {
    return <Gate title="Acesso negado" text="Esta área é restrita ao administrador da loja." />;
  }

  if (dashQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dashQuery.isError || !dashQuery.data) {
    return (
      <Gate title="Erro ao carregar" text={dashQuery.error?.message ?? "Tente novamente."}>
        <Button variant="outlineInk" size="pill" onClick={() => dashQuery.refetch()}>
          Tentar novamente
        </Button>
      </Gate>
    );
  }

  return <Dashboard data={dashQuery.data} />;
}

function Gate({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-secondary">
        <Lock className="h-6 w-6 text-gold" />
      </div>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
      {children && <div className="mt-8 flex justify-center">{children}</div>}
    </div>
  );
}

function Dashboard({ data }: { data: AdminDashboard }) {
  const maxDay = Math.max(1, ...data.byDay.map((d) => d.revenue));
  const maxProduct = Math.max(1, ...data.topProducts.map((p) => p.qty));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Painel administrativo</p>
          <h1 className="mt-2 font-display text-4xl">Dashboard</h1>
        </div>
        <Button asChild variant="outlineInk" size="pill">
          <Link to="/estoque">
            <Package className="mr-2 h-4 w-4" /> Estoque
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Wallet className="h-4 w-4" />} label="Receita total" value={brl(data.revenue)} />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Pedidos" value={String(data.ordersCount)} />
        <Stat label="Ticket médio" value={brl(data.avgTicket)} />
        <Stat label="Itens vendidos" value={String(data.itemsSold)} />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Clientes cadastrados"
          value={String(data.customersTotal)}
        />
        <Stat label="Clientes que compraram" value={String(data.customersWithOrders)} />
        <Stat label="Clientes recorrentes" value={String(data.returningCustomers)} />
        <Stat label="Produtos ativos" value={String(data.productsActive)} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="border border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-xl">Vendas — últimos 30 dias</h2>
          <div className="mt-5 flex h-40 items-end gap-[3px]">
            {data.byDay.map((d) => (
              <div
                key={d.date}
                title={`${d.date.slice(8, 10)}/${d.date.slice(5, 7)} · ${brl(d.revenue)} · ${d.orders} pedido(s)`}
                className="flex-1 bg-gold/80 transition-colors hover:bg-gold"
                style={{ height: `${Math.max(2, (d.revenue / maxDay) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[0.6rem] tracking-wider text-muted-foreground uppercase">
            <span>{data.byDay[0]?.date.slice(8, 10)}/{data.byDay[0]?.date.slice(5, 7)}</span>
            <span>{data.byDay.at(-1)?.date.slice(8, 10)}/{data.byDay.at(-1)?.date.slice(5, 7)}</span>
          </div>
        </section>

        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-xl">Produtos mais vendidos</h2>
          {data.topProducts.length === 0 ? (
            <Empty text="Ainda não há vendas registradas." />
          ) : (
            <ul className="mt-4 space-y-3">
              {data.topProducts.map((p) => (
                <li key={p.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      {p.name}
                      {p.brand && <span className="text-muted-foreground"> · {p.brand}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.qty} un · {brl(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-secondary">
                    <div
                      className="h-full bg-gold"
                      style={{ width: `${(p.qty / maxProduct) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-xl">Vendas por estado</h2>
          {data.byState.length === 0 ? (
            <Empty text="Ainda não há vendas por região." />
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {data.byState.map((s) => (
                <li key={s.label} className="flex items-center justify-between">
                  <span>{s.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.value} pedido(s) · {brl(s.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-xl">Pedidos por status</h2>
          {data.byStatus.length === 0 ? (
            <Empty text="Nenhum pedido ainda." />
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {data.byStatus.map((s) => (
                <li key={s.label} className="flex items-center justify-between">
                  <span>{STATUS_LABELS[s.label] ?? s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.value}</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt-6 font-display text-xl">Formas de pagamento</h2>
          {data.byPayment.length === 0 ? (
            <Empty text="Sem dados de pagamento." />
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {data.byPayment.map((p) => (
                <li key={p.label} className="flex items-center justify-between">
                  <span>{PAYMENT_LABELS[p.label] ?? p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.value}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-xl">Pedidos recentes</h2>
          {data.recentOrders.length === 0 ? (
            <Empty text="Nenhum pedido registrado." />
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">#{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      {o.city ? ` · ${o.city}${o.state ? `/${o.state}` : ""}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{brl(o.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {STATUS_LABELS[o.status] ?? o.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-display text-xl">Estoque baixo (≤ 3 unidades)</h2>
          {data.lowStock.length === 0 ? (
            <Empty text="Nenhum produto com estoque crítico." />
          ) : (
            <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {data.lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 border border-border/60 px-3 py-2"
                >
                  <span className="truncate">{p.name}</span>
                  <span
                    className={`shrink-0 text-xs font-medium ${p.stock === 0 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {p.stock} un
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-4 text-sm text-muted-foreground">{text}</p>;
}
