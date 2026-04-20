ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS is_alcohol boolean DEFAULT false;
