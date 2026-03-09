ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS primary_color TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS card_bg_color TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
