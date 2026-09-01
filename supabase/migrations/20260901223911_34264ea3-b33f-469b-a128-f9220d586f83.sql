ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS installments integer,
  ADD COLUMN IF NOT EXISTS pix_qr_code text,
  ADD COLUMN IF NOT EXISTS pix_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS pix_ticket_url text,
  ADD COLUMN IF NOT EXISTS pix_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_payment_id_idx ON public.orders (payment_id);