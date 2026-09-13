-- Trava de idempotência para o e-mail de "pedido despachado".
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_email_sent_at timestamptz;
