-- Trava de idempotência para o registro de uso de cupom ao confirmar pagamento.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_applied_at timestamptz;
