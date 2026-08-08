-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','customer');
CREATE TYPE public.product_status AS ENUM ('active','draft','archived');
CREATE TYPE public.order_status AS ENUM ('pending','paid','preparing','shipped','in_transit','delivered','cancelled');

-- UPDATED AT
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, phone text, avatar_url text, birth_date date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BRANDS
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE, description text,
  logo_url text, country text, origin text, featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands public read" ON public.brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "brands admin write" ON public.brands FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCT TYPES
CREATE TABLE public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE, icon text, sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.product_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_types TO authenticated;
GRANT ALL ON public.product_types TO service_role;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ptypes public read" ON public.product_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ptypes admin write" ON public.product_types FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE, description text, image_url text,
  product_type_slug text, parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cats public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cats admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COLLECTIONS
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE, description text, image_url text,
  featured boolean NOT NULL DEFAULT false, sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colls public read" ON public.collections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "colls admin write" ON public.collections FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCTS (generic entity)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  product_type text NOT NULL DEFAULT 'perfume',
  category_slug text,
  subcategory_slug text,
  gender text,
  origin text,
  short_description text,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  cost_price numeric(10,2),
  stock int NOT NULL DEFAULT 0,
  min_stock int NOT NULL DEFAULT 3,
  weight_g int,
  volume text,
  image_url text,
  status public.product_status NOT NULL DEFAULT 'active',
  featured boolean NOT NULL DEFAULT false,
  bestseller boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  exclusive boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  -- perfumery
  olfactory_families text[] NOT NULL DEFAULT '{}',
  top_notes text[] NOT NULL DEFAULT '{}',
  heart_notes text[] NOT NULL DEFAULT '{}',
  base_notes text[] NOT NULL DEFAULT '{}',
  longevity text, sillage text, intensity text,
  occasions text[] NOT NULL DEFAULT '{}',
  seasons text[] NOT NULL DEFAULT '{}',
  day_night text,
  -- skincare / cosmetics
  skin_types text[] NOT NULL DEFAULT '{}',
  goals text[] NOT NULL DEFAULT '{}',
  ingredients text[] NOT NULL DEFAULT '{}',
  benefits text[] NOT NULL DEFAULT '{}',
  usage_instructions text, warnings text,
  -- makeup
  color text, shade text, finish text, coverage text,
  -- open extension point
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_type_idx ON public.products(product_type);
CREATE INDEX products_origin_idx ON public.products(origin);
CREATE INDEX products_brand_idx ON public.products(brand_id);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT IMAGES
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL, alt text, sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pimg public read" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pimg admin write" ON public.product_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCT <-> COLLECTIONS
CREATE TABLE public.product_collections (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, collection_id)
);
GRANT SELECT ON public.product_collections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_collections TO authenticated;
GRANT ALL ON public.product_collections TO service_role;
ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcol public read" ON public.product_collections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pcol admin write" ON public.product_collections FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- FAVORITES
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CART
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ADDRESSES
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text, recipient text NOT NULL, zip_code text NOT NULL, street text NOT NULL,
  number text NOT NULL, complement text, district text, city text NOT NULL, state text NOT NULL,
  is_default boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, type text NOT NULL DEFAULT 'percent',
  value numeric(10,2) NOT NULL DEFAULT 0, min_order numeric(10,2) NOT NULL DEFAULT 0,
  starts_at timestamptz, ends_at timestamptz, max_uses int, used_count int NOT NULL DEFAULT 0,
  category_slugs text[] NOT NULL DEFAULT '{}', brand_ids uuid[] NOT NULL DEFAULT '{}',
  collection_ids uuid[] NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons public read active" ON public.coupons FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "coupons admin write" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE DEFAULT concat('OR', to_char(now(),'YYMMDD'), lpad((floor(random()*100000))::int::text, 5, '0')),
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  shipping numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  coupon_code text, payment_method text, payment_status text NOT NULL DEFAULT 'pending',
  shipping_address jsonb, tracking_code text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER t_orders_upd BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL, brand_name text, image_url text,
  unit_price numeric(10,2) NOT NULL, quantity int NOT NULL DEFAULT 1,
  total numeric(10,2) NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "order items insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text, comment text,
  longevity_rating int, sillage_rating int, value_rating int,
  author_name text, approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (approved = true OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reviews own write" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  url text NOT NULL
);
GRANT SELECT ON public.review_images TO anon, authenticated;
GRANT INSERT, DELETE ON public.review_images TO authenticated;
GRANT ALL ON public.review_images TO service_role;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rimg public read" ON public.review_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rimg own write" ON public.review_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid()));

