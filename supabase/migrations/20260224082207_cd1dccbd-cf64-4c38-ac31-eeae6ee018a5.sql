-- Create test label "Genera Eyewear"
INSERT INTO public.labels (name, slug, description, is_active)
VALUES ('Genera Eyewear', 'genera-eyewear', 'Genera Eyewear – Premium 3D-printed frames', true);

-- Link superadmin@genera.com as label_admin
INSERT INTO public.label_members (label_id, user_id, role)
VALUES (
  (SELECT id FROM public.labels WHERE slug = 'genera-eyewear'),
  '69e9e4cb-8371-4c34-acd6-c827f85b0164',
  'label_admin'
);