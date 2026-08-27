// One-off script: uploads the background-removed product photos generated in
// nobg-generated/ to Supabase Storage and updates each product's image_url.
// Run locally with: node .catalogo-work/upload-nobg-images.mjs
// You'll be prompted for your admin login — it is only used to sign in to
// Supabase from your machine and is never sent anywhere else.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  const text = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=["']?(.*?)["']?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);

  const rl = createInterface({ input: stdin, output: stdout });
  const email = await rl.question("Email de admin: ");
  const password = await rl.question("Senha: ");
  rl.close();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) {
    console.error("Falha no login:", authError?.message);
    process.exit(1);
  }
  console.log("Logado como", authData.user.email);

  const manifest = JSON.parse(readFileSync(path.join(__dirname, "nobg-generated-manifest.json"), "utf8"));
  console.log(`Processando ${manifest.length} imagens...`);

  let ok = 0;
  let failed = [];
  for (const [i, item] of manifest.entries()) {
    const filePath = path.join(__dirname, "nobg-generated", item.output_file);
    const buffer = readFileSync(filePath);
    const key = `${item.id}/${Date.now()}-nobg.png`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(key, buffer, { contentType: "image/png", upsert: true });
    if (uploadError) {
      failed.push({ ...item, error: uploadError.message });
      continue;
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: `/api/public/product-image/${key}` })
      .eq("id", item.id);
    if (updateError) {
      failed.push({ ...item, error: updateError.message });
      continue;
    }

    ok++;
    if ((i + 1) % 10 === 0 || i === manifest.length - 1) {
      console.log(`[${i + 1}/${manifest.length}] ok=${ok} falhas=${failed.length}`);
    }
  }

  console.log(`\nConcluído. ok=${ok} falhas=${failed.length}`);
  if (failed.length > 0) {
    console.log("Falhas:", JSON.stringify(failed, null, 1));
  }
}

main();
