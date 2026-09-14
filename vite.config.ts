// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Loads all env vars into process.env for server-side code only
// (server routes/functions need non-VITE_ vars like LOVABLE_API_KEY).
// Never expose these via `define` — that would leak secrets to the client.
Object.assign(process.env, loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""));

export default defineConfig({
  vite: {
    // These are public browser credentials (not privileged secrets). Keeping a
    // build-time fallback prevents a blank app if managed VITE_* injection is
    // temporarily unavailable during a preview or production deployment.
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        "https://fcnzicahwgcznnleqrow.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        "sb_publishable_aqeAqIAVx6H0Yy2o36wLkA_k_D92DBu",
      ),
    },
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(
          __dirname,
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          __dirname,
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
