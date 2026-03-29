
-- RPC function: join_organization via license key
CREATE OR REPLACE FUNCTION public.join_organization(p_license_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_user_id uuid;
  v_current_org uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has an org
  SELECT org_id INTO v_current_org FROM profiles WHERE id = v_user_id;
  IF v_current_org IS NOT NULL THEN
    RAISE EXCEPTION 'Du bist bereits einer Organisation zugeordnet.';
  END IF;

  -- Find org by license key
  SELECT id, name INTO v_org_id, v_org_name
  FROM organizations
  WHERE license_key = p_license_key;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Ungültiger License Key.';
  END IF;

  -- Update profile with org_id
  UPDATE profiles SET org_id = v_org_id WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_org_id,
    'org_name', v_org_name
  );
END;
$$;
