-- Créer la table table_assignments pour le système PIN
CREATE TABLE IF NOT EXISTS table_assignments (
  id SERIAL PRIMARY KEY,
  table_number INTEGER NOT NULL,
  pin VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restaurant_id INTEGER REFERENCES restaurants(id)
);

-- Insérer quelques exemples de PINs pour les tables
INSERT INTO table_assignments (table_number, pin, restaurant_id) VALUES
(1, '1234', 1),
(2, '5678', 1),
(3, '9012', 1),
(4, '3456', 1),
(5, '7890', 1)
ON CONFLICT (pin) DO NOTHING;