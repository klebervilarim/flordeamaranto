import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Flor de Amaranto" },
      {
        name: "description",
        content:
          "Condições gerais de uso da loja Flor de Amaranto: cadastro, pedidos, preços e responsabilidades.",
      },
      { property: "og:title", content: "Termos de Uso | Flor de Amaranto" },
      {
        property: "og:description",
        content: "Regras e condições para comprar na Flor de Amaranto.",
      },
      { property: "og:url", content: "/termos-de-uso" },
    ],
    links: [{ rel: "canonical", href: "/termos-de-uso" }],
  }),
  component: Termos,
});

function Termos() {
  return (
    <InstitutionalPage eyebrow="Institucional" title="Termos de Uso">
      <p>
        Ao navegar e comprar na Flor de Amaranto, você concorda com as condições abaixo. Leia com
        atenção antes de finalizar seu pedido.
      </p>
      <section>
        <h2>Cadastro</h2>
        <p>
          Para comprar é necessário criar uma conta com dados verdadeiros e atualizados. Você é
          responsável pela confidencialidade da sua senha e pelas atividades realizadas na sua
          conta.
        </p>
      </section>
      <section>
        <h2>Produtos e preços</h2>
        <p>
          Trabalhamos apenas com produtos originais e lacrados. Preços e condições de pagamento são
          os exibidos no momento da compra. Ofertas têm validade limitada ao estoque disponível.
          Pagamentos via Pix contam com desconto especial informado no checkout.
        </p>
      </section>
      <section>
        <h2>Pedidos</h2>
        <p>
          A confirmação do pedido ocorre após a aprovação do pagamento. Em caso de indisponibilidade
          de estoque, entraremos em contato para oferecer substituição ou reembolso integral.
        </p>
      </section>
      <section>
        <h2>Propriedade intelectual</h2>
        <p>
          Todo o conteúdo do site — textos, imagens, identidade visual e marca Flor de Amaranto —
          é protegido e não pode ser reproduzido sem autorização.
        </p>
      </section>
      <section>
        <h2>Atendimento</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas pelos nossos canais de atendimento. Estes
          termos podem ser atualizados periodicamente; a versão vigente é sempre a publicada nesta
          página.
        </p>
      </section>
    </InstitutionalPage>
  );
}
