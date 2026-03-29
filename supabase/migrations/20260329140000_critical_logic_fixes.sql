-- =============================================================================
-- Critical Logic Fixes — 29. März 2026
-- Fixes: join_organization trigger bypass, label-assets policies,
--        gtin_pool overly permissive policy, org-design-images public SELECT
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CRITICAL: join_organization must set admin_bypass
-- The protect_profile_fields trigger silently reverts org_id changes.
-- Without admin_bypass, join_organization returns success but the org_id
-- is NOT actually persisted, leaving the user without an organization.
-- ─────────────────────────────────────────────────────────────────────────────

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

  SELECT org_id INTO v_current_org FROM profiles WHERE id = v_user_id;
  IF v_current_org IS NOT NULL THEN
    RAISE EXCEPTION 'Du bist bereits einer Organisation zugeordnet.';
  END IF;

  SELECT id, name INTO v_org_id, v_org_name
  FROM organizations
  WHERE license_key = p_license_key;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Ungültiger License Key.';
  END IF;

  PERFORM set_config('app.admin_bypass', 'true', true);
  UPDATE profiles SET org_id = v_org_id WHERE id = v_user_id;
  PERFORM set_config('app.admin_bypass', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_org_id,
    'org_name', v_org_name
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HIGH: Restrict gtin_pool write access for org members
-- Current "Org members can manage own org gtin_pool" uses FOR ALL,
-- allowing any org member to INSERT/DELETE GTINs. Only admins and
-- label admins should manage GTINs. Regular org members only need SELECT.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Org members can manage own org gtin_pool" ON public.gtin_pool;

CREATE POLICY "Org members can view own org gtin_pool"
  ON public.gtin_pool FOR SELECT TO authenticated
  USING (owner_type = 'org' AND owner_id = get_user_org_id(auth.uid()));


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HIGH: Scope label-assets storage policies
-- Current policies allow ANY authenticated user to upload/update/delete
-- in the label-assets bucket. Scope write operations to label admins.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can upload label assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update label assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete label assets" ON storage.objects;
DROP POLICY IF EXISTS "Label assets are publicly accessible" ON storage.objects;

CREATE POLICY "Label assets are viewable by authenticated users"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'label-assets');

CREATE POLICY "Label admins can upload label assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'label-assets'
    AND (
      is_label_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Label admins can update label assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'label-assets'
    AND (
      is_label_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Label admins can delete label assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'label-assets'
    AND (
      is_label_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR has_role(auth.uid(), 'admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Revoke is_global_org from anon (missed if first migration now applies)
-- Already handled in fix_audit_migration_bugs, but ensure idempotency
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.is_global_org(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_global_org(UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CRITICAL: protect_org_fields must also protect is_global
-- Without this, any org member can SET is_global = true on their org,
-- making their colors/materials visible to ALL users platform-wide.
-- ─────────────────────────────────────────────────────────────────────────────

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
  NEW.is_global := OLD.is_global;
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Cleanup: Drop redundant gtin_pool SELECT policy from earlier migration
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Org users view own gtin_pool" ON public.gtin_pool;
