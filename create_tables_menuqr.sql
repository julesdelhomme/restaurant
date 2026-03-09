-- TABLE DES PLATS (dishes)
CREATE TABLE IF NOT EXISTS dishes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_de TEXT,
  description TEXT,
  description_en TEXT,
  description_es TEXT,
  description_de TEXT,
  price NUMERIC(8,2) NOT NULL,
  categorie TEXT,
  allergens TEXT,
  image_url TEXT,
  calories_min INTEGER,
  calories_max INTEGER,
  is_available BOOLEAN DEFAULT TRUE,
  has_sides BOOLEAN DEFAULT FALSE,
  has_extras BOOLEAN DEFAULT FALSE,
  dietary_tag JSONB,
  sub_category TEXT,
  cooking_options JSONB,
  ask_cooking BOOLEAN DEFAULT FALSE,
  max_options INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE
);

ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS max_options INTEGER DEFAULT 1;

-- TABLE DES SOUS-CATEGORIES MULTILINGUES
CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_de TEXT
);

-- BIBLIOTHEQUE GLOBALE DES ACCOMPAGNEMENTS
CREATE TABLE IF NOT EXISTS sides_library (
  id SERIAL PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_de TEXT,
  price NUMERIC(8,2),
  category_id UUID NULL
);

ALTER TABLE sides_library
ADD COLUMN IF NOT EXISTS category_id UUID NULL;

ALTER TABLE sides_library
ADD COLUMN IF NOT EXISTS price NUMERIC(8,2);

ALTER TABLE sides_library
DROP CONSTRAINT IF EXISTS sides_library_category_id_fkey;

ALTER TABLE sides_library
ADD CONSTRAINT sides_library_category_id_fkey
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- TABLE DES COMMANDES (orders)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_number INTEGER NOT NULL,
  items JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- TABLE DES NOTIFICATIONS (notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_number INTEGER,
  status TEXT DEFAULT 'pending',
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE DES RESTAURANTS (restaurants)
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  background_url TEXT,
  primary_color TEXT,
  rush_delay_minutes INTEGER
);

-- TABLE DES TABLES (table_assignments)
CREATE TABLE IF NOT EXISTS table_assignments (
  table_number INTEGER PRIMARY KEY,
  pin_code TEXT
);

-- Indexation et contraintes
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_dishes_is_available ON dishes(is_available);

-- POLICIES (DEV ONLY): autoriser lecture/�criture si RLS bloque
-- � retirer en production si vous avez un syst�me d�auth complet.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read orders" ON orders;
DROP POLICY IF EXISTS "public insert orders" ON orders;
DROP POLICY IF EXISTS "public update orders" ON orders;
CREATE POLICY "public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "public update orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read notifications" ON notifications;
DROP POLICY IF EXISTS "public insert notifications" ON notifications;
DROP POLICY IF EXISTS "public update notifications" ON notifications;
CREATE POLICY "public read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public update notifications" ON notifications FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read table_assignments" ON table_assignments;
DROP POLICY IF EXISTS "public insert table_assignments" ON table_assignments;
DROP POLICY IF EXISTS "public update table_assignments" ON table_assignments;
DROP POLICY IF EXISTS "public delete table_assignments" ON table_assignments;
CREATE POLICY "public read table_assignments" ON table_assignments FOR SELECT USING (true);
CREATE POLICY "public insert table_assignments" ON table_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "public update table_assignments" ON table_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete table_assignments" ON table_assignments FOR DELETE USING (true);