-- INVENTORY MOVEMENTS
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL, quantity int NOT NULL, note text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv admin" ON public.inventory_movements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- KITS
CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE, description text, image_url text,
  price numeric(10,2) NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT ALL ON public.kits TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kits public read" ON public.kits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "kits admin write" ON public.kits FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.kit_items (
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  PRIMARY KEY (kit_id, product_id)
);
GRANT SELECT ON public.kit_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kit_items TO authenticated;
GRANT ALL ON public.kit_items TO service_role;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kititems public read" ON public.kit_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "kititems admin write" ON public.kit_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- BLOG
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, slug text NOT NULL UNIQUE, excerpt text, content text,
  cover_url text, category text, author text, published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog public read" ON public.blog_posts FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "blog admin write" ON public.blog_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- NEWSLETTER
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter insert" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "newsletter admin read" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ================= SEED =================
INSERT INTO public.product_types (name, slug, sort_order) VALUES
 ('Perfume','perfume',1),('Cosmético','cosmetico',2),('Skincare','skincare',3),
 ('Maquiagem','maquiagem',4),('Corpo & Banho','corpo-e-banho',5),('Cabelo','cabelo',6),
 ('Kit','kit',7),('Acessório','acessorio',8);

INSERT INTO public.categories (name, slug, product_type_slug, sort_order) VALUES
 ('Masculino','masculino','perfume',1),('Feminino','feminino','perfume',2),('Unissex','unissex','perfume',3),
 ('Hidratante','hidratante','skincare',4),('Sérum','serum','skincare',5),('Limpeza','limpeza','skincare',6),
 ('Protetor Solar','protetor-solar','skincare',7),('Base','base','maquiagem',8),('Batom','batom','maquiagem',9),
 ('Body Splash','body-splash','corpo-e-banho',10),('Óleo Corporal','oleo-corporal','corpo-e-banho',11),
 ('Sabonete','sabonete','corpo-e-banho',12);

INSERT INTO public.collections (name, slug, description, featured, sort_order) VALUES
 ('Perfumes Árabes','perfumes-arabes','Ícones da perfumaria do Oriente Médio.',true,1),
 ('Perfumes de Nicho','perfumes-de-nicho','Criações autorais e exclusivas.',true,2),
 ('Importados','importados','Seleção internacional.',false,3),
 ('Nacionais','nacionais','O melhor da perfumaria brasileira.',false,4),
 ('Mais Vendidos','mais-vendidos','Os favoritos da casa.',true,5),
 ('Novidades','novidades','Recém-chegados.',true,6),
 ('Ofertas','ofertas','Preços especiais por tempo limitado.',true,7),
 ('Perfumes para a Noite','perfumes-para-a-noite','Intensos e marcantes.',false,8),
 ('Perfumes para o Dia','perfumes-para-o-dia','Leves e versáteis.',false,9),
 ('Gourmand','gourmand','Doces, cremosos e envolventes.',false,10),
 ('Amadeirados','amadeirados','Madeiras nobres e resinas.',false,11),
 ('Presentes','presentes','Para presentear com sofisticação.',true,12);

INSERT INTO public.brands (name, slug, country, origin, featured, description) VALUES
 ('Lattafa','lattafa','Emirados Árabes','arabe',true,'Perfumaria árabe contemporânea de alto desempenho.'),
 ('Afnan','afnan','Emirados Árabes','arabe',true,'Fragrâncias árabes com assinatura sofisticada.'),
 ('Rasasi','rasasi','Emirados Árabes','arabe',true,'Tradição árabe desde 1979.'),
 ('Armaf','armaf','Emirados Árabes','arabe',true,'Luxo acessível com estilo internacional.'),
 ('Al Haramain','al-haramain','Emirados Árabes','arabe',false,'Casa clássica de oud e âmbar.'),
 ('Maison Alhambra','maison-alhambra','Emirados Árabes','arabe',true,'Releituras modernas de grandes clássicos.'),
 ('Swiss Arabian','swiss-arabian','Emirados Árabes','arabe',false,'Precisão suíça, alma árabe.'),
 ('Khadlaj','khadlaj','Emirados Árabes','arabe',false,'Perfumaria árabe acessível e marcante.'),
 ('Fragrance World','fragrance-world','Emirados Árabes','arabe',false,'Interpretações criativas de sucessos globais.'),
 ('Ajmal','ajmal','Emirados Árabes','arabe',true,'Casa de oud com mais de 70 anos.'),
 ('Maison Verde','maison-verde','França','nicho',true,'Perfumaria de nicho autoral.'),
 ('Aurea Skin','aurea-skin','Brasil','nacional',false,'Skincare e beleza de alta performance.');

