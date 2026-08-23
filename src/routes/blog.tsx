import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Guias de perfumaria e beleza | Flor de Amaranto" },
      {
        name: "description",
        content: "Guias de notas olfativas, rotinas de skincare e dicas para escolher seu perfume.",
      },
      { property: "og:title", content: "Blog | Flor de Amaranto" },
      { property: "og:description", content: "Conteúdo sobre perfumaria, skincare e beleza." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
};

function BlogPage() {
  const { data: posts = [] } = useQuery({
    queryKey: ["blog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, category, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      return (data ?? []) as Post[];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rule-gold" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">Blog</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Guias, notas olfativas e rotinas de cuidado escritos pela nossa curadoria.
      </p>

      {posts.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">Novos artigos em breve.</p>
      ) : (
        <ul className="mt-12 divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <li key={post.id} className="py-7">
              {post.category && <p className="eyebrow text-gold">{post.category}</p>}
              <h2 className="font-display mt-2 text-2xl">{post.title}</h2>
              {post.excerpt && <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}