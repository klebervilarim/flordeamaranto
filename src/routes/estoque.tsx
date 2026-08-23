import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Loader2, Lock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import placeholder from "@/assets/product-placeholder.jpg";
import {
  addAllowedIp,
  claimFirstAdmin,
  getStockStatus,
  listStock,
  removeAllowedIp,
  updateStockItem,
  type StockItem,
} from "@/lib/stock.functions";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Oud Royale" },
      { name: "description", content: "Painel de estoque restrito da Oud Royale." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const getStatus = useServerFn(getStockStatus);
  const claim = useServerFn(claimFirstAdmin);
  const addIp = useServerFn(addAllowedIp);
  const removeIp = useServerFn(removeAllowedIp);

  const statusQuery = useQuery({
    queryKey: ["stock-status"],
    queryFn: () => getStatus(),
    enabled: Boolean(user),
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => {
      toast.success("Administrador ativado.");
      queryClient.invalidateQueries({ queryKey: ["stock-status"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const addIpMutation = useMutation({
    mutationFn: (ip?: string) => addIp({ data: { ip } }),
    onSuccess: (r) => {
      toast.success(`IP ${r.ip} autorizado.`);
      queryClient.invalidateQueries({ queryKey: ["stock-status"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeIpMutation = useMutation({
    mutationFn: (ip: string) => removeIp({ data: { ip } }),
    onSuccess: () => {
      toast.success("IP removido.");
      queryClient.invalidateQueries({ queryKey: ["stock-status"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <GateCard
        title="Área restrita"
        text="Entre com a sua conta para acessar o painel de estoque."
      >
        <Button asChild variant="gold" size="pill">
          <Link to="/minha-conta">Entrar / Criar conta</Link>
        </Button>
      </GateCard>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (statusQuery.isError) {
    return (
      <GateCard title="Erro" text={statusQuery.error.message}>
        <Button variant="outlineInk" size="pill" onClick={() => statusQuery.refetch()}>
          Tentar novamente
        </Button>
      </GateCard>
    );
  }

  const status = statusQuery.data!;

  if (!status.isAdmin && !status.adminExists) {
    return (
      <GateCard
        title="Ativar administrador"
        text="Nenhum administrador foi configurado ainda. Como este é o primeiro acesso, você pode ativar esta conta como administradora da loja."
      >
        <Button
          variant="gold"
          size="pill"
          disabled={claimMutation.isPending}
          onClick={() => claimMutation.mutate()}
        >
          {claimMutation.isPending ? "Ativando…" : "Ativar esta conta como administradora"}
        </Button>
      </GateCard>
    );
  }

  if (!status.isAdmin) {
    return (
      <GateCard
        title="Acesso negado"
        text="Esta área é restrita ao administrador da loja."
      />
    );
  }

  if (!status.ipAllowed && status.allowedIps.length === 0) {
    return (
      <GateCard
        title="Autorizar este IP"
        text={`Por segurança, o painel de estoque só abre em IPs autorizados. Seu IP atual é ${status.ip}. Autorize-o para continuar.`}
      >
        <Button
          variant="gold"
          size="pill"
          disabled={addIpMutation.isPending}
          onClick={() => addIpMutation.mutate(undefined)}
        >
          {addIpMutation.isPending ? "Autorizando…" : `Autorizar IP ${status.ip}`}
        </Button>
      </GateCard>
    );
  }

  if (!status.ipAllowed) {
    return (
      <GateCard
        title="IP não autorizado"
        text={`Seu IP atual (${status.ip}) não está na lista de acesso ao estoque. Acesse a partir de um IP autorizado para liberar novos endereços.`}
      />
    );
  }

  return (
    <StockPanel
      currentIp={status.ip!}
      allowedIps={status.allowedIps}
      onAddIp={(ip) => addIpMutation.mutate(ip)}
      onRemoveIp={(ip) => removeIpMutation.mutate(ip)}
      addingIp={addIpMutation.isPending}
    />
  );
}

function GateCard({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
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

function StockPanel({
  currentIp,
  allowedIps,
  onAddIp,
  onRemoveIp,
  addingIp,
}: {
  currentIp: string;
  allowedIps: string[];
  onAddIp: (ip?: string) => void;
  onRemoveIp: (ip: string) => void;
  addingIp: boolean;
}) {
  const listFn = useServerFn(listStock);
  const saveFn = useServerFn(updateStockItem);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newIp, setNewIp] = useState("");
  const [edits, setEdits] = useState<Record<string, { stock?: number; price?: number; costPrice?: number }>>({});

  const stockQuery = useQuery({
    queryKey: ["stock-list"],
    queryFn: () => listFn(),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (input: { id: string; stock?: number; price?: number; costPrice?: number }) =>
      saveFn({ data: input }),
    onSuccess: (_r, v) => {
      toast.success("Alteração salva.");
      setEdits((e) => {
        const next = { ...e };
        delete next[v.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["stock-list"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const items = stockQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term),
    );
  }, [items, search]);

  const totals = useMemo(() => {
    let units = 0;
    let cost = 0;
    let revenue = 0;
    for (const p of items) {
      units += p.stock;
      cost += (p.cost_price ?? 0) * p.stock;
      revenue += (p.sale_price ?? p.price) * p.stock;
    }
    return { units, cost, revenue, skus: items.length };
  }, [items]);

  const setEdit = (id: string, field: "stock" | "price" | "costPrice", value: string) => {
    const num = Number(value.replace(",", "."));
    if (Number.isNaN(num)) return;
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: num } }));
  };

  const rowValue = (p: StockItem, field: "stock" | "price" | "costPrice") => {
    const edited = edits[p.id]?.[field];
    if (edited != null) return String(edited).replace(".", ",");
    if (field === "stock") return String(p.stock);
    if (field === "price") return String(p.price).replace(".", ",");
    return p.cost_price != null ? String(p.cost_price).replace(".", ",") : "";
  };

  const isDirty = (id: string) => edits[id] != null && Object.keys(edits[id]!).length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Acesso autorizado · IP {currentIp}</p>
          <h1 className="mt-2 font-display text-4xl">Estoque</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-gold" />
          Protegido por IP + administrador
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Produtos" value={String(totals.skus)} />
        <Stat label="Unidades" value={String(totals.units)} />
        <Stat label="Custo total" value={brl(totals.cost)} />
        <Stat label="Venda potencial" value={brl(totals.revenue)} />
      </div>

      <details className="mt-8 border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">IPs autorizados</summary>
        <ul className="mt-3 space-y-2 text-sm">
          {allowedIps.map((ip) => (
            <li key={ip} className="flex items-center justify-between gap-3">
              <span>
                {ip} {ip === currentIp && <span className="text-xs text-gold">(este dispositivo)</span>}
              </span>
              {allowedIps.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remover IP ${ip}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveIp(ip)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="Adicionar IP (ex.: 187.44.10.25)"
            className="max-w-xs"
          />
          <Button
            variant="outlineInk"
            size="sm"
            disabled={addingIp || newIp.trim().length < 3}
            onClick={() => {
              onAddIp(newIp.trim());
              setNewIp("");
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </details>

      <div className="mt-8">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou SKU…"
          className="max-w-sm"
        />
      </div>

      {stockQuery.isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stockQuery.isError ? (
        <p className="py-20 text-center text-sm text-destructive">{stockQuery.error.message}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
                <th className="py-3 pr-3">Produto</th>
                <th className="py-3 pr-3">Estoque</th>
                <th className="py-3 pr-3">Custo</th>
                <th className="py-3 pr-3">Sugerido (+40%)</th>
                <th className="py-3 pr-3">Preço de venda</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image_url ?? placeholder}
                        alt={p.name}
                        width={44}
                        height={44}
                        loading="lazy"
                        className="h-11 w-11 object-cover"
                      />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <Input
                      value={rowValue(p, "stock")}
                      inputMode="numeric"
                      className="h-8 w-20"
                      onChange={(e) => setEdit(p.id, "stock", e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <Input
                      value={rowValue(p, "costPrice")}
                      inputMode="decimal"
                      placeholder="—"
                      className="h-8 w-24"
                      onChange={(e) => setEdit(p.id, "costPrice", e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {(() => {
                      const cost = edits[p.id]?.costPrice ?? p.cost_price;
                      return cost != null ? brl(Math.round(cost * 1.4 * 100) / 100) : "—";
                    })()}
                  </td>
                  <td className="py-3 pr-3">
                    <Input
                      value={rowValue(p, "price")}
                      inputMode="decimal"
                      className="h-8 w-24"
                      onChange={(e) => setEdit(p.id, "price", e.target.value)}
                    />
                  </td>
                  <td className="py-3 text-right">
                    {isDirty(p.id) && (
                      <Button
                        variant="gold"
                        size="sm"
                        disabled={saveMutation.isPending}
                        onClick={() =>
                          saveMutation.mutate({ id: p.id, ...edits[p.id] })
                        }
                      >
                        Salvar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card px-4 py-3">
      <p className="text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}
