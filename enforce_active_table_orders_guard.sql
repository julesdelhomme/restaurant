CREATE OR REPLACE FUNCTION prevent_inactive_table_orders_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  active_pin text;
BEGIN
  BEGIN
    SELECT ta.pin_code
    INTO active_pin
    FROM table_assignments ta
    WHERE ta.table_number = NEW.table_number
    LIMIT 1;
  EXCEPTION
    WHEN undefined_column THEN
      active_pin := NULL;
  END;

  IF active_pin IS NULL THEN
    BEGIN
      SELECT ta.pin
      INTO active_pin
      FROM table_assignments ta
      WHERE ta.table_number = NEW.table_number
      LIMIT 1;
    EXCEPTION
      WHEN undefined_column THEN
        active_pin := NULL;
    END;
  END IF;

  IF active_pin IS NULL OR btrim(active_pin) = '' OR btrim(active_pin) = '0000' THEN
    RAISE EXCEPTION 'Table non active. Veuillez appeler un serveur.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_require_active_table ON orders;

CREATE TRIGGER trg_orders_require_active_table
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION prevent_inactive_table_orders_insert();
