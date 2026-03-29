
-- ============================================
-- These 1: QC-Workflow als atomare RPC-Funktion
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_qc_check(
  p_production_log_id uuid,
  p_checklist_items jsonb,
  p_passed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_qc_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
  END IF;

  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Keine Organisation zugeordnet.';
  END IF;

  -- Verify the production log belongs to the user's org
  IF NOT EXISTS (
    SELECT 1 FROM production_logs WHERE id = p_production_log_id AND org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Produktionseintrag nicht gefunden oder keine Berechtigung.';
  END IF;

  -- Insert QC check
  INSERT INTO qc_checks (production_log_id, org_id, checklist_items, passed, checked_by)
  VALUES (p_production_log_id, v_org_id, p_checklist_items, p_passed, v_user_id)
  RETURNING id INTO v_qc_id;

  -- Update production log status atomically
  UPDATE production_logs
  SET status = CASE WHEN p_passed THEN 'qc_passed' ELSE 'qc_failed' END
  WHERE id = p_production_log_id AND org_id = v_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'qc_id', v_qc_id,
    'passed', p_passed
  );
END;
$$;

-- ============================================
-- These 2: RLS-Policies verschärfen
-- ============================================

-- profiles: Restrict UPDATE to only full_name
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create a trigger to prevent changing org_id and role from client
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from changing org_id or role via direct update
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    NEW.org_id := OLD.org_id;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_fields();

-- organizations: Restrict UPDATE to only settings column
DROP POLICY IF EXISTS "Users update own org settings" ON public.organizations;
CREATE POLICY "Users update own org settings"
ON public.organizations
FOR UPDATE
USING (id = get_user_org_id(auth.uid()))
WITH CHECK (id = get_user_org_id(auth.uid()));

-- Create a trigger to prevent changing sensitive org fields from client
CREATE OR REPLACE FUNCTION public.protect_org_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow settings to be changed via direct update
  NEW.name := OLD.name;
  NEW.license_key := OLD.license_key;
  NEW.udi_credits := OLD.udi_credits;
  NEW.custom_counter := OLD.custom_counter;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_org_fields_trigger ON public.organizations;
CREATE TRIGGER protect_org_fields_trigger
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.protect_org_fields();
