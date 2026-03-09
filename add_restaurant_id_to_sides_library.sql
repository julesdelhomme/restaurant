-- Scope sides_library rows by restaurant.
-- Run in Supabase SQL editor.

ALTER TABLE public.sides_library
ADD COLUMN IF NOT EXISTS restaurant_id UUID;

DO $$
BEGIN
  IF to_regclass('public.sides_library') IS NULL OR to_regclass('public.restaurants') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sides_library_restaurant_id_fkey'
      AND conrelid = 'public.sides_library'::regclass
  ) THEN
    ALTER TABLE public.sides_library
      ADD CONSTRAINT sides_library_restaurant_id_fkey
      FOREIGN KEY (restaurant_id)
      REFERENCES public.restaurants(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sides_library_restaurant_id
ON public.sides_library(restaurant_id);

-- Optional backfill: if there is exactly one restaurant, attach all orphan rows to it.
DO $$
DECLARE
  restaurant_count INTEGER;
  only_restaurant_id UUID;
BEGIN
  IF to_regclass('public.sides_library') IS NULL OR to_regclass('public.restaurants') IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO restaurant_count FROM public.restaurants;
  IF restaurant_count = 1 THEN
    SELECT id INTO only_restaurant_id FROM public.restaurants LIMIT 1;
    UPDATE public.sides_library
    SET restaurant_id = only_restaurant_id
    WHERE restaurant_id IS NULL;
  END IF;
END $$;

-- Enforce NOT NULL only when data is clean.
DO $$
BEGIN
  IF to_regclass('public.sides_library') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sides_library WHERE restaurant_id IS NULL) THEN
    ALTER TABLE public.sides_library
      ALTER COLUMN restaurant_id SET NOT NULL;
  END IF;
END $$;

