import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { StockGate } from "@/components/stock/StockGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import {
  listOrdersForAdmin,
  updateOrderFulfillment,
  ORDER_STATUSES,
  type AdminOrder,
  type OrderStatus,
} from "@/lib/orders.functions";

export const Route = createFileRoute("/estoque/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos — Flor de Amaranto" },
      { name: "description", content: "Gestão de pedidos restrita da Flor de Amaranto." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PedidosPage,
});

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando",
  paid: "Pago",
  preparing: "Em preparação",
  shipped: "Despachado",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  cancelled: "Cancelado",
  out_of_stock: "Em falta",
};

function PedidosPage() {
  return (
    <StockGate>
      <PedidosPanel />
    </StockGate>
  );
}

type EditState = { status: OrderStatus; trackingCode: string; carrier: string };

function PedidosPanel() {
  const listFn = useServerFn(listOrdersForAdmin);
  const saveFn = useServerFn(updateOrderFulfillment);
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (input: {
      orderId: string;
      status: OrderStatus;
      trackingCode: string | null;
      carrier: string | null;
    }) => saveFn({ data: input }),
    onSuccess: (_r, v) => {
      toast.success("Pedido atualizado.");
      setEdits((e) => {
        const next = { ...e };
        delete next[v.orderId];
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const orders = ordersQuery.data ?? [];

  const editFor = (o: AdminOrder): EditState =>
    edits[o.id] ?? {
      status: o.status as OrderStatus,
      trackingCode: o.tracking_code ?? "",
      carrier: o.carrier ?? "",
    };

  const setEdit = (id: string, patch: Partial<EditState>, base: EditState) => {
    setEdits((e) => ({ ...e, [id]: { ...base, ...patch } }));
  };

  const isDirty = (o: AdminOrder) => {
    const e = edits[o.id];
    if (!e) return false;
    return (
      e.status !== o.status ||
      e.trackingCode !== (o.tracking_code ?? "") ||
      e.carrier !== (o.carrier ?? "")
    );
  };

  const onSave = (o: AdminOrder) => {
    const e = editFor(o);
    if (e.status === "shipped" && !e.trackingCode.trim()) {
      toast.error("Informe o código de rastreamento para marcar como despachado.");
      return;
    }
    saveMutation.mutate({
      orderId: o.id,
      status: e.status,
      trackingCode: e.trackingCode.trim() || null,
      carrier: e.carrier.trim() || null,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Área do administrador</p>
          <h1 className="mt-2 font-display text-4xl">Pedidos</h1>
        </div>
      </div>

      <div className="mt-8">
        <Label htmlFor="order-search" className="text-xs tracking-[0.12em] uppercase">
          Buscar por nome, telefone ou nº do pedido
        </Label>
        <div className="relative mt-2 max-w-md">
          <Input
            id="order-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ex.: Maria, (11) 99999-0000 ou OR260907..."
          />
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {ordersQuery.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : ordersQuery.isError ? (
          <p className="py-16 text-center text-sm text-destructive">{ordersQuery.error.message}</p>
        ) : orders.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nenhum pedido encontrado.
          </p>
        ) : (
          orders.map((o) => {
            const e = editFor(o);
            const dirty = isDirty(o);
            const saving = saveMutation.isPending && saveMutation.variables?.orderId === o.id;
            return (
              <div key={o.id} className="border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg">{o.order_number}</span>
                      <Badge variant="secondary">
                        {STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </p>
                  </div>
                  <span className="font-display text-xl">{brl(o.total)}</span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="text-sm">
                    <p className="font-medium">{o.address.name || "—"}</p>
                    <p className="text-muted-foreground">{o.address.phone || "—"}</p>
                    <p className="text-muted-foreground">{o.address.email || "—"}</p>
                    <p className="mt-1 text-muted-foreground">
                      {[o.address.street, o.address.number, o.address.complement]
                        .filter(Boolean)
                        .join(", ")}
                      {o.address.district ? ` — ${o.address.district}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {[o.address.city, o.address.state].filter(Boolean).join("/")}
                      {o.address.zip ? ` · CEP ${o.address.zip}` : ""}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="mb-1 text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      Produtos
                    </p>
                    <ul className="space-y-0.5">
                      {o.items.map((it, i) => (
                        <li key={i}>
                          {it.quantity}× {it.product_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-[200px_1fr_1fr_auto] sm:items-end">
                  <div>
                    <Label className="text-xs tracking-[0.12em] uppercase">Status</Label>
                    <Select
                      value={e.status}
                      onValueChange={(v) => setEdit(o.id, { status: v as OrderStatus }, e)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {e.status === "shipped" && (
                    <>
                      <div>
                        <Label className="text-xs tracking-[0.12em] uppercase">
                          Transportadora
                        </Label>
                        <Input
                          className="mt-2"
                          value={e.carrier}
                          onChange={(ev) => setEdit(o.id, { carrier: ev.target.value }, e)}
                          placeholder="Correios (SEDEX), Correios (PAC)..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs tracking-[0.12em] uppercase">
                          Código de rastreamento
                        </Label>
                        <Input
                          className="mt-2"
                          value={e.trackingCode}
                          onChange={(ev) => setEdit(o.id, { trackingCode: ev.target.value }, e)}
                          placeholder="Ex.: BR123456789BR"
                        />
                      </div>
                    </>
                  )}
                  <Button
                    variant="gold"
                    size="pill"
                    disabled={!dirty || saving}
                    onClick={() => onSave(o)}
                  >
                    {saving ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
