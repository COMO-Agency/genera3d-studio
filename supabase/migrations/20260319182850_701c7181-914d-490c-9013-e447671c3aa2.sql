
-- Phase 1a: Add new columns to org_designs
ALTER TABLE public.org_designs
  ADD COLUMN IF NOT EXISTS collection text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS construction_type text DEFAULT 'full_frame',
  ADD COLUMN IF NOT EXISTS serial_prefix text,
  ADD COLUMN IF NOT EXISTS fixed_gtin text;

-- Add unique constraint on fixed_gtin (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS org_designs_fixed_gtin_unique ON public.org_designs (fixed_gtin) WHERE fixed_gtin IS NOT NULL;

-- Phase 1c: Storage bucket for signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-signatures', 'org-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for org-signatures bucket
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-signatures');

CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-signatures');

CREATE POLICY "Users can update own signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'org-signatures');

CREATE POLICY "Users can delete own signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-signatures');
