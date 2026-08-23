import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";

export const Route = createFileRoute("/entrega-e-frete")({
  head: () => ({
    meta: [
      { title: "Entrega e Frete | Flor de Amaranto" },
      {
        name: "description",
        content:
          "Prazos, custos e condições de entrega da Flor de Amaranto. Frete grátis em compras acima de R$ 399.",
      },
      { property: "og:title", content: "Entrega e Frete | Flor de Amaranto" },
      {
        property: "og:description",
        content: "Saiba como funciona o envio dos seus pedidos para todo o Brasil.",
      },
      { property: "og:url", content: "/entrega-e-frete" },
    ],
    links: [{ rel: "canonical", href: "/entrega-e-frete" }],
  }),
  component: EntregaFrete,
});

function EntregaFrete() {
  return (
    <InstitutionalPage eyebrow="Institucional" title="Entrega e Frete">
      <section>
        <h2>Frete grátis</h2>
        <p>
          Oferecemos <strong>frete grátis</strong> para compras a partir de <strong>R$ 399</strong>.
          O benefício é aplicado automaticamente no carrinho quando o valor mínimo é atingido.
        </p>
      </section>
      <section>
        <h2>Prazos de entrega</h2>
        <p>
          Os pedidos são postados em até 2 dias úteis após a confirmação do pagamento. O prazo de
          entrega varia conforme a região e é informado no checkout, já com o código de
          rastreamento enviado assim que o pedido é postado.
        </p>
      </section>
      <section>
        <h2>Embalagem</h2>
        <p>
          Todos os produtos são embalados com proteção reforçada para garantir que frascos e
          cosméticos cheguem intactos até você. Toda encomenda acompanha uma amostra premium de
          presente.
        </p>
      </section>
      <section>
        <h2>Acompanhamento</h2>
        <p>
          Você pode acompanhar o status dos seus pedidos na área{" "}
          <strong>Minha Conta → Meus Pedidos</strong>. Em caso de dúvidas sobre a entrega, fale
          conosco pelo WhatsApp informando o número do pedido.
        </p>
      </section>
    </InstitutionalPage>
  );
}
