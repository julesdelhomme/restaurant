-- Branding columns on restaurants (idempotent)
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS primary_color TEXT;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS card_bg_color TEXT;

-- Storage buckets for branding assets (public read)
INSERT INTO storage.buckets (id, name, public)
SELECT bucket_id, bucket_id, true
FROM (
  VALUES ('logos'), ('banners')
) AS buckets(bucket_id)
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets b WHERE b.id = buckets.bucket_id
);

-- RLS policies on storage.objects for branding assets
DROP POLICY IF EXISTS "branding_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "branding_assets_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "branding_assets_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "branding_assets_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "restaurant_assets_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "restaurant_assets_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "restaurant_assets_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "restaurant_assets_auth_delete" ON storage.objects;

-- Public read (logo/banner preview in client app)
CREATE POLICY "branding_assets_public_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('logos', 'banners'));

-- Authenticated upload
CREATE POLICY "branding_assets_auth_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('logos', 'banners'));

-- Authenticated replace/rename (required for upsert)
CREATE POLICY "branding_assets_auth_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id IN ('logos', 'banners'))
WITH CHECK (bucket_id IN ('logos', 'banners'));

-- Optional: allow authenticated delete during replacements/cleanup
CREATE POLICY "branding_assets_auth_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id IN ('logos', 'banners'));
