ALTER TABLE production_logs DROP CONSTRAINT production_logs_mode_check;
ALTER TABLE production_logs ADD CONSTRAINT production_logs_mode_check
  CHECK (mode = ANY (ARRAY['series', 'custom', 'sunglasses']));