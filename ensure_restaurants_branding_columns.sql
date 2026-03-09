-- Verification + ajout des colonnes branding pour public.restaurants
-- A executer dans Supabase SQL Editor.

-- 1) Verifier les colonnes presentes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'restaurants'
  AND column_name IN (
    'logo_url',
    'banner_url',
    'banner_image_url',
    'background_image_url',
    'background_url',
    'primary_color',
    'text_color'
  )
ORDER BY column_name;

-- 2) Ajouter les colonnes manquantes
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS primary_color TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS text_color TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS background_image_url TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS background_url TEXT;

-- 3) Valeurs par défaut propres
ALTER TABLE public.restaurants
ALTER COLUMN primary_color SET DEFAULT '#FFFFFF';

UPDATE public.restaurants
SET primary_color = '#FFFFFF'
WHERE primary_color IS NULL OR TRIM(primary_color) = '';

ALTER TABLE public.restaurants
ALTER COLUMN text_color SET DEFAULT '#111111';

UPDATE public.restaurants
SET text_color = '#111111'
WHERE text_color IS NULL OR TRIM(text_color) = '';

-- 4) Synchroniser les anciennes/nouvelles colonnes pour compatibilite
UPDATE public.restaurants
SET banner_url = COALESCE(NULLIF(banner_url, ''), NULLIF(banner_image_url, ''))
WHERE COALESCE(NULLIF(banner_url, ''), NULLIF(banner_image_url, '')) IS NOT NULL;

UPDATE public.restaurants
SET banner_image_url = COALESCE(NULLIF(banner_image_url, ''), NULLIF(banner_url, ''))
WHERE COALESCE(NULLIF(banner_image_url, ''), NULLIF(banner_url, '')) IS NOT NULL;

UPDATE public.restaurants
SET background_image_url = COALESCE(NULLIF(background_image_url, ''), NULLIF(background_url, ''))
WHERE COALESCE(NULLIF(background_image_url, ''), NULLIF(background_url, '')) IS NOT NULL;

UPDATE public.restaurants
SET background_url = COALESCE(NULLIF(background_url, ''), NULLIF(background_image_url, ''))
WHERE COALESCE(NULLIF(background_url, ''), NULLIF(background_image_url, '')) IS NOT NULL;
