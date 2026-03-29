
-- Create org_designs table for optician's own designs
CREATE TABLE public.org_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  image_url TEXT,
  lens_width_mm NUMERIC,
  bridge_width_mm NUMERIC,
  temple_length_mm NUMERIC,
  weight_g NUMERIC,
  master_udi_di_base TEXT,
  manufacturer_name TEXT,
  manufacturer_address TEXT,
  manufacturer_city TEXT,
  manufacturer_atu TEXT,
  manufacturer_contact TEXT,
  mdr_responsible_person TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.org_designs ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage designs of their own org
CREATE POLICY "Users manage own org designs"
ON public.org_designs
FOR ALL
USING (org_id = get_user_org_id(auth.uid()))
WITH CHECK (org_id = get_user_org_id(auth.uid()));

-- Storage bucket for design images
INSERT INTO storage.buckets (id, name, public) VALUES ('org-design-images', 'org-design-images', true);

-- Storage policies
CREATE POLICY "Users can upload own org design images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'org-design-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view org design images"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-design-images');

CREATE POLICY "Users can update own org design images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'org-design-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete own org design images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'org-design-images'
  AND auth.uid() IS NOT NULL
);
