-- Marcadores de notificação já enviada (idempotência: e-mail de Pix gerado,
-- e-mail de pagamento confirmado, WhatsApp de pagamento confirmado).
ALTER TABLE public.orders
  ADD COLUMN pix_email_sent_at timestamptz,
  ADD COLUMN payment_email_sent_at timestamptz,
  ADD COLUMN payment_whatsapp_sent_at timestamptz;

-- Configuração da instância WhatsApp (uazapi), compartilhada e gerenciada
-- pelo admin em /estoque/whatsapp. O token nunca é lido pelo client: as
-- server functions usam supabaseAdmin (service role) para acessar esta tabela.
CREATE TABLE public.whatsapp_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_base_url text NOT NULL,
  instance_name text,
  instance_token text NOT NULL,
  client_token text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_api_configs TO service_role;
ALTER TABLE public.whatsapp_api_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp config admin only" ON public.whatsapp_api_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_whatsapp_config_upd BEFORE UPDATE ON public.whatsapp_api_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
