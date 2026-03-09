-- Compteur de vues QR vitrine (affichage exterieur)
-- Executer dans Supabase SQL Editor

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS views_vitrine INTEGER NOT NULL DEFAULT 0;

UPDATE public.restaurants
SET views_vitrine = 0
WHERE views_vitrine IS NULL;
