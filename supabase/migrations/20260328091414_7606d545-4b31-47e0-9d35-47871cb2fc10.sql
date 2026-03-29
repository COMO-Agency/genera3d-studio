-- RPC: Create organization (admin only)
CREATE OR REPLACE FUNCTION public.create_organization(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_key text;
  v_seg1 text;
  v_seg2 text;
  v_seg3 text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Nur Plattform-Admins dürfen Organisationen erstellen.';
  END IF;

  v_seg1 := upper(substr(md5(random()::text), 1, 4));
  v_seg2 := upper(substr(md5(random()::text), 1, 4));
  v_seg3 := upper(substr(md5(random()::text), 1, 4));
  v_key := 'G3D-' || v_seg1 || '-' || v_seg2 || '-' || v_seg3;

  -- Set bypass so trigger allows insert with name/license_key
  PERFORM set_config('app.admin_bypass', 'true', true);

  INSERT INTO organizations (name, license_key)
  VALUES (p_name, v_key)
  RETURNING id INTO v_org_id;

  PERFORM set_config('app.admin_bypass', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'id', v_org_id,
    'name', p_name,
    'license_key', v_key
  );
END;
$$;

-- RPC: Update organization name (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_organization(p_org_id uuid, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Nur Plattform-Admins dürfen Organisationen bearbeiten.';
  END IF;

  PERFORM set_config('app.admin_bypass', 'true', true);

  UPDATE organizations SET name = p_name WHERE id = p_org_id;

  PERFORM set_config('app.admin_bypass', 'false', true);

  RETURN jsonb_build_object('success', true, 'id', p_org_id, 'name', p_name);
END;
$$;

-- Fix protect_org_fields to allow admin bypass
CREATE OR REPLACE FUNCTION public.protect_org_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.admin_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;
  NEW.name := OLD.name;
  NEW.license_key := OLD.license_key;
  RETURN NEW;
END;
$$;

-- INSERT policy for admins on organizations
CREATE POLICY "Admins can insert organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));