-- PERFUMES ÁRABES
INSERT INTO public.products (sku,name,slug,brand_id,product_type,category_slug,gender,origin,short_description,description,price,sale_price,stock,volume,featured,bestseller,is_new,rating,rating_count,olfactory_families,top_notes,heart_notes,base_notes,longevity,sillage,intensity,occasions,seasons,day_night)
VALUES
 ('OR-001','Khamrah','khamrah',(SELECT id FROM public.brands WHERE slug='lattafa'),'perfume','unissex','unissex','arabe','Gourmand especiado com canela e tâmaras.','Uma celebração oriental: tâmaras, canela e baunilha sobre um fundo cremoso de benjoim e praliné.',389.90,329.90,24,'100ml',true,true,false,4.8,214,ARRAY['Gourmand','Especiado','Âmbar'],ARRAY['Canela','Noz-moscada','Bergamota'],ARRAY['Tâmara','Praliné','Flor de laranjeira'],ARRAY['Baunilha','Tonka','Benjoim'],'Muito alta','Alta','Intensa',ARRAY['Noite','Festa'],ARRAY['Outono','Inverno'],'noite'),
 ('OR-002','Asad','asad',(SELECT id FROM public.brands WHERE slug='lattafa'),'perfume','masculino','masculino','arabe','Amadeirado intenso com abacaxi e tabaco.','Abertura frutada e vibrante que evolui para um coração de tabaco e um fundo de madeiras cremosas.',329.90,NULL,31,'100ml',true,true,false,4.7,188,ARRAY['Amadeirado','Especiado'],ARRAY['Abacaxi','Pimenta preta','Bergamota'],ARRAY['Tabaco','Lavanda'],ARRAY['Âmbar','Baunilha','Cedro'],'Alta','Alta','Intensa',ARRAY['Noite','Trabalho'],ARRAY['Outono','Inverno'],'noite'),
 ('OR-003','Yara','yara',(SELECT id FROM public.brands WHERE slug='lattafa'),'perfume','feminino','feminino','arabe','Doce, leitoso e adocicado com orquídea.','Um floral gourmand cremoso, com tangerina, orquídea e sândalo leitoso.',299.90,249.90,42,'100ml',true,true,false,4.9,301,ARRAY['Gourmand','Floral'],ARRAY['Tangerina','Heliotrópio'],ARRAY['Orquídea','Framboesa'],ARRAY['Sândalo','Baunilha','Almíscar'],'Alta','Média','Moderada',ARRAY['Dia a dia','Encontro'],ARRAY['Primavera','Verão'],'dia'),
 ('OR-004','9PM','9pm',(SELECT id FROM public.brands WHERE slug='afnan'),'perfume','masculino','masculino','arabe','Doce amadeirado para a noite.','Maçã e canela na abertura, coração de lavanda e um fundo viciante de baunilha e tonka.',279.90,229.90,38,'100ml',false,true,false,4.6,157,ARRAY['Gourmand','Amadeirado'],ARRAY['Maçã','Canela','Bergamota'],ARRAY['Lavanda','Íris'],ARRAY['Baunilha','Tonka','Âmbar'],'Alta','Alta','Intensa',ARRAY['Noite','Festa'],ARRAY['Outono','Inverno'],'noite'),
 ('OR-005','Supremacy Silver','supremacy-silver',(SELECT id FROM public.brands WHERE slug='afnan'),'perfume','masculino','masculino','arabe','Aromático fresco e metálico.','Frescor cítrico com um coração aquático e base amadeirada de vetiver.',319.90,NULL,19,'100ml',false,false,true,4.5,92,ARRAY['Aromático','Aquático'],ARRAY['Limão','Bergamota'],ARRAY['Notas marinhas','Gerânio'],ARRAY['Vetiver','Âmbar cinzento'],'Média','Média','Moderada',ARRAY['Trabalho','Dia a dia'],ARRAY['Primavera','Verão'],'dia'),
 ('OR-006','Hawas for Him','hawas-for-him',(SELECT id FROM public.brands WHERE slug='rasasi'),'perfume','masculino','masculino','arabe','Frescor aquático premium.','Um clássico moderno: maçã, canela e âmbar sobre notas marinhas.',429.90,379.90,15,'100ml',true,false,false,4.8,143,ARRAY['Aquático','Frutado'],ARRAY['Maçã','Bergamota','Canela'],ARRAY['Notas marinhas','Jasmim'],ARRAY['Âmbar','Almíscar','Cedro'],'Alta','Alta','Intensa',ARRAY['Dia a dia','Encontro'],ARRAY['Primavera','Verão'],'dia'),
 ('OR-007','La Yuqawam','la-yuqawam',(SELECT id FROM public.brands WHERE slug='rasasi'),'perfume','masculino','masculino','arabe','Couro e frutas nobres.','Couro elegante com toques frutados e especiarias quentes.',549.90,NULL,9,'75ml',false,false,false,4.7,64,ARRAY['Couro','Frutado'],ARRAY['Ameixa','Bergamota'],ARRAY['Couro','Canela'],ARRAY['Oud','Patchouli'],'Muito alta','Alta','Intensa',ARRAY['Noite','Evento'],ARRAY['Inverno'],'noite'),
 ('OR-008','Club de Nuit Intense','club-de-nuit-intense',(SELECT id FROM public.brands WHERE slug='armaf'),'perfume','masculino','masculino','arabe','Ícone frutado e amadeirado.','Abacaxi cintilante, bétula esfumaçada e âmbar cinzento.',349.90,299.90,27,'105ml',true,true,false,4.9,412,ARRAY['Amadeirado','Frutado'],ARRAY['Abacaxi','Limão','Groselha'],ARRAY['Bétula','Jasmim'],ARRAY['Âmbar cinzento','Almíscar','Baunilha'],'Muito alta','Muito alta','Intensa',ARRAY['Noite','Festa'],ARRAY['Outono','Inverno'],'noite'),
 ('OR-009','Ventana Blue','ventana-blue',(SELECT id FROM public.brands WHERE slug='armaf'),'perfume','masculino','masculino','arabe','Fresco e sofisticado.','Cítricos brilhantes com um fundo amadeirado e mineral.',259.90,NULL,33,'100ml',false,false,true,4.4,58,ARRAY['Aromático','Cítrico'],ARRAY['Limão','Toranja'],ARRAY['Gerânio','Sálvia'],ARRAY['Cedro','Almíscar'],'Média','Média','Leve',ARRAY['Trabalho'],ARRAY['Verão'],'dia'),
 ('OR-010','Amber Oud Gold','amber-oud-gold',(SELECT id FROM public.brands WHERE slug='al-haramain'),'perfume','unissex','unissex','arabe','Âmbar dourado e oud cremoso.','Uma assinatura árabe atemporal: âmbar, oud e baunilha.',599.90,529.90,12,'60ml',true,false,false,4.8,121,ARRAY['Âmbar','Amadeirado'],ARRAY['Bergamota','Açafrão'],ARRAY['Oud','Rosa'],ARRAY['Âmbar','Baunilha','Almíscar'],'Muito alta','Alta','Intensa',ARRAY['Noite','Evento'],ARRAY['Inverno'],'noite'),
 ('OR-011','L''Aventure','l-aventure',(SELECT id FROM public.brands WHERE slug='al-haramain'),'perfume','masculino','masculino','arabe','Especiado e viciante.','Canela e pimenta sobre um fundo cremoso de tonka.',309.90,NULL,22,'100ml',false,true,false,4.6,97,ARRAY['Especiado','Amadeirado'],ARRAY['Bergamota','Pimenta rosa'],ARRAY['Canela','Lavanda'],ARRAY['Tonka','Cedro','Almíscar'],'Alta','Alta','Intensa',ARRAY['Noite'],ARRAY['Outono','Inverno'],'noite'),
 ('OR-012','Kismet Ehsas','kismet-ehsas',(SELECT id FROM public.brands WHERE slug='maison-alhambra'),'perfume','unissex','unissex','arabe','Frutado floral moderno.','Pera e groselha com um coração floral e base de almíscar.',219.90,179.90,45,'100ml',false,false,true,4.5,73,ARRAY['Frutado','Floral'],ARRAY['Pera','Groselha'],ARRAY['Jasmim','Rosa'],ARRAY['Almíscar','Cedro'],'Média','Média','Moderada',ARRAY['Dia a dia'],ARRAY['Primavera'],'dia'),
 ('OR-013','Jean Lowe Ombre','jean-lowe-ombre',(SELECT id FROM public.brands WHERE slug='maison-alhambra'),'perfume','masculino','masculino','arabe','Amadeirado escuro e elegante.','Madeiras escuras, especiarias e um toque de couro.',239.90,NULL,29,'100ml',false,true,false,4.6,110,ARRAY['Amadeirado','Couro'],ARRAY['Cardamomo','Bergamota'],ARRAY['Couro','Íris'],ARRAY['Vetiver','Âmbar'],'Alta','Média','Moderada',ARRAY['Trabalho','Noite'],ARRAY['Outono'],'noite'),
 ('OR-014','Shaghaf Oud','shaghaf-oud',(SELECT id FROM public.brands WHERE slug='swiss-arabian'),'perfume','unissex','unissex','arabe','Oud com rosa e frutas.','Um oud aveludado, doce e sofisticado.',459.90,NULL,14,'75ml',false,false,false,4.7,88,ARRAY['Amadeirado','Floral'],ARRAY['Açafrão','Framboesa'],ARRAY['Rosa','Oud'],ARRAY['Âmbar','Baunilha'],'Muito alta','Alta','Intensa',ARRAY['Noite','Evento'],ARRAY['Inverno'],'noite'),
 ('OR-015','Layali Rouge','layali-rouge',(SELECT id FROM public.brands WHERE slug='swiss-arabian'),'perfume','feminino','feminino','arabe','Floral oriental sedutor.','Frutas vermelhas, flores brancas e um fundo âmbarado.',269.90,229.90,26,'50ml',false,false,false,4.4,52,ARRAY['Floral','Âmbar'],ARRAY['Frutas vermelhas','Bergamota'],ARRAY['Jasmim','Tuberosa'],ARRAY['Âmbar','Baunilha'],'Alta','Média','Moderada',ARRAY['Encontro','Noite'],ARRAY['Outono'],'noite'),
 ('OR-016','Ghala Zayed Luxe','ghala-zayed-luxe',(SELECT id FROM public.brands WHERE slug='khadlaj'),'perfume','unissex','unissex','arabe','Oud e âmbar luxuosos.','Composição rica e opulenta de inspiração emirati.',289.90,NULL,18,'100ml',false,false,true,4.3,41,ARRAY['Âmbar','Amadeirado'],ARRAY['Açafrão','Bergamota'],ARRAY['Oud','Patchouli'],ARRAY['Âmbar','Almíscar'],'Alta','Alta','Intensa',ARRAY['Noite'],ARRAY['Inverno'],'noite'),
 ('OR-017','Hayaati Gold Elixir','hayaati-gold-elixir',(SELECT id FROM public.brands WHERE slug='khadlaj'),'perfume','masculino','masculino','arabe','Doce amadeirado marcante.','Frutas escuras e baunilha sobre madeiras.',199.90,159.90,37,'100ml',false,false,false,4.2,66,ARRAY['Gourmand','Amadeirado'],ARRAY['Ameixa','Bergamota'],ARRAY['Canela','Rosa'],ARRAY['Baunilha','Cedro'],'Média','Média','Moderada',ARRAY['Dia a dia','Noite'],ARRAY['Outono'],'noite'),
 ('OR-018','Turathi Blue','turathi-blue',(SELECT id FROM public.brands WHERE slug='fragrance-world'),'perfume','masculino','masculino','arabe','Aquático amadeirado moderno.','Frescor marinho com base de âmbar cinzento.',229.90,NULL,30,'100ml',false,false,false,4.3,49,ARRAY['Aquático','Amadeirado'],ARRAY['Bergamota','Toranja'],ARRAY['Notas marinhas','Gerânio'],ARRAY['Âmbar cinzento','Cedro'],'Média','Média','Moderada',ARRAY['Dia a dia'],ARRAY['Verão'],'dia'),
 ('OR-019','Sedra Wood','sedra-wood',(SELECT id FROM public.brands WHERE slug='fragrance-world'),'perfume','unissex','unissex','arabe','Madeiras secas e resinas.','Um amadeirado seco, elegante e discreto.',209.90,179.90,25,'80ml',false,false,false,4.1,33,ARRAY['Amadeirado','Especiado'],ARRAY['Pimenta','Cardamomo'],ARRAY['Cedro','Íris'],ARRAY['Vetiver','Almíscar'],'Média','Baixa','Leve',ARRAY['Trabalho'],ARRAY['Outono'],'dia'),
 ('OR-020','Amber Wood','amber-wood',(SELECT id FROM public.brands WHERE slug='ajmal'),'perfume','unissex','unissex','arabe','Âmbar quente e envolvente.','Assinatura Ajmal de âmbar e madeiras nobres.',639.90,NULL,8,'75ml',true,false,false,4.8,79,ARRAY['Âmbar','Amadeirado'],ARRAY['Açafrão','Bergamota'],ARRAY['Oud','Sândalo'],ARRAY['Âmbar','Almíscar'],'Muito alta','Alta','Intensa',ARRAY['Evento','Noite'],ARRAY['Inverno'],'noite'),
 ('OR-021','Aristocrat','aristocrat',(SELECT id FROM public.brands WHERE slug='ajmal'),'perfume','masculino','masculino','arabe','Fougère elegante e refinado.','Sofisticação clássica com lavanda e madeiras.',519.90,459.90,11,'75ml',false,false,false,4.6,57,ARRAY['Aromático','Amadeirado'],ARRAY['Lavanda','Bergamota'],ARRAY['Gerânio','Sálvia'],ARRAY['Vetiver','Tonka'],'Alta','Média','Moderada',ARRAY['Trabalho','Evento'],ARRAY['Primavera'],'dia');

