-- Ajout des options/variantes produit + badges promo/suggestion.
-- A exÃ©cuter dans Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Colonnes badges/prix promo sur les plats
ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS is_promo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS is_suggestion BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);

-- Table des variantes (liÃ©e aux plats existants)
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_override NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_options_product_id_idx
ON public.product_options (product_id);

CREATE INDEX IF NOT EXISTS product_options_name_idx
ON public.product_options (name);

-- RLS
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_options_public_select ON public.product_options;
DROP POLICY IF EXISTS product_options_owner_insert ON public.product_options;
DROP POLICY IF EXISTS product_options_owner_update ON public.product_options;
DROP POLICY IF EXISTS product_options_owner_delete ON public.product_options;

-- Lecture publique (menu client)
CREATE POLICY product_options_public_select
ON public.product_options
FOR SELECT
TO anon, authenticated
USING (true);

-- Ecriture rÃ©servÃ©e au propriÃ©taire du restaurant du plat
CREATE POLICY product_options_owner_insert
ON public.product_options
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dishes d
    JOIN public.restaurants r ON r.id = d.restaurant_id
    WHERE d.id = product_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY product_options_owner_update
ON public.product_options
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.dishes d
    JOIN public.restaurants r ON r.id = d.restaurant_id
    WHERE d.id = product_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dishes d
    JOIN public.restaurants r ON r.id = d.restaurant_id
    WHERE d.id = product_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY product_options_owner_delete
ON public.product_options
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.dishes d
    JOIN public.restaurants r ON r.id = d.restaurant_id
    WHERE d.id = product_id
      AND r.owner_id = auth.uid()
  )
);

