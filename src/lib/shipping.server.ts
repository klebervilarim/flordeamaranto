import type { ShippingOption, ShippingQuote } from "./shipping";
import { FREE_SHIPPING_OVER } from "./shipping";

// CEP de origem padrão (Av. Paulista, SP). Pode ser alterado na tabela
// admin_settings, chave "shipping_origin_cep".
const DEFAULT_ORIGIN_CEP = "01310100";

type Region = "local" | "sudeste" | "sul" | "centro-oeste" | "nordeste" | "norte";

const UF_REGION: Record<string, Exclude<Region, "local">> = {
  SP: "sudeste",
  RJ: "sudeste",
  MG: "sudeste",
  ES: "sudeste",
  PR: "sul",
  SC: "sul",
  RS: "sul",
  DF: "centro-oeste",
  GO: "centro-oeste",
  MT: "centro-oeste",
  MS: "centro-oeste",
  TO: "centro-oeste",
  BA: "nordeste",
  SE: "nordeste",
  AL: "nordeste",
  PE: "nordeste",
  PB: "nordeste",
  RN: "nordeste",
  CE: "nordeste",
  PI: "nordeste",
  MA: "nordeste",
  PA: "norte",
  AP: "norte",
  AM: "norte",
  RR: "norte",
  RO: "norte",
  AC: "norte",
};

// Valores-base estimados dos Correios (origem SP) + adicional por kg extra.
const TABLE: Record<
  Region,
  { pac: [number, string]; sedex: [number, string]; perKgPac: number; perKgSedex: number }
> = {
  local: {
    pac: [16.9, "até 3 dias úteis"],
    sedex: [21.9, "1 dia útil"],
    perKgPac: 3,
    perKgSedex: 4.5,
  },
  sudeste: {
    pac: [22.9, "2 a 5 dias úteis"],
    sedex: [27.9, "1 a 2 dias úteis"],
    perKgPac: 4.5,
    perKgSedex: 6.5,
  },
  sul: {
    pac: [26.9, "3 a 6 dias úteis"],
    sedex: [33.9, "2 a 3 dias úteis"],
    perKgPac: 5.5,
    perKgSedex: 8,
  },
  "centro-oeste": {
    pac: [28.9, "4 a 7 dias úteis"],
    sedex: [36.9, "2 a 4 dias úteis"],
    perKgPac: 6,
    perKgSedex: 9,
  },
  nordeste: {
    pac: [31.9, "5 a 9 dias úteis"],
    sedex: [41.9, "3 a 5 dias úteis"],
    perKgPac: 7,
    perKgSedex: 10.5,
  },
  norte: {
    pac: [36.9, "7 a 12 dias úteis"],
    sedex: [49.9, "4 a 7 dias úteis"],
    perKgPac: 8.5,
    perKgSedex: 12,
  },
};

function ufFromCepPrefix(cep: string): string | null {
  const p = Number(cep.slice(0, 3));
  const p2 = Number(cep.slice(0, 2));
  if (p2 >= 1 && p2 <= 19) return "SP";
  if (p2 >= 20 && p2 <= 28) return "RJ";
  if (p2 === 29) return "ES";
  if (p2 >= 30 && p2 <= 39) return "MG";
  if (p2 >= 40 && p2 <= 48) return "BA";
  if (p2 === 49) return "SE";
  if (p2 >= 50 && p2 <= 56) return "PE";
  if (p2 === 57) return "AL";
  if (p2 === 58) return "PB";
  if (p2 === 59) return "RN";
  if (p2 >= 60 && p2 <= 63) return "CE";
  if (p2 === 64) return "PI";
  if (p2 === 65) return "MA";
  if (p2 >= 66 && p2 <= 68) return p === 689 ? "AP" : "PA";
  if (p2 === 69) {
    if (p === 693) return "RR";
    if (p === 699) return "AC";
    return "AM";
  }
  if (p >= 700 && p <= 736) return p >= 728 && p <= 729 ? "GO" : "DF";
  if (p >= 737 && p <= 767) return "GO";
  if (p === 768 || p === 769) return "RO";
  if (p2 === 77) return "TO";
  if (p2 === 78) return "MT";
  if (p2 === 79) return "MS";
  if (p2 >= 80 && p2 <= 87) return "PR";
  if (p2 >= 88 && p2 <= 89) return "SC";
  if (p2 >= 90 && p2 <= 99) return "RS";
  return null;
}

async function getOriginCep(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "shipping_origin_cep")
      .maybeSingle();
    const raw = typeof data?.value === "string" ? data.value.replace(/\D/g, "") : "";
    if (/^\d{8}$/.test(raw)) return raw;
  } catch {
    /* fallback */
  }
  return DEFAULT_ORIGIN_CEP;
}

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function quoteForCep(
  cep: string,
  weightG: number,
  subtotal: number,
): Promise<ShippingQuote> {
  const digits = cep.replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) {
    return { ok: false, error: "CEP inválido. Informe os 8 dígitos." };
  }

  let via: ViaCepResponse;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(8000),
    });
    via = (await res.json()) as ViaCepResponse;
  } catch {
    return { ok: false, error: "Não foi possível consultar o CEP. Tente novamente." };
  }
  if (via.erro || !via.uf) {
    return { ok: false, error: "CEP não encontrado. Confira os números." };
  }

  const originCep = await getOriginCep();
  const originUf = ufFromCepPrefix(originCep) ?? "SP";
  const region: Region =
    via.uf === originUf ? "local" : (UF_REGION[via.uf] ?? "sudeste");
  const t = TABLE[region];

  const kg = Math.max(1, Math.ceil(weightG / 1000));
  const round = (n: number) => Math.round(n * 100) / 100;
  const free = subtotal >= FREE_SHIPPING_OVER;

  const options: ShippingOption[] = [
    {
      id: "pac",
      name: "PAC — Correios",
      eta: t.pac[1],
      price: free ? 0 : round(t.pac[0] + t.perKgPac * (kg - 1)),
    },
    {
      id: "sedex",
      name: "SEDEX — Correios",
      eta: t.sedex[1],
      price: round(t.sedex[0] + t.perKgSedex * (kg - 1)),
    },
  ];

  return {
    ok: true,
    cep: digits,
    address: {
      street: via.logradouro ?? "",
      district: via.bairro ?? "",
      city: via.localidade ?? "",
      state: via.uf ?? "",
    },
    options,
  };
}
