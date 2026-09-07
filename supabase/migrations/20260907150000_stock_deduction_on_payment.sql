-- Baixa de estoque automática quando o pagamento de um pedido é confirmado.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_deducted_at timestamptz;

CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_qty integer)
RETURNS TABLE(previous_stock integer, new_stock integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous integer;
  v_new integer;
BEGIN
  SELECT stock INTO v_previous FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF v_previous IS NULL THEN
    RETURN;
  END IF;
  v_new := GREATEST(v_previous - p_qty, 0);
  UPDATE public.products SET stock = v_new WHERE id = p_product_id;
  RETURN QUERY SELECT v_previous, v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO service_role;
