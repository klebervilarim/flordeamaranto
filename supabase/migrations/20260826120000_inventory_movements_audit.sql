-- Wire up the previously-orphaned inventory_movements table as a real audit ledger,
-- and guard against negative stock at the database level (defense in depth).

ALTER TABLE public.inventory_movements
  ADD COLUMN previous_quantity int,
  ADD COLUMN new_quantity int,
  ADD CONSTRAINT inventory_movements_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
