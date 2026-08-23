import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";

export const Route = createFileRoute("/trocas-e-devolucoes")({
  head: () => ({
    meta: [
      { title: "Trocas e Devoluções | Flor de Amaranto" },
      {
        name: "description",
        content:
          "Política de trocas e devoluções da Flor de Amaranto: prazos, condições e como solicitar.",
      },
      { property: "og:title", content: "Trocas e Devoluções | Flor de Amaranto" },
      {
        property: "og:description",
        content: "Entenda como solicitar troca ou devolução do seu pedido.",
      },
      { property: "og:url", content: "/trocas-e-devolucoes" },
    ],
    links: [{ rel: "canonical", href: "/trocas-e-devolucoes" }],
  }),
  component: Trocas,
});

function Trocas() {
  return (
    <InstitutionalPage eyebrow="Institucional" title="Trocas e Devoluções">
      <section>
        <h2>Direito de arrependimento</h2>
        <p>
          Conforme o Código de Defesa do Consumidor (art. 49), você pode desistir da compra em até{" "}
          <strong>7 dias corridos</strong> após o recebimento, desde que o produto esteja lacrado,
          sem sinais de uso e na embalagem original.
        </p>
      </section>
      <section>
        <h2>Produto com defeito ou avaria</h2>
        <p>
          Se o produto chegar danificado ou com defeito, entre em contato em até 7 dias após o
          recebimento, com fotos do item e da embalagem. Faremos a troca ou o reembolso integral,
          sem custo de devolução para você.
        </p>
      </section>
      <section>
        <h2>Como solicitar</h2>
        <ul>
          <li>Fale conosco pelo WhatsApp ou e-mail informando o número do pedido;</li>
          <li>Aguarde nossa autorização e as instruções de envio;</li>
          <li>O reembolso é feito pelo mesmo meio de pagamento em até 10 dias úteis após o
            recebimento e conferência do produto.</li>
        </ul>
      </section>
      <section>
        <h2>Não trocamos</h2>
        <p>
          Produtos abertos, com lacre rompido ou com sinais de uso não são elegíveis para troca,
          exceto em caso de defeito de fabricação.
        </p>
      </section>
    </InstitutionalPage>
  );
}
