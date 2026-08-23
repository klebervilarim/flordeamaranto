ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS purchase_location text NOT NULL DEFAULT 'Brasil';

UPDATE public.products SET purchase_location = 'Brasil' WHERE purchase_location IS NULL OR purchase_location = '';

COMMENT ON COLUMN public.products.purchase_location IS 'Local de compra do produto (ex.: Brasil, Paraguai).';