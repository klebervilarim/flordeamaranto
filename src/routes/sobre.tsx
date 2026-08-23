import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre Nós | Flor de Amaranto" },
      {
        name: "description",
        content:
          "Conheça a Flor de Amaranto: loja especializada em perfumes árabes, cosméticos e beleza com curadoria premium.",
      },
      { property: "og:title", content: "Sobre Nós | Flor de Amaranto" },
      {
        property: "og:description",
        content: "Nossa história, curadoria e compromisso com beleza e autenticidade.",
      },
      { property: "og:url", content: "/sobre" },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: Sobre,
});

function Sobre() {
  return (
    <InstitutionalPage eyebrow="Institucional" title="Sobre Nós">
      <p>
        A Flor de Amaranto nasceu da paixão por perfumaria e beleza. Somos uma loja especializada
        em perfumes árabes, fragrâncias de nicho, cosméticos e produtos de autocuidado, com uma
        curadoria feita para quem busca qualidade, originalidade e uma experiência de compra
        acolhedora.
      </p>
      <section>
        <h2>Nossa curadoria</h2>
        <p>
          Cada produto do nosso catálogo é escolhido a dedo: trabalhamos com as maiores casas de
          perfumaria árabe — Lattafa, Afnan, Armaf, Rasasi, Maison Alhambra, Khadlaj e muitas
          outras — sempre com produtos 100% originais e lacrados.
        </p>
      </section>
      <section>
        <h2>Nosso compromisso</h2>
        <ul>
          <li>Produtos originais, com procedência garantida;</li>
          <li>Preço justo e condições transparentes;</li>
          <li>Atendimento próximo pelo WhatsApp;</li>
          <li>Amostra premium em todos os pedidos;</li>
          <li>Frete grátis em compras acima de R$ 399.</li>
        </ul>
      </section>
      <p>
        Obrigado por fazer parte da nossa história. Que cada fragrância conte um capítulo da sua.
      </p>
    </InstitutionalPage>
  );
}
