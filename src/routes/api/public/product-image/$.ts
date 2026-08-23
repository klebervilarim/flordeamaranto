import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/product-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat ?? "";
        if (!key || key.includes("..") || !/^[\w./-]+$/.test(key)) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("product-images").download(key);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "content-type": data.type || "image/jpeg",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
