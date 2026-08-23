import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Flor de Amaranto" },
      {
        name: "description",
        content:
          "Como a Flor de Amaranto coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade | Flor de Amaranto" },
      {
        property: "og:description",
        content: "Transparência sobre o tratamento dos seus dados pessoais.",
      },
      { property: "og:url", content: "/privacidade" },
    ],
    links: [{ rel: "canonical", href: "/privacidade" }],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <InstitutionalPage eyebrow="Institucional" title="Política de Privacidade">
      <p>
        Esta política descreve como a Flor de Amaranto trata os seus dados pessoais, em
        conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>
      <section>
        <h2>Dados que coletamos</h2>
        <ul>
          <li>Cadastro: nome, e-mail e senha (armazenada de forma criptografada);</li>
          <li>Pedidos: endereço de entrega e dados necessários ao faturamento;</li>
          <li>Navegação: preferências de catálogo, carrinho e favoritos.</li>
        </ul>
      </section>
      <section>
        <h2>Como usamos</h2>
        <p>
          Utilizamos os dados para processar pedidos, entregar produtos, personalizar sua
          experiência e, mediante seu consentimento, enviar novidades e ofertas. Não vendemos nem
          compartilhamos seus dados com terceiros para fins de marketing.
        </p>
      </section>
      <section>
        <h2>Segurança</h2>
        <p>
          Toda a navegação é protegida por certificado SSL e os dados de pagamento são processados
          por meios seguros — não armazenamos dados completos de cartão.
        </p>
      </section>
      <section>
        <h2>Seus direitos</h2>
        <p>
          Você pode solicitar a qualquer momento a confirmação, o acesso, a correção ou a exclusão
          dos seus dados pessoais pelo nosso canal de atendimento. Pedidos de exclusão são
          atendidos nos prazos legais, respeitadas as obrigações fiscais e contratuais.
        </p>
      </section>
    </InstitutionalPage>
  );
}
