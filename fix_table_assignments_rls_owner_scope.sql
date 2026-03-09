-- RLS SIMPLE (authenticated) pour les tables de travail.
-- Cible demandée: table_assignments, orders, menu_items.
-- Le script est idempotent et ignore les tables absentes.

-- Diagnostic rapide (à lire dans la console SQL Supabase)
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('table_assignments', 'orders', 'menu_items')
ORDER BY tablename;

DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY['table_assignments', 'orders', 'menu_items'];
  policy_select text;
  policy_insert text;
  policy_update text;
  policy_delete text;
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'Table public.% introuvable -> ignorée', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', tbl);

    policy_select := tbl || '_auth_select_all';
    policy_insert := tbl || '_auth_insert_all';
    policy_update := tbl || '_auth_update_all';
    policy_delete := tbl || '_auth_delete_all';

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_select, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_insert, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_update, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_delete, tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      policy_select,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
      policy_insert,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      policy_update,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',
      policy_delete,
      tbl
    );
  END LOOP;
END $$;
