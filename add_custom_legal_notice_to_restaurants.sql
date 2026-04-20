-- Add customizable legal notice for client legal welcome modal
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS custom_legal_notice text;
