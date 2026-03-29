
-- Update designs with weight_g and glb_preview_url
UPDATE designs SET weight_g = 12.5, glb_preview_url = '/designs/brusset-aviator.png' WHERE id = '8315b427-fd83-4c60-8ea6-3307cfa30fc2';
UPDATE designs SET weight_g = 15.2, glb_preview_url = '/designs/brusset-oversized.png' WHERE id = 'bc0fb1fb-3c57-4a53-b27d-c6894363ba9f';
UPDATE designs SET weight_g = 9.8, glb_preview_url = '/designs/fs-bio-curve.png' WHERE id = 'd4b9b8ae-f405-45e0-a6df-c0d6e14061c7';
UPDATE designs SET weight_g = 8.4, glb_preview_url = '/designs/fs-geometric-slim.png' WHERE id = '9fdca447-e307-433c-a78c-845d0f68557c';
UPDATE designs SET weight_g = 7.1, glb_preview_url = '/designs/fs-minimal-wire.png' WHERE id = '1e2aea68-9275-4662-a328-24263d991c96';
UPDATE designs SET weight_g = 11.3, glb_preview_url = '/designs/fs-retro-pilot.png' WHERE id = 'cda934bf-de95-4623-8bd4-6e145c8c746c';
UPDATE designs SET weight_g = 12.5, glb_preview_url = '/designs/modell-berlin-v1.png' WHERE id = '040f2f0c-c859-4a25-8e15-401da166a8d5';
UPDATE designs SET weight_g = 10.6, glb_preview_url = '/designs/ph-angular-frame.png' WHERE id = '9e45c9cb-1548-4302-95e3-72deda49b5bc';
UPDATE designs SET weight_g = 9.2, glb_preview_url = '/designs/ph-classic-round.png' WHERE id = '977ae6a4-8172-476f-9f45-edb030039aad';
UPDATE designs SET weight_g = 14.8, glb_preview_url = '/designs/ph-titanium-bridge.png' WHERE id = 'ff163c5c-78b8-48d5-a042-455ad08585e5';

-- Insert demo production_logs (last 7 days)
INSERT INTO production_logs (org_id, design_id, mode, assigned_udi_pi, full_udi_string, status, created_at) VALUES
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', 'd4b9b8ae-f405-45e0-a6df-c0d6e14061c7', 'series', '260209A1B2C3', '(01)04260000000017(11)260209(21)260209A1B2C3', 'printed', now() - interval '30 minutes'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', '977ae6a4-8172-476f-9f45-edb030039aad', 'series', '260208D4E5F6', '(01)04260000000024(11)260208(21)260208D4E5F6', 'printed', now() - interval '3 hours'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', '8315b427-fd83-4c60-8ea6-3307cfa30fc2', 'series', '260208G7H8I9', '(01)04260000000031(11)260208(21)260208G7H8I9', 'failed', now() - interval '8 hours'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', '040f2f0c-c859-4a25-8e15-401da166a8d5', 'custom', 'CUSTOM-001', 'CUSTOM-DEVICE-ART-21', 'printed', now() - interval '1 day'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', 'cda934bf-de95-4623-8bd4-6e145c8c746c', 'series', '260206J1K2L3', '(01)04260000000048(11)260206(21)260206J1K2L3', 'printed', now() - interval '26 hours'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', 'ff163c5c-78b8-48d5-a042-455ad08585e5', 'series', '260205M4N5O6', '(01)04260000000055(11)260205(21)260205M4N5O6', 'printed', now() - interval '2 days'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', '9fdca447-e307-433c-a78c-845d0f68557c', 'custom', 'CUSTOM-002', 'CUSTOM-DEVICE-ART-21', 'failed', now() - interval '3 days'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', 'bc0fb1fb-3c57-4a53-b27d-c6894363ba9f', 'series', '260203P7Q8R9', '(01)04260000000062(11)260203(21)260203P7Q8R9', 'printed', now() - interval '4 days'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', '9e45c9cb-1548-4302-95e3-72deda49b5bc', 'series', '260202S1T2U3', '(01)04260000000079(11)260202(21)260202S1T2U3', 'printed', now() - interval '5 days'),
  ('946f07a0-ae0e-4917-bc04-db39897d3d48', '1e2aea68-9275-4662-a328-24263d991c96', 'series', '260201V4W5X6', '(01)04260000000086(11)260201(21)260201V4W5X6', 'printed', now() - interval '6 days');
