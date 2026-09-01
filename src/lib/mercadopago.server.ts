const MP_API = "https://api.mercadopago.com";

function ensureToken() {
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("Pagamento indisponível no momento.");
  return token;
}

function ensurePublicKey() {
  const key = process.env["MERCADOPAGO_PUBLIC_KEY"];
  if (!key) throw new Error("Pagamento indisponível no momento.");
  return key;
}

export function docType(document: string) {
  return document.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" ") || (parts[0] ?? ""),
  };
}

export async function createCardToken(card: {
  number: string;
  exp: string;
  cvv: string;
  holder: string;
}, document: string) {
  const digits = card.exp.replace(/\D/g, "");
  const month = Number(digits.slice(0, 2));
  const yearRaw = digits.slice(2);
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const res = await fetch(`${MP_API}/v1/card_tokens?public_key=${encodeURIComponent(ensurePublicKey())}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card_number: card.number.replace(/\D/g, ""),
      security_code: card.cvv.replace(/\D/g, ""),
      expiration_month: month,
      expiration_year: year,
      cardholder: {
        name: card.holder,
        identification: { type: docType(document), number: document.replace(/\D/g, "") },
      },
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok || !json.id) {
    throw new Error("Não foi possível validar os dados do cartão.");
  }
  return json.id;
}

export type PaymentResult = {
  id: string;
  status: string;
  status_detail: string;
  pix?: {
    qr_code: string | null;
    qr_code_base64: string | null;
    ticket_url: string | null;
    expires_at: string | null;
  };
};

export async function createMercadoPagoPayment(input: {
  amount: number;
  description: string;
  externalReference: string;
  notificationUrl?: string | undefined;
  payer: { email: string; name: string; document: string };
  method: "pix" | "card";
  cardToken?: string | undefined;
  installments?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}): Promise<PaymentResult> {
  const { first_name, last_name } = splitName(input.payer.name);
  const body: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description,
    external_reference: input.externalReference,
    payer: {
      email: input.payer.email,
      first_name,
      last_name,
      identification: {
        type: docType(input.payer.document),
        number: input.payer.document.replace(/\D/g, ""),
      },
    },
    metadata: input.metadata ?? {},
  };
  if (input.notificationUrl) body["notification_url"] = input.notificationUrl;
  if (input.method === "pix") {
    body["payment_method_id"] = "pix";
  } else {
    body["token"] = input.cardToken;
    body["installments"] = input.installments ?? 1;
  }

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ensureToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    id?: number | string;
    status?: string;
    status_detail?: string;
    message?: string;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
        expiration_date?: string;
      };
    };
    date_of_expiration?: string;
  };
  if (!res.ok || !json.id) {
    console.error("mercadopago payment error", res.status, json.message);
    throw new Error("Não foi possível processar o pagamento.");
  }
  const td = json.point_of_interaction?.transaction_data;
  return {
    id: String(json.id),
    status: json.status ?? "pending",
    status_detail: json.status_detail ?? "",
    ...(input.method === "pix"
      ? {
          pix: {
            qr_code: td?.qr_code ?? null,
            qr_code_base64: td?.qr_code_base64 ?? null,
            ticket_url: td?.ticket_url ?? null,
            expires_at: json.date_of_expiration ?? td?.expiration_date ?? null,
          },
        }
      : {}),
  };
}

export async function getMercadoPagoPayment(paymentId: string) {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${ensureToken()}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    id: number | string;
    status: string;
    status_detail?: string;
    external_reference?: string;
    metadata?: Record<string, unknown>;
  };
}
