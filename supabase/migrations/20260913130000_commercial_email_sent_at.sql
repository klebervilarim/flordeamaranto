-- Trava de idempotência para o e-mail interno enviado à área comercial ao concluir a compra.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commercial_email_sent_at timestamptz;
