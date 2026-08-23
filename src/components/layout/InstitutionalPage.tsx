import type { ReactNode } from "react";

export function InstitutionalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rule-gold" />
      <p className="eyebrow mt-4 text-gold">{eyebrow}</p>
      <h1 className="font-display mt-3 text-4xl sm:text-5xl">{title}</h1>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
