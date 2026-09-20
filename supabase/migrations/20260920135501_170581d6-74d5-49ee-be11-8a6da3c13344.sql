CREATE TABLE public.manual_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  payment_method text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sales TO authenticated;
GRANT ALL ON public.manual_sales TO service_role;
ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage manual sales" ON public.manual_sales FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.manual_sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.manual_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL,
  total numeric NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sale_items TO authenticated;
GRANT ALL ON public.manual_sale_items TO service_role;
ALTER TABLE public.manual_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage manual sale items" ON public.manual_sale_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));