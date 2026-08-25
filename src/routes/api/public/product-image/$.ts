import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/product-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat ?? "";
        if (!key || key.includes("..") || !/^[\w./-]+$/.test(key)) {
          return new Response("Not found", { status: 404 });
        }
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.storage.from("product-images").download(key);
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
