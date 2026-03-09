-- Garantit les colonnes de style dans public.restaurants
-- A executer dans Supabase SQL Editor.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS card_style text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS card_density text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS density_style text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS font_family text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS bg_opacity double precision;

-- Backfill avant contraintes pour eviter les erreurs de validation.
UPDATE public.restaurants
SET
  card_style = COALESCE(
    NULLIF(LOWER(TRIM(card_style)), ''),
    NULLIF(LOWER(TRIM((table_config::jsonb ->> 'card_style'))), ''),
    'rounded'
  ),
  card_density = COALESCE(
    NULLIF(LOWER(TRIM(card_density)), ''),
    NULLIF(LOWER(TRIM(density_style)), ''),
    NULLIF(LOWER(TRIM((table_config::jsonb ->> 'card_density'))), ''),
    NULLIF(LOWER(TRIM((table_config::jsonb ->> 'density_style'))), ''),
    'spacious'
  ),
  density_style = COALESCE(
    NULLIF(LOWER(TRIM(density_style)), ''),
    NULLIF(LOWER(TRIM(card_density)), ''),
    NULLIF(LOWER(TRIM((table_config::jsonb ->> 'density_style'))), ''),
    NULLIF(LOWER(TRIM((table_config::jsonb ->> 'card_density'))), ''),
    'spacious'
  ),
  font_family = COALESCE(
    NULLIF(TRIM(font_family), ''),
    NULLIF(TRIM((table_config::jsonb ->> 'font_family')), ''),
    'Montserrat'
  ),
  bg_opacity = COALESCE(
    CASE
      WHEN (table_config::jsonb ? 'bg_opacity') THEN
        NULLIF((table_config::jsonb ->> 'bg_opacity'), '')::double precision
      ELSE NULL
    END,
    bg_opacity,
    1.0
  );

-- Normalisation card_style.
UPDATE public.restaurants
SET card_style = CASE
  WHEN card_style IN ('sharp', 'pointu', 'carre', 'square', 'angled') THEN 'sharp'
  WHEN card_style IN ('rounded', 'arrondi', 'moderne', 'round') THEN 'rounded'
  ELSE 'rounded'
END;

-- Normalisation card_density + sync density_style legacy.
UPDATE public.restaurants
SET card_density = CASE
  WHEN card_density IN ('compact', 'compacte', 'dense') THEN 'compact'
  WHEN card_density IN ('spacious', 'spacieux', 'normal') THEN 'spacious'
  ELSE 'spacious'
END;

UPDATE public.restaurants
SET density_style = card_density;

-- Clamp bg_opacity (0.0 -> 1.0), et conversion des valeurs type pourcentage.
UPDATE public.restaurants
SET bg_opacity = CASE
  WHEN bg_opacity IS NULL THEN 1.0
  WHEN bg_opacity > 1.0 AND bg_opacity <= 100.0 THEN LEAST(1.0, GREATEST(0.0, bg_opacity / 100.0))
  ELSE LEAST(1.0, GREATEST(0.0, bg_opacity))
END;

ALTER TABLE public.restaurants
  ALTER COLUMN card_style SET DEFAULT 'rounded',
  ALTER COLUMN card_style SET NOT NULL,
  ALTER COLUMN card_density SET DEFAULT 'spacious',
  ALTER COLUMN card_density SET NOT NULL,
  ALTER COLUMN density_style SET DEFAULT 'spacious',
  ALTER COLUMN density_style SET NOT NULL,
  ALTER COLUMN font_family SET DEFAULT 'Montserrat',
  ALTER COLUMN font_family SET NOT NULL,
  ALTER COLUMN bg_opacity SET DEFAULT 1.0,
  ALTER COLUMN bg_opacity SET NOT NULL;

-- Contraintes (ajoute seulement si absentes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_card_style_check'
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_card_style_check
      CHECK (card_style IN ('rounded', 'sharp'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_card_density_check'
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_card_density_check
      CHECK (card_density IN ('compact', 'spacious'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_density_style_check'
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_density_style_check
      CHECK (density_style IN ('compact', 'spacious'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_bg_opacity_check'
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_bg_opacity_check
      CHECK (bg_opacity >= 0.0 AND bg_opacity <= 1.0);
  END IF;
END $$;
