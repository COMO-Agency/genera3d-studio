
-- Fix orphaned logs
UPDATE production_logs SET org_id = '946f07a0-ae0e-4917-bc04-db39897d3d48' WHERE org_id IS NULL;

-- Fix profile data (role must be admin/optician/trainee)
UPDATE profiles SET full_name = 'Demo User', role = 'optician' WHERE full_name IS NULL;

-- Realistic credits
UPDATE organizations SET udi_credits = 139 WHERE id = '946f07a0-ae0e-4917-bc04-db39897d3d48';
