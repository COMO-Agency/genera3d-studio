
-- Assign admin role to admin@genera.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('65ef2021-2093-4402-95b6-fabab530cacf', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Seed 10 test GTINs for Genera3D Optik GmbH
INSERT INTO public.gtin_pool (owner_type, owner_id, gtin_value)
VALUES
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000010'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000027'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000034'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000041'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000058'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000065'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000072'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000089'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000096'),
  ('org', '946f07a0-ae0e-4917-bc04-db39897d3d48', '04012345000102')
ON CONFLICT DO NOTHING;
