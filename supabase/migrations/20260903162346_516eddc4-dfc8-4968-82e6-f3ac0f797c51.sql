ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pix_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_whatsapp_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.whatsapp_api_configs (
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_api_configs TO authenticated;
ALTER TABLE public.whatsapp_api_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp config admin only" ON public.whatsapp_api_configs;
CREATE POLICY "whatsapp config admin only" ON public.whatsapp_api_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS t_whatsapp_config_upd ON public.whatsapp_api_configs;
CREATE TRIGGER t_whatsapp_config_upd BEFORE UPDATE ON public.whatsapp_api_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();