-- Traductions des options produit (variantes)
-- Exécuter dans Supabase SQL Editor.

ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS name_fr TEXT,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_es TEXT,
  ADD COLUMN IF NOT EXISTS name_de TEXT,
  ADD COLUMN IF NOT EXISTS names_i18n JSONB DEFAULT '{}'::jsonb;

-- Backfill minimal depuis name existant
UPDATE public.product_options
SET name_fr = COALESCE(NULLIF(name_fr, ''), name)
WHERE COALESCE(name_fr, '') = '';
