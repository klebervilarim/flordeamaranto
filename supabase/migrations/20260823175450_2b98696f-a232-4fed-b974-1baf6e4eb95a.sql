ALTER TABLE public.products ADD COLUMN IF NOT EXISTS suggested_price numeric;
COMMENT ON COLUMN public.products.suggested_price IS 'Preço de venda sugerido (custo + 40%)';