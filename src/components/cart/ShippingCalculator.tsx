import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/hooks/useCart";
import { brl } from "@/lib/format";
import { quoteShipping } from "@/lib/shipping.functions";
import {
  cepDigits,
  maskCep,
  ITEM_WEIGHT_G,
  type ShippingOption,
  type ShippingQuoteOk,
} from "@/lib/shipping";

/** Hook compartilhado: cota frete pelos Correios a partir do CEP (8 dígitos). */
export function useShippingQuote() {
  const { lines, subtotal } = useCart();
  const quoteFn = useServerFn(quoteShipping);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShippingQuoteOk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quote = useCallback(
    async (digits: string): Promise<ShippingQuoteOk | null> => {
      if (digits.length !== 8) return null;
      setLoading(true);
      setError(null);
      try {
        const weight =
          lines.reduce((sum, l) => sum + l.quantity, 0) * ITEM_WEIGHT_G || ITEM_WEIGHT_G;
        const res = await quoteFn({ data: { cep: digits, weight_g: weight, subtotal } });
        if (res.ok) {
          setResult(res);
          return res;
        }
        setResult(null);
        setError(res.error);
        return null;
      } catch {
        setResult(null);
        setError("Não foi possível calcular o frete. Tente novamente.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [lines, subtotal, quoteFn],
  );

  return { quote, loading, result, error };
}

export function ShippingOptions({
  options,
  selectedId,
  onSelect,
}: {
  options: ShippingOption[];
  selectedId: string | undefined;
  onSelect: (option: ShippingOption) => void;
}) {
  return (
    <RadioGroup
      value={selectedId ?? ""}
      onValueChange={(id) => {
        const opt = options.find((o) => o.id === id);
        if (opt) onSelect(opt);
      }}
      className="space-y-2"
    >
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-3 border border-border px-4 py-3">
          <RadioGroupItem value={opt.id} id={`ship-${opt.id}`} />
          <Label
            htmlFor={`ship-${opt.id}`}
            className="flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm font-normal"
          >
            <span>
              {opt.name}
              <span className="block text-xs text-muted-foreground">{opt.eta}</span>
            </span>
            <span className="font-medium">
              {opt.price === 0 ? "Grátis" : brl(opt.price)}
            </span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

/** Campo de CEP com cálculo automático de frete (usado na sacola). */
export function ShippingCalculator() {
  const { shipping, setShipping } = useCart();
  const { quote, loading, result, error } = useShippingQuote();
  const [cep, setCep] = useState(shipping?.cep ? maskCep(shipping.cep) : "");

  const handleChange = (value: string) => {
    const masked = maskCep(value);
    setCep(masked);
    const digits = cepDigits(masked);
    if (digits.length === 8) {
      void quote(digits).then((res) => {
        if (res && res.options.length > 0) {
          const cheapest = res.options.reduce((a, b) => (a.price <= b.price ? a : b));
          setShipping({ cep: digits, ...cheapest });
        }
      });
    }
  };

  return (
    <div>
      <Label htmlFor="shipping-cep" className="text-xs tracking-[0.12em] uppercase">
        Calcular frete
      </Label>
      <div className="relative mt-2">
        <Input
          id="shipping-cep"
          inputMode="numeric"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => handleChange(e.target.value)}
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Truck className="h-4 w-4" />
          )}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {result && (
        <div className="mt-3">
          {result.address.city && (
            <p className="mb-2 text-xs text-muted-foreground">
              Entrega em {result.address.city} — {result.address.state}
            </p>
          )}
          <ShippingOptions
            options={result.options}
            selectedId={shipping?.cep === result.cep ? shipping.id : undefined}
            onSelect={(opt) => setShipping({ cep: result.cep, ...opt })}
          />
        </div>
      )}
    </div>
  );
}
