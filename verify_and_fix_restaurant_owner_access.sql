-- Verify + fix owner link for Manager access (2 restaurants)
-- 1) Replace ONLY v_owner_id_text below with auth.users.id UUID of the owner
--
-- Tip: list users first
-- SELECT id, email, created_at
-- FROM auth.users
-- ORDER BY created_at DESC;

DO $$
DECLARE
  v_restaurant_ids_text text[] := ARRAY[
    '58c20c3b-9cea-4c9a-9f89-9a0d4068890c',
    '98278c0d-0fe5-4347-872a-fbbf320ffe88'
  ];
  v_owner_id_text text := 'OWNER_USER_UUID_HERE';
  v_restaurant_ids uuid[];
  v_owner_id uuid;
  v_count_existing integer;
BEGIN
  -- Validate restaurant UUID inputs
  IF EXISTS (
    SELECT 1
    FROM unnest(v_restaurant_ids_text) AS rid
    WHERE rid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'One of v_restaurant_ids_text values is not a valid UUID: %', v_restaurant_ids_text;
  END IF;

  -- Validate owner UUID input
  IF v_owner_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Replace v_owner_id_text with a valid UUID (auth.users.id). Current value: %', v_owner_id_text;
  END IF;

  v_restaurant_ids := ARRAY(
    SELECT rid::uuid
    FROM unnest(v_restaurant_ids_text) AS rid
  );
  v_owner_id := v_owner_id_text::uuid;

  -- Ensure all target restaurants exist
  SELECT COUNT(*) INTO v_count_existing
  FROM public.restaurants
  WHERE id = ANY(v_restaurant_ids);

  IF v_count_existing <> array_length(v_restaurant_ids, 1) THEN
    RAISE EXCEPTION 'Some restaurant IDs were not found. Expected %, found %.',
      array_length(v_restaurant_ids, 1), v_count_existing;
  END IF;

  -- Ensure target owner exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_owner_id) THEN
    RAISE EXCEPTION 'Owner user not found in auth.users for id %', v_owner_id;
  END IF;

  -- Show current link
  RAISE NOTICE 'Before update:';
  PERFORM 1;

  -- Apply owner link to both restaurants
  UPDATE public.restaurants
  SET owner_id = v_owner_id
  WHERE id = ANY(v_restaurant_ids);

  RAISE NOTICE 'Owner link updated for restaurants % -> owner %', v_restaurant_ids, v_owner_id;
END $$;

-- Optional check after update
SELECT r.id, r.name, r.owner_id
FROM public.restaurants r
WHERE r.id IN (
  '58c20c3b-9cea-4c9a-9f89-9a0d4068890c'::uuid,
  '98278c0d-0fe5-4347-872a-fbbf320ffe88'::uuid
);

-- Enforce RLS on restaurants (owner scoped)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restaurants_owner_select ON public.restaurants;
DROP POLICY IF EXISTS restaurants_owner_update ON public.restaurants;
DROP POLICY IF EXISTS restaurants_owner_insert ON public.restaurants;

CREATE POLICY restaurants_owner_select
ON public.restaurants
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY restaurants_owner_update
ON public.restaurants
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY restaurants_owner_insert
ON public.restaurants
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());
