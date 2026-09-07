import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Loader2, RefreshCw, Search, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StockGate } from "@/components/stock/StockGate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCoupon,
  deleteCoupon,
  generateCouponCode,
  listCouponsAdmin,
  setCouponActive,
  updateCoupon,
  type CouponRow,
} from "@/lib/coupons.functions";

export const Route = createFileRoute("/estoque/cupons")({
  head: () => ({
    meta: [
      { title: "Cupons de desconto — Flor de Amaranto" },
      {
        name: "description",
        content: "Gestão de cupons de desconto restrita da Flor de Amaranto.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CuponsPage,
});

function CuponsPage() {
  return (
    <StockGate>
      <CuponsPanel />
    </StockGate>
  );
}

type StatusFilter = "all" | "active" | "inactive" | "expired";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Todos",
  active: "Ativos",
  inactive: "Inativos",
  expired: "Expirados",
};

function couponStatus(c: CouponRow): "active" | "inactive" | "expired" {
  if (c.ends_at && new Date(c.ends_at) < new Date()) return "expired";
  return c.active ? "active" : "inactive";
}

function StatusBadge({ status }: { status: "active" | "inactive" | "expired" }) {
  const dot =
    status === "active"
      ? "bg-emerald"
      : status === "expired"
        ? "bg-destructive"
        : "bg-muted-foreground";
  const label = status === "active" ? "Ativo" : status === "expired" ? "Expirado" : "Inativo";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function formatDateBR(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

type FormState = {
  id: string | null;
  code: string;
  discountPercent: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

function emptyForm(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: null,
    code: "",
    discountPercent: "10",
    startsAt: today,
    endsAt: today,
    active: true,
  };
}

function CuponsPanel() {
  const listFn = useServerFn(listCouponsAdmin);
  const generateFn = useServerFn(generateCouponCode);
  const createFn = useServerFn(createCoupon);
  const updateFn = useServerFn(updateCoupon);
  const setActiveFn = useServerFn(setCouponActive);
  const deleteFn = useServerFn(deleteCoupon);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [generatingCode, setGeneratingCode] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  const couponsQuery = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => listFn(),
    retry: false,
  });

  const requestNewCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await generateFn();
      setForm((f) => ({ ...f, code: res.code }));
    } catch {
      toast.error("Não foi possível gerar o código.");
    } finally {
      setGeneratingCode(false);
    }
  };

  useEffect(() => {
    if (!form.id && !form.code) void requestNewCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id, form.code]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const discountPercent = Number(form.discountPercent);
      if (form.id) {
        await updateFn({
          data: {
            id: form.id,
            discountPercent,
            startsAt: form.startsAt,
            endsAt: form.endsAt,
            active: form.active,
          },
        });
        return { code: form.code };
      }
      const res = await createFn({
        data: {
          discountPercent,
          startsAt: form.startsAt,
          endsAt: form.endsAt,
          active: form.active,
        },
      });
      return { code: res.code };
    },
    onSuccess: ({ code }) => {
      toast.success("Cupom criado com sucesso!", {
        description: `O cupom ${code} está pronto para ser utilizado.`,
      });
      setForm(emptyForm());
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => setActiveFn({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cupom excluído.");
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const discountPercentNumber = Number(form.discountPercent);
  const formValid =
    Number.isFinite(discountPercentNumber) &&
    discountPercentNumber >= 1 &&
    discountPercentNumber <= 100 &&
    form.startsAt !== "" &&
    form.endsAt !== "" &&
    form.endsAt >= form.startsAt &&
    Boolean(form.code);

  const onEdit = (c: CouponRow) => {
    setForm({
      id: c.id,
      code: c.code,
      discountPercent: String(c.value),
      startsAt: toDateInputValue(c.starts_at),
      endsAt: toDateInputValue(c.ends_at),
      active: c.active,
    });
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado!");
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  };

  const coupons = couponsQuery.data ?? [];
  const filtered = coupons.filter((c) => {
    const status = couponStatus(c);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (search.trim() && !c.code.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (periodFrom && (!c.ends_at || toDateInputValue(c.ends_at) < periodFrom)) return false;
    if (periodTo && (!c.starts_at || toDateInputValue(c.starts_at) > periodTo)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow text-gold">Área do administrador</p>
      <h1 className="mt-2 font-display text-4xl">Cupons de desconto</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie um novo cupom promocional para seus clientes.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="border border-border bg-card p-6">
          <h2 className="font-display text-xl">{form.id ? "Editar cupom" : "Novo cupom"}</h2>

          <div className="mt-5">
            <Label className="text-xs tracking-[0.12em] uppercase">Código do cupom</Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={form.code}
                readOnly
                disabled={Boolean(form.id)}
                className="font-mono tracking-wide"
              />
              <Button
                type="button"
                variant="outlineInk"
                size="icon"
                disabled={Boolean(form.id) || generatingCode}
                onClick={() => void requestNewCode()}
                title="Gerar novo código"
              >
                {generatingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outlineInk"
                size="icon"
                disabled={!form.code}
                onClick={() => void copyCode(form.code)}
                title="Copiar código"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {form.id && (
              <p className="mt-1 text-xs text-muted-foreground">
                O código não pode ser alterado depois de criado.
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs tracking-[0.12em] uppercase">Desconto (%)</Label>
              <div className="relative mt-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="coupon-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))}
              />
              <Label htmlFor="coupon-active" className="text-sm font-normal">
                Cupom ativo
              </Label>
            </div>
            <div>
              <Label className="text-xs tracking-[0.12em] uppercase">Data de início</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs tracking-[0.12em] uppercase">Data de término</Label>
              <Input
                type="date"
                className="mt-2"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
              {form.endsAt < form.startsAt && (
                <p className="mt-1 text-xs text-destructive">
                  A data final não pode ser anterior à data inicial.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              type="button"
              variant="gold"
              disabled={!formValid || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending
                ? "Salvando…"
                : form.id
                  ? "Salvar alterações"
                  : "✨ Gerar Cupom"}
            </Button>
            {form.id && (
              <Button type="button" variant="outlineInk" onClick={() => setForm(emptyForm())}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <div className="h-fit border border-ink bg-ink p-6 text-background">
          <p className="eyebrow flex items-center gap-2 text-gold">
            <Ticket className="h-4 w-4" /> Seu cupom
          </p>
          <p className="mt-4 break-all font-mono text-lg tracking-wide text-gold">
            {form.code || "—"}
          </p>
          <p className="mt-3 font-display text-3xl">
            {Number.isFinite(discountPercentNumber) ? discountPercentNumber : 0}% OFF
          </p>
          <p className="mt-4 text-sm text-background/70">
            Válido de {form.startsAt ? formatDateBR(new Date(form.startsAt).toISOString()) : "—"}{" "}
            até {form.endsAt ? formatDateBR(new Date(form.endsAt).toISOString()) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl">Cupons cadastrados</h2>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="relative">
            <Label htmlFor="coupon-search" className="text-xs tracking-[0.12em] uppercase">
              Pesquisar por código
            </Label>
            <div className="relative mt-2">
              <Input
                id="coupon-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="FLORDEAMARANTO..."
                className="w-56 pr-9"
              />
              <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div>
            <Label className="text-xs tracking-[0.12em] uppercase">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="mt-2 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_FILTER_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs tracking-[0.12em] uppercase">Válido a partir de</Label>
            <Input
              type="date"
              className="mt-2"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs tracking-[0.12em] uppercase">Válido até</Label>
            <Input
              type="date"
              className="mt-2"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          {couponsQuery.isLoading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : couponsQuery.isError ? (
            <p className="py-16 text-center text-sm text-destructive">
              {couponsQuery.error.message}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nenhum cupom encontrado.
            </p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="py-3 pr-4">Código</th>
                  <th className="py-3 pr-4">Desconto</th>
                  <th className="py-3 pr-4">Início</th>
                  <th className="py-3 pr-4">Validade</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const status = couponStatus(c);
                  return (
                    <tr key={c.id} className="border-b border-border">
                      <td className="py-3 pr-4 font-mono">{c.code}</td>
                      <td className="py-3 pr-4">{c.value}%</td>
                      <td className="py-3 pr-4">{formatDateBR(c.starts_at)}</td>
                      <td className="py-3 pr-4">{formatDateBR(c.ends_at)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => void copyCode(c.code)}
                          >
                            Copiar
                          </button>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(c)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            disabled={toggleMutation.isPending}
                            onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                          >
                            {c.active ? "Desativar" : "Ativar"}
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="text-xs text-destructive hover:opacity-80"
                              >
                                Excluir
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cupom {c.code}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Essa ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
