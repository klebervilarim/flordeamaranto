-- Suporte à gestão de pedidos no admin: transportadora/rastreio e status "em falta".
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS shipped_whatsapp_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_new_order_email_sent_at timestamptz;

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_of_stock';
