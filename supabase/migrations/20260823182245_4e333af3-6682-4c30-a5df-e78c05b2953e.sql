CREATE TABLE public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_settings IS 'Configuracoes administrativas (ex.: lista de IPs autorizados a tela de estoque). Acessada apenas via service role em server functions.';