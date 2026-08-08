import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha conta | Oud Royale" },
      { name: "description", content: "Acesse sua conta para ver pedidos, favoritos e endereços." },
      { property: "og:title", content: "Minha conta | Oud Royale" },
      { property: "og:description", content: "Pedidos, favoritos e dados pessoais." },
      { property: "og:url", content: "/minha-conta" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/minha-conta" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rule-gold" />
        <h1 className="font-display mt-4 text-4xl">Minha conta</h1>
        <p className="mt-3 text-sm text-muted-foreground">Conectado como {user.email}</p>
        <Button variant="outlineInk" className="mt-8" onClick={() => void signOut()}>
          Sair da conta
        </Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada", { description: "Confirme seu e-mail para entrar." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Não foi possível entrar com Google");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl">{mode === "in" ? "Entrar" : "Criar conta"}</h1>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email" className="text-xs tracking-[0.12em] uppercase">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-xs tracking-[0.12em] uppercase">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2"
          />
        </div>
        <Button type="submit" variant="gold" size="xl" className="w-full" disabled={busy}>
          {mode === "in" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <Button variant="outlineInk" size="xl" className="mt-3 w-full" onClick={() => void google()}>
        Continuar com Google
      </Button>

      <button
        className="mt-6 w-full text-xs tracking-[0.14em] text-muted-foreground uppercase hover:text-gold"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}