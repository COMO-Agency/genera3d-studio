
-- Fix protect_profile_fields to respect admin_bypass
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow bypass for admin operations (migrations, handle_new_user, etc.)
  IF current_setting('app.admin_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;
  -- Prevent users from changing org_id or role via direct update
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    NEW.org_id := OLD.org_id;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$function$;

-- Re-run fix for existing users without org_id
DO $$
DECLARE
  r RECORD;
  v_org_id uuid;
  v_key text;
BEGIN
  FOR r IN SELECT id, full_name, email FROM profiles WHERE org_id IS NULL
  LOOP
    v_key := 'G3D-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
    
    INSERT INTO organizations (name, license_key)
    VALUES (COALESCE(r.full_name, split_part(r.email, '@', 1), 'Meine Organisation'), v_key)
    RETURNING id INTO v_org_id;

    PERFORM set_config('app.admin_bypass', 'true', true);
    UPDATE profiles SET org_id = v_org_id WHERE id = r.id;
    PERFORM set_config('app.admin_bypass', 'false', true);
  END LOOP;
END;
$$;
