ALTER TABLE public.table_assignments
ADD COLUMN IF NOT EXISTS covers INTEGER;

ALTER TABLE public.table_assignments
ADD COLUMN IF NOT EXISTS guest_count INTEGER;

ALTER TABLE public.table_assignments
ADD COLUMN IF NOT EXISTS customer_count INTEGER;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS covers INTEGER;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS guest_count INTEGER;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_count INTEGER;
