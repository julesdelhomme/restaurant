ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS show_featured BOOLEAN DEFAULT TRUE;

UPDATE public.restaurants
SET show_featured = TRUE
WHERE show_featured IS NULL;
