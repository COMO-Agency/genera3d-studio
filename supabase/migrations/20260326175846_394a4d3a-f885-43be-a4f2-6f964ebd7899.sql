ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS construction_type text DEFAULT 'full_frame',
  ADD COLUMN IF NOT EXISTS serial_prefix text,
  ADD COLUMN IF NOT EXISTS fixed_gtin text;