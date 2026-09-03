import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./stock.server";

export type WhatsAppConfigView = {
  id: string;
  api_base_url: string;
  instance_name: string | null;
  client_token: string | null;
  is_active: boolean;
  hasToken: boolean;
  tokenPreview: string | null;
};

export const getWhatsAppConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhatsAppConfigView | null> => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("whatsapp_api_configs")
      .select("id, api_base_url, instance_name, instance_token, client_token, is_active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      api_base_url: data.api_base_url,
      instance_name: data.instance_name,
      client_token: data.client_token,
      is_active: data.is_active,
      hasToken: Boolean(data.instance_token),
      tokenPreview: data.instance_token ? `••••${data.instance_token.slice(-4)}` : null,
    };
  });

const saveSchema = z.object({
  apiBaseUrl: z.string().trim().min(1).max(300),
  instanceName: z.string().trim().max(120).nullable(),
  instanceToken: z.string().trim().max(300).optional(),
  clientToken: z.string().trim().max(300).nullable(),
  isActive: z.boolean(),
});

export const saveWhatsAppConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: existing } = await context.supabase
      .from("whatsapp_api_configs")
      .select("id, instance_token")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const token = data.instanceToken?.trim() || existing?.instance_token;
    if (!token) return { ok: false as const, error: "Informe o token da instância." };

    if (existing) {
      const { error } = await context.supabase
        .from("whatsapp_api_configs")
        .update({
          api_base_url: data.apiBaseUrl,
          instance_name: data.instanceName,
          instance_token: token,
          client_token: data.clientToken,
          is_active: data.isActive,
        })
        .eq("id", existing.id);
      if (error) return { ok: false as const, error: "Falha ao salvar a configuração." };
    } else {
      const { error } = await context.supabase.from("whatsapp_api_configs").insert({
        api_base_url: data.apiBaseUrl,
        instance_name: data.instanceName,
        instance_token: token,
        client_token: data.clientToken,
        is_active: data.isActive,
        created_by: context.userId,
      });
      if (error) return { ok: false as const, error: "Falha ao salvar a configuração." };
    }
    return { ok: true as const };
  });

export const testWhatsAppConnectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("whatsapp_api_configs")
      .select("api_base_url, instance_token, client_token")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { success: false, message: "Nenhuma configuração ativa." };

    const { testWhatsAppConnection } = await import("./whatsapp.server");
    return await testWhatsAppConnection(data);
  });
