ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS owner_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurants_owner_id_fkey'
      AND conrelid = 'public.restaurants'::regclass
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_owner_id_fkey
      FOREIGN KEY (owner_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id
ON public.restaurants(owner_id);

