
-- 1. Admins can view all organizations (needed for GTIN import page)
CREATE POLICY "Admins can view all organizations"
ON public.organizations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create regulatory-docs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('regulatory-docs', 'regulatory-docs', true);

-- 3. Allow public read access to regulatory-docs
CREATE POLICY "Public read regulatory docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'regulatory-docs');

-- 4. Admins can upload regulatory docs
CREATE POLICY "Admins upload regulatory docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'regulatory-docs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update regulatory docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'regulatory-docs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete regulatory docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'regulatory-docs' AND has_role(auth.uid(), 'admin'::app_role));
