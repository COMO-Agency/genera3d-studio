
-- Seed Organization
INSERT INTO public.organizations (name, udi_credits, custom_counter, license_key)
VALUES ('Genera3D Optik GmbH', 150, 23, 'G3D-7F42-9B1E-3C8D');

-- Seed Frameshaper collection
INSERT INTO public.collections (name, brand_code) VALUES ('Frameshaper', 'FSH');

-- Seed more designs for Philipp Haffmanns
INSERT INTO public.designs (name, master_udi_di_base, collection_id, version)
VALUES 
  ('PH-Classic Round', 'PHA-BER-002', '7e11d32b-f4ae-4e4f-ab5c-b19280f24dc4', 2),
  ('PH-Titanium Bridge', 'PHA-BER-003', '7e11d32b-f4ae-4e4f-ab5c-b19280f24dc4', 1),
  ('PH-Angular Frame', 'PHA-BER-004', '7e11d32b-f4ae-4e4f-ab5c-b19280f24dc4', 3);

-- Seed designs for Brusset
INSERT INTO public.designs (name, master_udi_di_base, collection_id, version)
VALUES 
  ('Brusset Aviator', 'BRU-AVI-001', '14f35fb7-949d-49fb-9692-afbc1c06dac4', 2),
  ('Brusset Oversized', 'BRU-OVR-001', '14f35fb7-949d-49fb-9692-afbc1c06dac4', 1);
