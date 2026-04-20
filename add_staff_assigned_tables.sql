-- Ajoute la gestion des tables assignées par serveur.
-- Exécuter dans Supabase SQL Editor.

ALTER TABLE public.staff_accounts
ADD COLUMN IF NOT EXISTS assigned_tables JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Sécurise les valeurs historiques nulles.
UPDATE public.staff_accounts
SET assigned_tables = '[]'::jsonb
WHERE assigned_tables IS NULL;