-- NICHO / IMPORTADO / NACIONAL
INSERT INTO public.products (sku,name,slug,brand_id,product_type,category_slug,gender,origin,short_description,description,price,sale_price,stock,volume,featured,bestseller,is_new,exclusive,rating,rating_count,olfactory_families,top_notes,heart_notes,base_notes,longevity,sillage,intensity,occasions,seasons,day_night) VALUES
 ('OR-022','Vert Absolu','vert-absolu',(SELECT id FROM public.brands WHERE slug='maison-verde'),'perfume','unissex','unissex','nicho','Verde aromático de nicho.','Folhas esmagadas, figueira e um fundo mineral. Uma criação autoral.',789.90,NULL,6,'50ml',true,false,true,true,4.9,28,ARRAY['Verde','Aromático'],ARRAY['Folha de figueira','Limão'],ARRAY['Gálbano','Violeta'],ARRAY['Vetiver','Musgo'],'Alta','Média','Moderada',ARRAY['Dia a dia'],ARRAY['Primavera'],'dia'),
 ('OR-023','Noir Chypre','noir-chypre',(SELECT id FROM public.brands WHERE slug='maison-verde'),'perfume','unissex','unissex','nicho','Chipre moderno e escuro.','Patchouli, musgo e bergamota em equilíbrio contemporâneo.',849.90,749.90,5,'50ml',true,false,false,true,4.8,19,ARRAY['Chipre','Amadeirado'],ARRAY['Bergamota','Pimenta rosa'],ARRAY['Patchouli','Rosa'],ARRAY['Musgo de carvalho','Âmbar'],'Muito alta','Alta','Intensa',ARRAY['Noite','Evento'],ARRAY['Inverno'],'noite'),
 ('OR-024','Blanc Solaire','blanc-solaire',(SELECT id FROM public.brands WHERE slug='maison-verde'),'perfume','feminino','feminino','nicho','Floral solar de nicho.','Flores brancas e coco sob o sol do mediterrâneo.',799.90,NULL,7,'50ml',false,false,true,true,4.7,22,ARRAY['Floral','Musk'],ARRAY['Bergamota','Coco'],ARRAY['Tiaré','Jasmim'],ARRAY['Almíscar','Sândalo'],'Alta','Média','Moderada',ARRAY['Dia a dia','Encontro'],ARRAY['Verão'],'dia');

