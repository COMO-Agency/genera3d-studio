-- These 1: Link all profiles without org to the existing organization
UPDATE profiles SET org_id = '946f07a0-ae0e-4917-bc04-db39897d3d48' WHERE org_id IS NULL;

-- These 4: Seed existing production logs with realistic colors
UPDATE production_logs SET color = 
  CASE (floor(random() * 3))::int 
    WHEN 0 THEN 'black' 
    WHEN 1 THEN 'transparent' 
    ELSE 'havana' 
  END 
WHERE color IS NULL;