ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT TRUE;

UPDATE public.restaurants
SET first_login = TRUE
WHERE first_login IS NULL;

