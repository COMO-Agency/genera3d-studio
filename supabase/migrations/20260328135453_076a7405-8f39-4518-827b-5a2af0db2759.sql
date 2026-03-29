
-- 1. Update handle_new_user to auto-create an organization for every new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_key text;
  v_name text;
BEGIN
  -- Generate license key
  v_key := 'G3D-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
  
  -- Use full_name or email as org name
  v_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));

  -- Create organization
  INSERT INTO public.organizations (name, license_key)
  VALUES (v_name, v_key)
  RETURNING id INTO v_org_id;

  -- Create profile linked to the new org
  INSERT INTO public.profiles (id, full_name, email, org_id)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email, v_org_id);

  RETURN NEW;
END;
$function$;

-- 2. Fix existing users without org_id: create an org for each and assign it
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

    -- Bypass the protect_profile_fields trigger by using a direct update via admin bypass
    PERFORM set_config('app.admin_bypass', 'true', true);
    UPDATE profiles SET org_id = v_org_id WHERE id = r.id;
    PERFORM set_config('app.admin_bypass', 'false', true);
  END LOOP;
END;
$$;
