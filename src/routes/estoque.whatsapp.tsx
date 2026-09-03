import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StockGate } from "@/components/stock/StockGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  testWhatsAppConnectionFn,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/estoque/whatsapp")({
  head: () => ({
    meta: [
      { title: "API WhatsApp — Flor de Amaranto" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <StockGate>
      <WhatsAppSettingsPage />
    </StockGate>
  ),
});

function WhatsAppSettingsPage() {
  const getFn = useServerFn(getWhatsAppConfig);
  const saveFn = useServerFn(saveWhatsAppConfig);
  const testFn = useServerFn(testWhatsAppConnectionFn);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: () => getFn(),
    retry: false,
  });

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [clientToken, setClientToken] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!query.data) return;
    setApiBaseUrl(query.data.api_base_url);
    setInstanceName(query.data.instance_name ?? "");
    setClientToken(query.data.client_token ?? "");
    setIsActive(query.data.is_active);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          apiBaseUrl,
          instanceName: instanceName.trim() || null,
          instanceToken: instanceToken.trim() || undefined,
          clientToken: clientToken.trim() || null,
          isActive,
        },
      }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Configuração salva.");
      setInstanceToken("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const testMutation = useMutation({
    mutationFn: () => testFn(),
    onSuccess: (r) => (r.success ? toast.success(r.message) : toast.error(r.message)),
    onError: (e) => toast.error(e.message),
  });

  if (query.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="eyebrow text-gold">Área do administrador</p>
      <h1 className="mt-2 font-display text-4xl">API WhatsApp</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Configuração da instância uazapi usada para enviar a confirmação de pagamento aos clientes.
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="apiBaseUrl">URL base da API</Label>
          <Input
            id="apiBaseUrl"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://sua-instancia.uazapi.com"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="instanceName">Nome da instância</Label>
          <Input
            id="instanceName"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="instanceToken">Token da instância</Label>
          <Input
            id="instanceToken"
            type="password"
            value={instanceToken}
            onChange={(e) => setInstanceToken(e.target.value)}
            placeholder={query.data?.tokenPreview ?? "Cole o token da instância"}
          />
          {query.data?.tokenPreview && (
            <p className="text-xs text-muted-foreground">
              Token atual: {query.data.tokenPreview}. Deixe em branco para manter.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="clientToken">Client token</Label>
          <Input
            id="clientToken"
            value={clientToken}
            onChange={(e) => setClientToken(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="flex items-center justify-between border border-border p-4">
          <Label htmlFor="isActive" className="cursor-pointer">
            Instância ativa
          </Label>
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="ink" size="pill" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outlineInk"
            size="pill"
            disabled={testMutation.isPending || !query.data}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? "Testando..." : "Testar conexão"}
          </Button>
        </div>
      </form>
    </div>
  );
}
