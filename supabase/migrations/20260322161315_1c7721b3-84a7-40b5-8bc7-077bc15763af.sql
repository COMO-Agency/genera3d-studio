ALTER TABLE production_logs
  ADD COLUMN IF NOT EXISTS design_name text,
  ADD COLUMN IF NOT EXISTS design_udi_di_base text,
  ADD COLUMN IF NOT EXISTS design_version integer,
  ADD COLUMN IF NOT EXISTS color_name text;
