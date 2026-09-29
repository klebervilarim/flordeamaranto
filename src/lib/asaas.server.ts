import { documentDigits } from "./brazil-document";

function baseUrl() {
  return process.env["ASAAS_ENV"] === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

function ensureKey() {
  const key = process.env["ASAAS_API_KEY"];
  if (!key) throw new Error("Pagamento indisponível no momento.");
  return key;
}

async function asaas<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      access_token: ensureKey(),
      "Content-Type": "application/json",
      "User-Agent": "flordeamaranto",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    errors?: Array<{ code?: string; description?: string }>;
  };
  if (!res.ok) {
    console.error("asaas error", path, res.status, json.errors);
    const desc = json.errors?.[0]?.description;
    throw new Error(desc || "Não foi possível processar o pagamento.");
  }
  return json;
}

export async function findOrCreateCustomer(input: {
  name: string;
  email: string;
  document: string;
  phone?: string | undefined;
}) {
  const cpfCnpj = documentDigits(input.document);
  const found = await asaas<{ data: Array<{ id: string }> }>(
    `/customers?cpfCnpj=${cpfCnpj}&limit=1`,
  );
  if (found.data?.[0]?.id) return found.data[0].id;
  const phone = input.phone?.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  const created = await asaas<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj,
      ...(phone ? { mobilePhone: phone } : {}),
      notificationDisabled: true,
    }),
  });
  return created.id;
}

export type AsaasPayment = {
  id: string;
  status: string;
  externalReference?: string | null;
};

function today() {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
}

export async function createPixPayment(input: {
  customer: string;
  amount: number;
  description: string;
  externalReference: string;
}) {
  const payment = await asaas<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: "PIX",
      value: Number(input.amount.toFixed(2)),
      dueDate: today(),
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
  const qr = await asaas<{ encodedImage: string; payload: string; expirationDate?: string }>(
    `/payments/${payment.id}/pixQrCode`,
  );
  return {
    payment,
    pix: {
      qr_code: qr.payload ?? null,
      qr_code_base64: qr.encodedImage ?? null,
      ticket_url: null,
      expires_at: qr.expirationDate ? new Date(qr.expirationDate.replace(" ", "T") + "-03:00").toISOString() : null,
    },
  };
}

export async function createCardPayment(input: {
  customer: string;
  amount: number;
  installments: number;
  description: string;
  externalReference: string;
  remoteIp: string;
  card: { holder: string; number: string; exp: string; cvv: string };
  holderInfo: {
    name: string;
    email: string;
    document: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}) {
  const [month, yearRaw] = input.card.exp.split("/");
  const year = (yearRaw ?? "").length === 2 ? `20${yearRaw}` : (yearRaw ?? "");
  const value = Number(input.amount.toFixed(2));
  const body: Record<string, unknown> = {
    customer: input.customer,
    billingType: "CREDIT_CARD",
    dueDate: today(),
    description: input.description,
    externalReference: input.externalReference,
    remoteIp: input.remoteIp,
    creditCard: {
      holderName: input.card.holder,
      number: input.card.number.replace(/\D/g, ""),
      expiryMonth: month,
      expiryYear: year,
      ccv: input.card.cvv.replace(/\D/g, ""),
    },
    creditCardHolderInfo: {
      name: input.holderInfo.name,
      email: input.holderInfo.email,
      cpfCnpj: documentDigits(input.holderInfo.document),
      postalCode: input.holderInfo.postalCode.replace(/\D/g, ""),
      addressNumber: input.holderInfo.addressNumber || "0",
      phone: input.holderInfo.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""),
    },
  };
  if (input.installments > 1) {
    body["installmentCount"] = input.installments;
    body["totalValue"] = value;
  } else {
    body["value"] = value;
  }
  return asaas<AsaasPayment>("/payments", { method: "POST", body: JSON.stringify(body) });
}

export async function getAsaasPayment(id: string) {
  try {
    return await asaas<AsaasPayment>(`/payments/${id}`);
  } catch {
    return null;
  }
}

export function isAsaasPaid(status: string) {
  return status === "CONFIRMED" || status === "RECEIVED" || status === "RECEIVED_IN_CASH";
}

export function isAsaasFailed(status: string) {
  return ["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "OVERDUE"].includes(status);
}
