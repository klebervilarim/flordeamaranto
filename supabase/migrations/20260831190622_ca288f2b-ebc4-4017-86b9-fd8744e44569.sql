CREATE TABLE public.product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  cost_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, supplier_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_suppliers TO authenticated;
GRANT ALL ON public.product_suppliers TO service_role;

ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage product suppliers"
ON public.product_suppliers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_suppliers_set_updated_at
BEFORE UPDATE ON public.product_suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();