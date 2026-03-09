-- Active/désactive un restaurant globalement
-- Exécuter dans Supabase SQL Editor

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.restaurants
SET is_active = TRUE
WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS restaurants_is_active_idx
ON public.restaurants (is_active);