-- SKINCARE / COSMÉTICOS / BODY CARE / MAQUIAGEM
INSERT INTO public.products (sku,name,slug,brand_id,product_type,category_slug,origin,short_description,description,price,sale_price,stock,volume,featured,bestseller,is_new,rating,rating_count,skin_types,goals,ingredients,benefits,usage_instructions,warnings) VALUES
 ('OR-025','Sérum Vitamina C 15%','serum-vitamina-c-15',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'skincare','serum','nacional','Antioxidante para uniformizar o tom.','Sérum concentrado com vitamina C estabilizada e ácido ferúlico.',189.90,159.90,60,'30ml',true,true,false,4.7,132,ARRAY['Normal','Mista','Oleosa'],ARRAY['Uniformização','Iluminação','Anti-idade'],ARRAY['Vitamina C','Ácido ferúlico','Vitamina E'],ARRAY['Ilumina','Uniformiza','Protege'],'Aplique 3 a 4 gotas no rosto limpo pela manhã, antes do protetor solar.','Uso externo. Em caso de irritação, suspenda o uso.'),
 ('OR-026','Hidratante Facial Ácido Hialurônico','hidratante-facial-acido-hialuronico',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'skincare','hidratante','nacional','Hidratação profunda por 24h.','Textura gel-creme de rápida absorção com hialurônico de múltiplos pesos.',149.90,NULL,72,'50g',true,true,false,4.8,201,ARRAY['Seca','Normal','Sensível'],ARRAY['Hidratação','Revitalização'],ARRAY['Ácido hialurônico','Pantenol','Ceramidas'],ARRAY['Hidrata','Acalma','Fortalece a barreira'],'Aplique manhã e noite no rosto limpo.','Evite a área dos olhos.'),
 ('OR-027','Gel de Limpeza Purificante','gel-de-limpeza-purificante',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'skincare','limpeza','nacional','Controle de oleosidade sem ressecar.','Limpeza suave com niacinamida e zinco.',99.90,79.90,85,'150ml',false,false,false,4.5,88,ARRAY['Oleosa','Mista'],ARRAY['Controle de oleosidade','Acne'],ARRAY['Niacinamida','Zinco PCA','Ácido salicílico'],ARRAY['Purifica','Matifica'],'Massageie no rosto úmido e enxágue.','Evite contato com os olhos.'),
 ('OR-028','Protetor Solar FPS 60 Toque Seco','protetor-solar-fps-60',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'skincare','protetor-solar','nacional','Proteção alta com acabamento seco.','Filtro de amplo espectro com antioxidantes.',129.90,NULL,54,'50g',false,true,true,4.6,97,ARRAY['Oleosa','Mista','Normal'],ARRAY['Proteção'],ARRAY['Óxido de zinco','Vitamina E'],ARRAY['Protege','Matifica'],'Aplique generosamente 15 min antes da exposição solar.','Reaplique a cada 2 horas.'),
 ('OR-029','Creme Anti-idade Noturno','creme-anti-idade-noturno',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'skincare','hidratante','nacional','Renovação enquanto você dorme.','Retinol encapsulado com peptídeos.',249.90,209.90,33,'50g',false,false,true,4.7,61,ARRAY['Normal','Seca','Mista'],ARRAY['Anti-idade','Revitalização'],ARRAY['Retinol','Peptídeos','Esqualano'],ARRAY['Suaviza linhas','Renova'],'Use à noite, 2 a 3 vezes por semana no início.','Não usar durante a gestação.');

