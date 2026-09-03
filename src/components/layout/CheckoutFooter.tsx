import { Phone, Mail, Clock, ShieldCheck, Lock } from "lucide-react";

const PAYMENTS = [
  "Boleto",
  "Pix",
  "Visa",
  "Mastercard",
  "Diners Club",
  "American Express",
  "Elo",
];

/**
 * Rodapé do checkout — inspirado no modelo da loja de referência.
 * Colunas: Atendimento · Aceitamos · Segurança.
 */
export function CheckoutFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Atendimento */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Atendimento
            </h2>
            <div className="mt-4 space-y-3 text-sm text-foreground">
              <a
                href="tel:+5511953094882"
                className="flex items-center gap-2 font-medium hover:text-gold"
              >
                <Phone className="h-4 w-4 text-muted-foreground" />
                (11) 95309-4882
              </a>
              <a
                href="mailto:lojaflordeamaranto@gmail.com"
                className="inline-flex items-center gap-2 underline underline-offset-2 hover:text-gold"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                lojaflordeamaranto@gmail.com
              </a>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                De Segunda a Sexta das 08:00 às 18:00
              </p>
            </div>
          </div>

          {/* Aceitamos */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Aceitamos
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {PAYMENTS.map((p) => (
                <span
                  key={p}
                  className="border border-border px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.1em] text-foreground/70"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Segurança */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Segurança
            </h2>
            <div className="mt-4 space-y-3">
              <span className="inline-flex items-center gap-2 rounded-md border border-emerald/60 px-3 py-2 text-sm font-medium text-emerald">
                <Lock className="h-4 w-4" />
                Seus dados 100% seguros
              </span>
              <span className="flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background">
                <ShieldCheck className="h-4 w-4 text-gold" />
                Loja Protegida
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Flor de Amaranto — Cosméticos e Beleza. Todos os direitos
          reservados.
        </div>
      </div>
    </footer>
  );
}
