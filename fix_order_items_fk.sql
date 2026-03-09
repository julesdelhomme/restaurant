-- Diagnostic : quelles tables "order item" existent dans public ?
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('order_items', 'order_item', 'orders');

-- Vérification des FK si public.order_items existe
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'order_items'
  AND con.contype = 'f';

-- Crée la relation public.order_items(order_id) -> public.orders(id) si la table existe
DO $$
BEGIN
  IF to_regclass('public.order_items') IS NULL THEN
    RAISE NOTICE 'Table public.order_items introuvable. Aucune FK créée.';
    RETURN;
  END IF;

  IF to_regclass('public.orders') IS NULL THEN
    RAISE NOTICE 'Table public.orders introuvable. Aucune FK créée.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_order'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT fk_order
      FOREIGN KEY (order_id)
      REFERENCES public.orders(id);
  ELSE
    RAISE NOTICE 'FK fk_order déjà présente sur public.order_items.';
  END IF;
END $$;
