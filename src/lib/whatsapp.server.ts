export type WhatsAppConfig = {
  api_base_url: string;
  instance_token: string;
  client_token: string | null;
};

export async function getActiveWhatsAppConfig(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
): Promise<WhatsAppConfig | null> {
  const { data } = await supabaseAdmin
    .from("whatsapp_api_configs")
    .select("api_base_url, instance_token, client_token")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function toWhatsAppNumber(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return digits;
}

function authHeaderVariants(config: WhatsAppConfig): Record<string, string>[] {
  const base: Record<string, string>[] = [
    { token: config.instance_token },
    { Token: config.instance_token },
    { Authorization: `Bearer ${config.instance_token}` },
    { "x-api-token": config.instance_token },
  ];
  if (config.client_token) {
    return [...base.map((h) => ({ ...h, "client-token": config.client_token as string })), ...base];
  }
  return base;
}

async function callUazapi(
  config: WhatsAppConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const url = `${normalizeBaseUrl(config.api_base_url)}${path}`;
  let last: { ok: boolean; status: number; json: Record<string, unknown> } = {
    ok: false,
    status: 0,
    json: {},
  };
  for (const headers of authHeaderVariants(config)) {
    try {
      const res = await fetch(url, {
        method: init.method,
        headers: { "Content-Type": "application/json", ...headers },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      last = { ok: res.ok, status: res.status, json };
      if (res.ok) return last;
    } catch {
      // tenta a próxima variante de header
    }
  }
  return last;
}

function isInvalidToken(result: { status: number; json: Record<string, unknown> }) {
  const message = JSON.stringify(result.json).toLowerCase();
  return (
    result.status === 401 || message.includes("invalid token") || message.includes("token inválido")
  );
}

export async function sendWhatsAppText(
  config: WhatsAppConfig,
  phone: string,
  text: string,
): Promise<{ success: boolean; message: string }> {
  const number = toWhatsAppNumber(phone);
  if (!number) return { success: false, message: "Telefone inválido." };

  for (const path of ["/send/text", "/message/send-text"]) {
    const result = await callUazapi(config, path, { method: "POST", body: { number, text } });
    if (result.ok) return { success: true, message: "Mensagem enviada." };
    if (isInvalidToken(result)) {
      return {
        success: false,
        message: "Token da instância inválido ou expirado. Atualize o token nas configurações.",
      };
    }
  }
  return { success: false, message: "Não foi possível enviar a mensagem no WhatsApp." };
}

export async function testWhatsAppConnection(
  config: WhatsAppConfig,
): Promise<{ success: boolean; message: string }> {
  const result = await callUazapi(config, "/instance/status", { method: "GET" });
  if (isInvalidToken(result)) {
    return {
      success: false,
      message: "Token da instância inválido ou expirado. Atualize o token nas configurações.",
    };
  }
  const data = result.json as {
    connected?: boolean;
    status?: { connected?: boolean; loggedIn?: boolean };
    instance?: { status?: string };
  };
  const connected =
    data.connected === true ||
    data.status?.connected === true ||
    data.status?.loggedIn === true ||
    data.instance?.status === "connected";
  if (result.ok && connected) return { success: true, message: "Instância conectada." };
  if (result.ok) return { success: false, message: "Instância encontrada, mas não conectada." };
  return { success: false, message: "Não foi possível conectar à API do WhatsApp." };
}
