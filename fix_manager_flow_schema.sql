-- Stabilisation des colonnes utilisees par le Manager/Serveur.
-- Executer dans Supabase SQL Editor.

-- 1) Dishes: colonnes de mise en avant (compatibilite ancien/nouveau schema).
ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS is_chef_suggestion BOOLEAN DEFAULT FALSE;

ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS is_suggestion BOOLEAN DEFAULT FALSE;

ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS chef_suggestion BOOLEAN DEFAULT FALSE;

ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS is_daily_special BOOLEAN DEFAULT FALSE;

ALTER TABLE public.dishes
ADD COLUMN IF NOT EXISTS is_special BOOLEAN DEFAULT FALSE;

-- Harmonise les flags existants pour eviter les incoherences d'affichage.
UPDATE public.dishes
SET
  is_chef_suggestion = COALESCE(is_chef_suggestion, is_suggestion, chef_suggestion, is_featured, FALSE),
  is_suggestion = COALESCE(is_suggestion, is_chef_suggestion, chef_suggestion, is_featured, FALSE),
  chef_suggestion = COALESCE(chef_suggestion, is_chef_suggestion, is_suggestion, is_featured, FALSE),
  is_daily_special = COALESCE(is_daily_special, is_special, FALSE),
  is_special = COALESCE(is_special, is_daily_special, FALSE);

-- 2) Tables: applique seulement si la relation public.tables existe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tables'
  ) THEN
    ALTER TABLE public.tables
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disponible';

    UPDATE public.tables
    SET status = 'disponible'
    WHERE status IS NULL;
  END IF;
END $$;