INSERT INTO public.products (sku,name,slug,brand_id,product_type,category_slug,origin,short_description,description,price,sale_price,stock,volume,bestseller,is_new,rating,rating_count,color,shade,finish,coverage,skin_types,benefits,usage_instructions) VALUES
 ('OR-030','Base Sérum Luminosa','base-serum-luminosa',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'maquiagem','base','nacional','Cobertura média com acabamento natural.','Base fluida com ativos de tratamento.',159.90,NULL,48,'30ml',true,false,4.5,74,'Bege','Bege 20','Natural','Média',ARRAY['Normal','Mista','Seca'],ARRAY['Hidrata','Uniformiza'],'Aplique com pincel ou esponja do centro para fora.'),
 ('OR-031','Batom Matte Velvet','batom-matte-velvet',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'maquiagem','batom','nacional','Cor intensa e confortável.','Textura aveludada de longa duração.',79.90,64.90,90,'3,5g',false,true,4.4,52,'Vermelho','Rouge Royale','Matte','Alta',ARRAY['Normal'],ARRAY['Alta pigmentação','Longa duração'],'Aplique diretamente nos lábios.');

INSERT INTO public.products (sku,name,slug,brand_id,product_type,category_slug,origin,short_description,description,price,sale_price,stock,volume,bestseller,is_new,rating,rating_count,ingredients,benefits,usage_instructions,olfactory_families)
VALUES
 ('OR-032','Body Splash Oud Royale','body-splash-oud-royale',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'corpo-e-banho','body-splash','nacional','Frescor perfumado para o corpo.','Body splash com assinatura amadeirada e âmbarada da casa.',89.90,74.90,110,'250ml',true,false,4.6,143,ARRAY['Pantenol','Extrato de aloe'],ARRAY['Refresca','Perfuma'],'Borrife no corpo após o banho.',ARRAY['Âmbar','Amadeirado']),
 ('OR-033','Óleo Corporal Seco Ambar','oleo-corporal-seco-ambar',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'corpo-e-banho','oleo-corporal','nacional','Nutrição com brilho sutil.','Óleo seco de rápida absorção com toque dourado.',119.90,NULL,64,'150ml',false,true,4.5,58,ARRAY['Óleo de amêndoas','Vitamina E','Óleo de argan'],ARRAY['Nutre','Ilumina'],'Aplique sobre a pele limpa e massageie.',ARRAY['Âmbar']),
 ('OR-034','Sabonete Líquido Oud & Rosas','sabonete-liquido-oud-rosas',(SELECT id FROM public.brands WHERE slug='aurea-skin'),'corpo-e-banho','sabonete','nacional','Banho perfumado e hidratante.','Espuma cremosa com oud e rosa damascena.',69.90,54.90,120,'400ml',false,false,4.4,71,ARRAY['Glicerina','Extrato de rosa'],ARRAY['Hidrata','Perfuma'],'Use no banho com bucha ou as mãos.',ARRAY['Floral','Amadeirado']);

