import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { brl } from "@/lib/format";
import { validateCoupon } from "@/lib/coupons.functions";

/** Campo de cupom de desconto (usado na sacola e no checkout). */
export function CouponInput() {
  const { coupon, setCoupon, discount, subtotal } = useCart();
  const applyFn = useServerFn(validateCoupon);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await applyFn({ data: { code: code.trim(), subtotal } });
      if (res.ok) {
        setCoupon({ code: res.code, type: res.type, value: res.value, minOrder: res.minOrder });
        setCode("");
        toast.success(`Cupom ${res.code} aplicado!`);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Não foi possível validar o cupom. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (coupon) {
    return (
      <div>
        <Label className="text-xs tracking-[0.12em] uppercase">Cupom de desconto</Label>
        <div className="mt-2 flex items-center justify-between gap-3 border border-gold/40 bg-gold/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-gold" />
            <div>
              <p className="font-mono text-sm">{coupon.code}</p>
              <p className="text-xs text-muted-foreground">-{brl(discount)}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Remover cupom"
            onClick={() => setCoupon(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="coupon-code" className="text-xs tracking-[0.12em] uppercase">
        Cupom de desconto
      </Label>
      <div className="mt-2 flex gap-2">
        <Input
          id="coupon-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder="BEMVINDO5"
          className="font-mono"
        />
        <Button
          type="button"
          variant="gold"
          disabled={loading || !code.trim()}
          onClick={() => void apply()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
