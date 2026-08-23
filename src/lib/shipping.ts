// Tipos e helpers de frete (seguros para o cliente)
export type ShippingOption = {
  id: "pac" | "sedex";
  name: string;
  eta: string;
  price: number;
};

export type ShippingAddress = {
  street: string;
  district: string;
  city: string;
  state: string;
};

export type ShippingQuoteOk = {
  ok: true;
  cep: string;
  address: ShippingAddress;
  options: ShippingOption[];
};

export type ShippingQuoteErr = { ok: false; error: string };

export type ShippingQuote = ShippingQuoteOk | ShippingQuoteErr;

export const FREE_SHIPPING_OVER = 399;

/** Estimativa de peso por item (perfume/cosmético + embalagem), em gramas. */
export const ITEM_WEIGHT_G = 400;

export function maskCep(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function cepDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}
