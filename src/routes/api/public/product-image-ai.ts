import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/product-image-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
        if (!token) return Response.json({ message: "Entre na sua conta para gerar imagens." }, { status: 401 });
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return Response.json({ message: "Não foi possível verificar seu acesso." }, { status: 500 });
        const { createClient } = await import("@supabase/supabase-js");
        const userClient = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            headers.set("apikey", key);
            return fetch(input, { ...init, headers });
          } },
        });
        const { data: auth, error: authError } = await userClient.auth.getUser(token);
        if (authError || !auth.user) return Response.json({ message: "Sua sessão expirou. Entre novamente." }, { status: 401 });
        const { data: admin, error: roleError } = await userClient.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
        if (roleError || !admin) return Response.json({ message: "Acesso restrito a administradores." }, { status: 403 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ message: "A IA de imagens ainda não está configurada." }, { status: 500 });
        try {
          const form = await request.formData();
          const { productImageInputSchema, productImagePrompt } = await import("@/lib/product-image-prompt");
          const parsed = productImageInputSchema.safeParse(Object.fromEntries(["productId", "name", "brand", "volume", "productType", "instructions"].map(k => [k, form.get(k) ?? ""])));
          if (!parsed.success) return Response.json({ message: "Confira o nome e os dados do perfume." }, { status: 400 });
          const images = form.getAll("image[]");
          if (images.length < 1 || images.length > 2 || images.some(file => !(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 6 * 1024 * 1024)) {
            return Response.json({ message: "Envie até duas imagens JPG, PNG ou WebP de até 6 MB cada." }, { status: 400 });
          }
          const { data: product, error } = await userClient.from("products").select("id").eq("id", parsed.data.productId).maybeSingle();
          if (error || !product) return Response.json({ message: "Produto não encontrado." }, { status: 404 });
          const upstreamForm = new FormData();
          images.forEach(image => upstreamForm.append("image[]", image));
          upstreamForm.set("prompt", productImagePrompt(parsed.data, images.length === 2));
          upstreamForm.set("stream", form.get("stream") === "false" ? "false" : "true");
          upstreamForm.set("size", "1024x1024");
          upstreamForm.set("quality", "medium");
          const { editImage, imageSettings } = await import("@/lib/image-gateway.server");
          const upstream = await editImage({ ...imageSettings, apiKey }, upstreamForm);
          const headers = new Headers({ "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-cache, no-transform" });
          upstream.headers.forEach((value, name) => { if (name.toLowerCase().startsWith("x-lovable-aig-")) headers.set(name, value); });
          return new Response(upstream.body, { status: upstream.status, headers });
        } catch {
          return Response.json({ message: "Não foi possível iniciar a geração da imagem." }, { status: 500 });
        }
      },
    },
  },
});