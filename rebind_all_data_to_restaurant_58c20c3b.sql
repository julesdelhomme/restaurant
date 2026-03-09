-- Rebind existing data to restaurant:
-- 58c20c3b-9cea-4c9a-9f89-9a0d4068890c
--
-- This script is idempotent and schema-tolerant:
-- - Detects whether columns exist
-- - Handles uuid/text restaurant reference columns
-- - Rebinds all rows in target tables to the target restaurant id

-- 1) Quick schema diagnostic
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'restaurants',
    'menu_items',
    'dishes',
    'table_assignments',
    'categories',
    'subcategories'
  )
  AND column_name IN ('id', 'restaurant_id', 'id_restaurant', 'owner_id', 'name')
ORDER BY table_name, column_name;

DO $$
DECLARE
  target_uuid CONSTANT uuid := '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
  target_text CONSTANT text := '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
  id_type text;
  has_target boolean := false;
  row_count bigint := 0;
  source_restaurant_id text;
BEGIN
  IF to_regclass('public.restaurants') IS NULL THEN
    RAISE EXCEPTION 'Table public.restaurants not found.';
  END IF;

  SELECT data_type
  INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'restaurants'
    AND column_name = 'id';

  EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.restaurants WHERE id::text = $1)'
  INTO has_target
  USING target_text;

  EXECUTE 'SELECT count(*) FROM public.restaurants'
  INTO row_count;

  IF NOT has_target THEN
    -- If there is exactly one restaurant row, repoint it to target id.
    IF row_count = 1 THEN
      BEGIN
        IF id_type = 'uuid' THEN
          EXECUTE 'UPDATE public.restaurants SET id = $1::uuid WHERE id::text <> $2'
          USING target_uuid, target_text;
        ELSE
          EXECUTE 'UPDATE public.restaurants SET id = $1 WHERE id::text <> $1'
          USING target_text;
        END IF;
        has_target := true;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not rewrite restaurants.id to target id (keeping existing rows): %', SQLERRM;
      END;
    END IF;
  END IF;

  IF NOT has_target THEN
    -- Create target row when still missing.
    IF id_type = 'uuid' THEN
      INSERT INTO public.restaurants (id, name)
      VALUES (target_uuid, 'Mon Restaurant')
      ON CONFLICT (id) DO NOTHING;
    ELSE
      EXECUTE $sql$
        INSERT INTO public.restaurants (id, name)
        VALUES ($1, 'Mon Restaurant')
        ON CONFLICT (id) DO NOTHING
      $sql$ USING target_text;
    END IF;
  END IF;

  -- Copy config fields from another row only if target field is empty.
  SELECT r.id::text
  INTO source_restaurant_id
  FROM public.restaurants r
  WHERE r.id::text <> target_text
  ORDER BY r.id::text
  LIMIT 1;

  IF source_restaurant_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='restaurants' AND column_name='name') THEN
      EXECUTE '
        UPDATE public.restaurants t
        SET name = COALESCE(NULLIF(t.name, ''''), s.name)
        FROM public.restaurants s
        WHERE t.id::text = $1 AND s.id::text = $2
      ' USING target_text, source_restaurant_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='restaurants' AND column_name='logo_url') THEN
      EXECUTE '
        UPDATE public.restaurants t
        SET logo_url = COALESCE(NULLIF(t.logo_url, ''''), s.logo_url)
        FROM public.restaurants s
        WHERE t.id::text = $1 AND s.id::text = $2
      ' USING target_text, source_restaurant_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='restaurants' AND column_name='primary_color') THEN
      EXECUTE '
        UPDATE public.restaurants t
        SET primary_color = COALESCE(NULLIF(t.primary_color, ''''), s.primary_color)
        FROM public.restaurants s
        WHERE t.id::text = $1 AND s.id::text = $2
      ' USING target_text, source_restaurant_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='restaurants' AND column_name='card_bg_color') THEN
      EXECUTE '
        UPDATE public.restaurants t
        SET card_bg_color = COALESCE(NULLIF(t.card_bg_color, ''''), s.card_bg_color)
        FROM public.restaurants s
        WHERE t.id::text = $1 AND s.id::text = $2
      ' USING target_text, source_restaurant_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='restaurants' AND column_name='banner_image_url') THEN
      EXECUTE '
        UPDATE public.restaurants t
        SET banner_image_url = COALESCE(NULLIF(t.banner_image_url, ''''), s.banner_image_url)
        FROM public.restaurants s
        WHERE t.id::text = $1 AND s.id::text = $2
      ' USING target_text, source_restaurant_id;
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  tbl text;
  col_type text;
BEGIN
  -- Requested core tables
  FOREACH tbl IN ARRAY ARRAY['menu_items', 'dishes', 'table_assignments', 'categories', 'subcategories'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'Table public.% not found, skipped.', tbl;
      CONTINUE;
    END IF;

    -- Ensure restaurant_id exists (uuid by default)
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'restaurant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN restaurant_id UUID', tbl);
    END IF;

    -- Update restaurant_id with proper casting by real column type
    SELECT data_type
    INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = tbl
      AND column_name = 'restaurant_id';

    IF col_type = 'uuid' THEN
      EXECUTE format(
        'UPDATE public.%I SET restaurant_id = $1::uuid WHERE restaurant_id IS DISTINCT FROM $1::uuid',
        tbl
      ) USING '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET restaurant_id = $1 WHERE restaurant_id::text IS DISTINCT FROM $1',
        tbl
      ) USING '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
    END IF;

    -- Keep id_restaurant in sync if present
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'id_restaurant'
    ) THEN
      SELECT data_type
      INTO col_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'id_restaurant';

      IF col_type = 'uuid' THEN
        EXECUTE format(
          'UPDATE public.%I SET id_restaurant = $1::uuid WHERE id_restaurant IS DISTINCT FROM $1::uuid',
          tbl
        ) USING '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
      ELSE
        EXECUTE format(
          'UPDATE public.%I SET id_restaurant = $1 WHERE id_restaurant::text IS DISTINCT FROM $1',
          tbl
        ) USING '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
      END IF;
    END IF;
  END LOOP;
END $$;

-- 2) Final control counts
DO $$
DECLARE
  tbl text;
  total_rows bigint;
  scoped_rows bigint;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['menu_items', 'dishes', 'table_assignments', 'categories', 'subcategories'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'Check %: table missing.', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO total_rows;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='restaurant_id'
    ) THEN
      EXECUTE format(
        'SELECT count(*) FROM public.%I WHERE restaurant_id::text = $1',
        tbl
      ) INTO scoped_rows USING '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='id_restaurant'
    ) THEN
      EXECUTE format(
        'SELECT count(*) FROM public.%I WHERE id_restaurant::text = $1',
        tbl
      ) INTO scoped_rows USING '58c20c3b-9cea-4c9a-9f89-9a0d4068890c';
    ELSE
      scoped_rows := 0;
    END IF;

    RAISE NOTICE 'Check %: total=% / scoped_to_target=%', tbl, total_rows, scoped_rows;
  END LOOP;
END $$;