UPDATE public.products SET brand_id = (SELECT id FROM public.brands WHERE slug='aurea-skin') WHERE brand_id IS NULL;

-- Associar coleções
INSERT INTO public.product_collections (product_id, collection_id)
SELECT p.id, c.id FROM public.products p, public.collections c
WHERE (c.slug='perfumes-arabes' AND p.origin='arabe')
   OR (c.slug='perfumes-de-nicho' AND p.origin='nicho')
   OR (c.slug='nacionais' AND p.origin='nacional')
   OR (c.slug='mais-vendidos' AND p.bestseller)
   OR (c.slug='novidades' AND p.is_new)
   OR (c.slug='ofertas' AND p.sale_price IS NOT NULL)
   OR (c.slug='perfumes-para-a-noite' AND p.day_night='noite')
   OR (c.slug='perfumes-para-o-dia' AND p.day_night='dia')
   OR (c.slug='gourmand' AND 'Gourmand' = ANY(p.olfactory_families))
   OR (c.slug='amadeirados' AND 'Amadeirado' = ANY(p.olfactory_families))
   OR (c.slug='presentes' AND p.featured)
ON CONFLICT DO NOTHING;

-- BLOG
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, author) VALUES
 ('Guia completo dos perfumes árabes','guia-perfumes-arabes','Entenda o que torna a perfumaria árabe tão marcante e como escolher a sua.','A perfumaria árabe é conhecida pela alta concentração de óleos, pelo uso de oud, âmbar e resinas, e por uma projeção generosa...','Perfumes árabes','Equipe Oud Royale'),
 ('Famílias olfativas: como identificar a sua','familias-olfativas','Amadeirado, floral, gourmand ou cítrico? Descubra o seu perfil.','Cada família olfativa desperta uma sensação diferente. Neste guia explicamos as principais e damos exemplos...','Guia de fragrâncias','Equipe Oud Royale'),
 ('Rotina de skincare em 4 passos','rotina-skincare-4-passos','Simples, eficiente e para todos os tipos de pele.','Limpeza, tratamento, hidratação e proteção solar. Entenda a função de cada etapa...','Skincare','Equipe Oud Royale');

-- CUPONS
INSERT INTO public.coupons (code, type, value, min_order, active) VALUES
 ('BEMVINDO10','percent',10,199,true),
 ('ROYALE50','fixed',50,499,true);