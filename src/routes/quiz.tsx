import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/ProductGrid";
import { fetchProducts } from "@/lib/catalog";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz — Descubra seu perfume ideal | Flor de Amaranto" },
      {
        name: "description",
        content: "Responda algumas perguntas rápidas e receba recomendações de perfume feitas para você.",
      },
      { property: "og:title", content: "Quiz do Perfume Ideal | Flor de Amaranto" },
      { property: "og:description", content: "7 perguntas, 3 recomendações certeiras." },
      { property: "og:url", content: "/quiz" },
    ],
    links: [{ rel: "canonical", href: "/quiz" }],
  }),
  component: QuizPage,
});

type Step = {
  key: "gender" | "origin" | "family" | "intensity" | "budget";
  question: string;
  options: { label: string; value: string }[];
};

const STEPS: Step[] = [
  {
    key: "gender",
    question: "Para quem é a fragrância?",
    options: [
      { label: "Masculina", value: "masculino" },
      { label: "Feminina", value: "feminino" },
      { label: "Unissex", value: "unissex" },
    ],
  },
  {
    key: "origin",
    question: "Qual estilo mais te atrai?",
    options: [
      { label: "Árabe intenso", value: "arabe" },
      { label: "Nicho autoral", value: "nicho" },
      { label: "Importado clássico", value: "importado" },
      { label: "Nacional", value: "nacional" },
    ],
  },
  {
    key: "family",
    question: "Que aroma te conquista?",
    options: [
      { label: "Amadeirado", value: "Amadeirado" },
      { label: "Floral", value: "Floral" },
      { label: "Gourmand doce", value: "Gourmand" },
      { label: "Cítrico fresco", value: "Cítrico" },
      { label: "Oriental especiado", value: "Oriental" },
    ],
  },
  {
    key: "intensity",
    question: "Qual projeção você prefere?",
    options: [
      { label: "Discreta", value: "Média" },
      { label: "Marcante", value: "Alta" },
      { label: "Máxima presença", value: "Muito alta" },
    ],
  },
  {
    key: "budget",
    question: "Qual seu investimento ideal?",
    options: [
      { label: "Até R$ 250", value: "250" },
      { label: "Até R$ 450", value: "450" },
      { label: "Sem limite", value: "9999" },
    ],
  },
];

function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const done = step >= STEPS.length;

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["quiz", answers, done],
    enabled: done,
    queryFn: () =>
      fetchProducts({
        productTypes: ["perfume"],
        genders: answers['gender'] ? [answers['gender']] : undefined,
        origins: answers['origin'] ? [answers['origin']] : undefined,
        families: answers['family'] ? [answers['family']] : undefined,
        maxPrice: answers['budget'] ? Number(answers['budget']) : undefined,
        sort: "rating",
      }),
  });

  const current = STEPS[step];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">Seu perfume ideal</h1>

      {!done && current ? (
        <div className="mt-10">
          <p className="eyebrow text-gold">
            Pergunta {step + 1} de {STEPS.length}
          </p>
          <h2 className="font-display mt-3 text-2xl sm:text-3xl">{current.question}</h2>
          <div className="mt-8 grid gap-3">
            {current.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setAnswers((a) => ({ ...a, [current.key]: opt.value }));
                  setStep((s) => s + 1);
                }}
                className="border border-border px-6 py-5 text-left transition-colors hover:border-gold hover:text-gold"
              >
                {opt.label}
              </button>
            ))}
          </div>
          {step > 0 && (
            <Button variant="ghost" className="mt-6" onClick={() => setStep((s) => s - 1)}>
              Voltar
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-10">
          <p className="eyebrow text-gold">Recomendações para você</p>
          <div className="mt-8">
            <ProductGrid products={results.slice(0, 6)} loading={isLoading} />
          </div>
          {!isLoading && results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Não encontramos combinações exatas — tente outras respostas.
            </p>
          )}
          <Button
            variant="outlineInk"
            className="mt-8"
            onClick={() => {
              setAnswers({});
              setStep(0);
            }}
          >
            Refazer quiz
          </Button>
        </div>
      )}
    </div>
  );
}