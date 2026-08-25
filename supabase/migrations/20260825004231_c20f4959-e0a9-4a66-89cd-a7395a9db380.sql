-- 1) has_role: switch to SECURITY INVOKER so it no longer bypasses RLS.
-- It keeps working inside policies because users can read their own role rows;
-- anon gets a plain SELECT grant but RLS still returns zero rows for them.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

GRANT SELECT ON public.user_roles TO anon;

-- 2) handle_new_user is trigger-only: revoke direct execution.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3) Move cost/suggested prices out of the publicly readable products table.
CREATE TABLE public.product_costs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  cost_price numeric,
  suggested_price numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_costs TO authenticated;
GRANT ALL ON public.product_costs TO service_role;

ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_costs admin all"
ON public.product_costs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.product_costs (product_id, cost_price, suggested_price)
SELECT id, cost_price, suggested_price FROM public.products
WHERE cost_price IS NOT NULL OR suggested_price IS NOT NULL;

ALTER TABLE public.products DROP COLUMN cost_price, DROP COLUMN suggested_price;

-- 4) Storage: only admins may upload/modify/delete product images (public read already exists).
CREATE POLICY "product-images admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product-images admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product-images admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));