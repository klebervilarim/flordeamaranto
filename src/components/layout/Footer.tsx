import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type FooterLink = { label: string; to: string; params?: { filtro: string } };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Perfumaria",
    links: [
      { label: "Todos os perfumes", to: "/perfumes" },
      { label: "Perfumes árabes", to: "/perfumes/$filtro", params: { filtro: "arabes" } },
      { label: "Perfumes de nicho", to: "/perfumes/$filtro", params: { filtro: "nicho" } },
      { label: "Importados", to: "/perfumes/$filtro", params: { filtro: "importados" } },
      { label: "Nacionais", to: "/perfumes/$filtro", params: { filtro: "nacionais" } },
    ],
  },
  {
    title: "Beleza",
    links: [
      { label: "Skincare", to: "/skincare" },
      { label: "Cosméticos", to: "/cosmeticos" },
      { label: "Maquiagem", to: "/maquiagem" },
      { label: "Corpo & Banho", to: "/corpo-e-banho" },
    ],
  },
  {
    title: "Descubra",
    links: [
      { label: "Coleções", to: "/colecoes" },
      { label: "Marcas", to: "/marcas" },
      { label: "Quiz de fragrância", to: "/quiz" },
      { label: "Blog", to: "/blog" },
      { label: "Ofertas", to: "/ofertas" },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 255) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: value });
    if (error && !error.message.includes("duplicate")) {
      toast.error("Não foi possível inscrever agora.");
      return;
    }
    setEmail("");
    toast.success("Inscrição confirmada. Bem-vindo à Oud Royale.");
  };

  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
          <div className="max-w-sm">
            <span className="font-display text-2xl tracking-[0.28em]">OUD ROYALE</span>
            <div className="rule-gold mt-4" />
            <p className="mt-4 text-sm leading-relaxed text-ink-foreground/60">
              Um destino premium para perfumes, beleza e autocuidado. Curadoria de fragrâncias
              árabes, de nicho, importadas e nacionais.
            </p>
            <form onSubmit={subscribe} className="mt-6 flex gap-2">
              <Input
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                className="border-ink-foreground/20 bg-transparent text-ink-foreground placeholder:text-ink-foreground/40"
              />
              <Button type="submit" variant="gold">
                Assinar
              </Button>
            </form>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow text-gold">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to as never}
                      {...(l.params ? { params: l.params as never } : {})}
                      className="text-sm text-ink-foreground/60 transition-colors hover:text-gold"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-ink-foreground/10 pt-6 text-xs text-ink-foreground/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Oud Royale. Todos os direitos reservados.</p>
          <p>PIX · Cartão · Boleto — pagamento seguro</p>
        </div>
      </div>
    </footer>
  );
}