CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_qty integer)
RETURNS TABLE(previous_stock integer, new_stock integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  prev integer;
  nxt integer;
BEGIN
  SELECT stock INTO prev FROM public.products WHERE id = p_product_id FOR UPDATE;
  nxt := GREATEST(0, COALESCE(prev, 0) - p_qty);
  UPDATE public.products SET stock = nxt WHERE id = p_product_id;
  RETURN QUERY SELECT prev, nxt;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO service_role;