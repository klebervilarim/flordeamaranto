import { getRequest } from "@tanstack/react-start/server";

type SupabaseLike = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export function getClientIp(): string {
  try {
    const req = getRequest();
    const cf = req.headers.get("cf-connecting-ip");
    if (cf) return cf.trim();
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    return "desconhecido";
  } catch {
    return "desconhecido";
  }
}

export async function callerIsAdmin(supabase: SupabaseLike, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return Boolean(data);
}

export async function adminCount(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export async function readAllowedIps(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_settings")
    .select("value")
    .eq("key", "stock_allowed_ips")
    .maybeSingle();
  const v = data?.value;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export async function writeAllowedIps(ips: string[]): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("admin_settings")
    .upsert({ key: "stock_allowed_ips", value: ips, updated_at: new Date().toISOString() });
  if (error) throw new Error("Falha ao salvar lista de IPs.");
}

/** Garante: usuário é admin E o IP da requisição está na lista autorizada. */
export async function assertStockAccess(
  supabase: SupabaseLike,
  userId: string,
): Promise<{ ip: string }> {
  const admin = await callerIsAdmin(supabase, userId);
  if (!admin) throw new Error("Acesso restrito a administradores.");
  const ip = getClientIp();
  const ips = await readAllowedIps();
  if (!ips.includes(ip)) throw new Error(`IP não autorizado: ${ip}`);
  return { ip };
}
