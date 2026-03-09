-- Comptes staff multi-rôles par restaurant
-- Exécuter ce script dans Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  normalized_identifier TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('server', 'cuisine', 'bar_caisse', 'manager')),
  plain_password TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_accounts
ADD COLUMN IF NOT EXISTS plain_password TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS staff_accounts_restaurant_identifier_uniq
ON public.staff_accounts (restaurant_id, normalized_identifier);

CREATE UNIQUE INDEX IF NOT EXISTS staff_accounts_auth_restaurant_uniq
ON public.staff_accounts (auth_user_id, restaurant_id);

CREATE INDEX IF NOT EXISTS staff_accounts_restaurant_idx
ON public.staff_accounts (restaurant_id);

CREATE INDEX IF NOT EXISTS staff_accounts_auth_user_idx
ON public.staff_accounts (auth_user_id);

ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_accounts_owner_select ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_owner_insert ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_owner_update ON public.staff_accounts;
DROP POLICY IF EXISTS staff_accounts_owner_delete ON public.staff_accounts;

CREATE POLICY staff_accounts_owner_select
ON public.staff_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY staff_accounts_owner_insert
ON public.staff_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY staff_accounts_owner_update
ON public.staff_accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY staff_accounts_owner_delete
ON public.staff_accounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_id
      AND r.owner_id = auth.uid()
  )
);
