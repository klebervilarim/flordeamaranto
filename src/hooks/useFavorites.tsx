import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type FavState = {
  ids: string[];
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
};

const KEY = "oud-royale-favorites";
const FavContext = createContext<FavState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids, hydrated]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setIds((prev) => Array.from(new Set([...prev, ...data.map((f) => f.product_id)])));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo<FavState>(
    () => ({
      ids,
      isFavorite: (id) => ids.includes(id),
      toggle: (id) => {
        const active = ids.includes(id);
        setIds((prev) => (active ? prev.filter((x) => x !== id) : [...prev, id]));
        toast.success(active ? "Removido dos favoritos" : "Adicionado aos favoritos");
        if (user) {
          if (active) {
            void supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", id);
          } else {
            void supabase.from("favorites").insert({ user_id: user.id, product_id: id });
          }
        }
      },
    }),
    [ids, user],
  );

  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}