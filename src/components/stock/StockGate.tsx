import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { claimFirstAdmin, getStockStatus } from "@/lib/stock.functions";

export function StockGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const getStatus = useServerFn(getStockStatus);
  const claim = useServerFn(claimFirstAdmin);

  const statusQuery = useQuery({
    queryKey: ["stock-status"],
    queryFn: () => getStatus(),
    enabled: Boolean(user),
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => {
      toast.success("Administrador ativado.");
      queryClient.invalidateQueries({ queryKey: ["stock-status"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading || (user && statusQuery.isLoading)) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <GateCard title="Área restrita" text="Entre com a sua conta para acessar o painel de estoque.">
        <Button asChild variant="gold" size="pill">
          <Link to="/minha-conta">Entrar / Criar conta</Link>
        </Button>
      </GateCard>
    );
  }

  if (statusQuery.isError) {
    return (
      <GateCard title="Erro" text={statusQuery.error.message}>
        <Button variant="outlineInk" size="pill" onClick={() => statusQuery.refetch()}>
          Tentar novamente
        </Button>
      </GateCard>
    );
  }

  const status = statusQuery.data!;

  if (!status.isAdmin && !status.adminExists) {
    return (
      <GateCard
        title="Ativar administrador"
        text="Nenhum administrador foi configurado ainda. Como este é o primeiro acesso, você pode ativar esta conta como administradora da loja."
      >
        <Button
          variant="gold"
          size="pill"
          disabled={claimMutation.isPending}
          onClick={() => claimMutation.mutate()}
        >
          {claimMutation.isPending ? "Ativando…" : "Ativar esta conta como administradora"}
        </Button>
      </GateCard>
    );
  }

  if (!status.isAdmin) {
    return <GateCard title="Acesso negado" text="Esta área é restrita ao administrador da loja." />;
  }

  return <>{children}</>;
}

function GateCard({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-secondary">
        <Lock className="h-6 w-6 text-gold" />
      </div>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
      {children && <div className="mt-8 flex justify-center">{children}</div>}
    </div>
  );
}
