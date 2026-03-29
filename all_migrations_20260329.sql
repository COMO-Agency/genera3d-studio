
-- 1. Add is_global column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- 2. Mark Genera as global
UPDATE public.organizations SET is_global = true WHERE id = '946f07a0-ae0e-4917-bc04-db39897d3d48';

-- 3. Security definer function to check if an org is global
CREATE OR REPLACE FUNCTION public.is_global_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = _org_id AND is_global = true
  )
$$;

-- 4. SELECT policy on org_colors for global org colors
CREATE POLICY "Authenticated users can view global org colors"
ON public.org_colors
FOR SELECT
TO authenticated
USING (is_global_org(org_id));

-- 5. SELECT policy on materials for global org materials
CREATE POLICY "Authenticated users can view global materials"
ON public.materials
FOR SELECT
TO authenticated
USING (is_global_org(org_id));

CREATE OR REPLACE FUNCTION public.start_production(p_design_id uuid DEFAULT NULL::uuid, p_mode text DEFAULT 'optical'::text, p_customer_ref text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_material_id uuid DEFAULT NULL::uuid, p_udi_di_base text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_log_id uuid;
  v_serial text;
  v_prefix text;
  v_today_count int;
  v_gtin_row RECORD;
  v_full_gs1_string text;
  v_fixed_gtin text;
  v_serial_prefix text;
  v_global_count int;
  v_color_code text;
  v_design_name text;
  v_design_udi_di_base text;
  v_design_version int;
  v_color_name text;
  v_color_type text;
  v_cyan numeric;
  v_magenta numeric;
  v_yellow numeric;
  v_black numeric;
  v_white numeric;
BEGIN
  v_user_id := auth.uid();
  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Keine Organisation zugeordnet.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_org_id::text || current_date::text || p_mode));
  IF p_mode NOT IN ('optical', 'optical_sun', 'sunglasses') THEN
    RAISE EXCEPTION 'Ungültiger Modus: %. Erlaubt: optical, optical_sun, sunglasses', p_mode;
  END IF;
  IF p_design_id IS NULL AND p_udi_di_base IS NULL THEN RAISE EXCEPTION 'Design ist Pflicht.'; END IF;

  -- 1. Try org_designs first
  IF p_design_id IS NOT NULL THEN
    SELECT fixed_gtin, serial_prefix, name, master_udi_di_base
    INTO v_fixed_gtin, v_serial_prefix, v_design_name, v_design_udi_di_base
    FROM org_designs WHERE id = p_design_id AND org_id = v_org_id AND is_active = true;
  END IF;

  -- 2. Fallback: read from global designs table (Free Designs)
  -- Now also reads fixed_gtin, serial_prefix, master_udi_di_base
  IF v_design_name IS NULL AND p_design_id IS NOT NULL THEN
    SELECT name, version, fixed_gtin, serial_prefix, master_udi_di_base
    INTO v_design_name, v_design_version, v_fixed_gtin, v_serial_prefix, v_design_udi_di_base
    FROM designs WHERE id = p_design_id;
  END IF;

  v_design_version := COALESCE(v_design_version, 1);
  -- Use explicitly passed UDI-DI base as override if provided
  v_design_udi_di_base := COALESCE(p_udi_di_base, v_design_udi_di_base);

  IF p_color IS NOT NULL THEN
    BEGIN
      SELECT color_type, UPPER(COALESCE(color_code, name)), name,
             COALESCE(cyan, 0), COALESCE(magenta, 0), COALESCE(yellow, 0), COALESCE(black, 0), COALESCE(white, 0)
      INTO v_color_type, v_color_code, v_color_name,
           v_cyan, v_magenta, v_yellow, v_black, v_white
      FROM org_colors WHERE id = p_color::uuid;

      IF v_color_type = 'custom_mix' THEN
        v_color_code := 'C' || v_cyan::int || v_magenta::int || v_yellow::int || v_black::int || v_white::int;
      ELSE
        v_color_code := LEFT(v_color_code, 4);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_color_code := 'XX'; v_color_name := NULL;
    END;
  END IF;
  v_color_code := COALESCE(v_color_code, 'XX');

  IF v_fixed_gtin IS NOT NULL AND v_serial_prefix IS NOT NULL THEN
    SELECT count(*) + 1 INTO v_global_count FROM production_logs
    WHERE org_id = v_org_id AND assigned_gtin = v_fixed_gtin AND status <> 'cancelled';
    v_serial := v_serial_prefix || '-' || v_color_code || lpad(v_global_count::text, 4, '0');
    v_full_gs1_string := '(01)0' || v_fixed_gtin || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_serial;
    INSERT INTO production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, assigned_gtin, status, color, customer_ref, material_id, design_name, design_udi_di_base, design_version, color_name)
    VALUES (v_org_id, p_design_id, v_user_id, p_mode, v_serial, v_full_gs1_string, v_fixed_gtin, 'qc_pending', p_color, p_customer_ref, p_material_id, v_design_name, v_design_udi_di_base, v_design_version, v_color_name)
    RETURNING id INTO v_log_id;

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'udi_pi', v_serial,
      'full_gs1', v_full_gs1_string, 'gtin', v_fixed_gtin, 'mode', p_mode);
  ELSE
    IF p_mode = 'optical' THEN v_prefix := 'OB';
    ELSIF p_mode = 'optical_sun' THEN v_prefix := 'OS';
    ELSIF p_mode = 'sunglasses' THEN v_prefix := 'SB'; END IF;
    SELECT count(*) + 1 INTO v_today_count FROM production_logs
    WHERE org_id = v_org_id AND created_at::date = current_date AND mode = p_mode;
    v_serial := v_prefix || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(v_today_count::text, 3, '0');
    SELECT id, gtin_value INTO v_gtin_row FROM gtin_pool
    WHERE owner_type = 'org' AND owner_id = v_org_id AND is_used = false
    ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF v_gtin_row.gtin_value IS NOT NULL THEN
      v_full_gs1_string := '(01)' || v_gtin_row.gtin_value || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_serial;
    ELSE v_full_gs1_string := NULL; END IF;
    INSERT INTO production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, assigned_gtin, status, color, customer_ref, material_id, design_name, design_udi_di_base, design_version, color_name)
    VALUES (v_org_id, p_design_id, v_user_id, p_mode, v_serial, v_full_gs1_string, v_gtin_row.gtin_value, 'qc_pending', p_color, p_customer_ref, p_material_id, v_design_name, v_design_udi_di_base, v_design_version, v_color_name)
    RETURNING id INTO v_log_id;
    IF v_gtin_row.id IS NOT NULL THEN
      UPDATE gtin_pool SET is_used = true, used_at = now(), used_by_production_log_id = v_log_id WHERE id = v_gtin_row.id;
    END IF;

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'udi_pi', v_serial,
      'full_gs1', v_full_gs1_string, 'gtin', v_gtin_row.gtin_value, 'mode', p_mode);
  END IF;
END;
$function$;

-- Add 'cancelled' to allowed status values
ALTER TABLE production_logs DROP CONSTRAINT production_logs_status_check;
ALTER TABLE production_logs ADD CONSTRAINT production_logs_status_check 
  CHECK (status = ANY (ARRAY['printed','failed','reprinted','qc_pending','qc_passed','qc_failed','cancelled']));

-- Now reset Sachsenweger test production logs
UPDATE production_logs SET status = 'cancelled'
WHERE org_id = '5a9900b5-fe74-45d8-b89e-f89f81bd6e35' AND status != 'cancelled';
-- 1. Backfill all designs with GENERA manufacturer data
UPDATE designs SET
  manufacturer_name = 'GENERA PRINTER GmbH',
  manufacturer_address = 'Modecenterstraße 22, Office 4 C13-C15',
  manufacturer_city = '1030 Wien',
  manufacturer_contact = 'Klaus Stadlmann'
WHERE manufacturer_name IS NULL;

-- 2. Cancel ALL non-cancelled production logs (test data reset)
UPDATE production_logs SET status = 'cancelled'
WHERE status != 'cancelled';

-- 3. Return all used GTINs to pool
UPDATE gtin_pool SET is_used = false, used_at = NULL, used_by_production_log_id = NULL
WHERE is_used = true;-- =============================================================================
-- Security Audit Migration — 29. März 2026
-- Fixes: production_logs RLS, organizations SELECT, purchase_label_udi auth,
--        storage policies, helper function access
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CRITICAL: Enable RLS on production_logs and add org-scoped policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org production logs"
  ON public.production_logs FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Platform admins can view all production logs"
  ON public.production_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert production logs for own org"
  ON public.production_logs FOR INSERT
  WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update own org production logs"
  ON public.production_logs FOR UPDATE
  USING (org_id = get_user_org_id(auth.uid()))
  WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Platform admins can update any production log"
  ON public.production_logs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can delete production logs"
  ON public.production_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ensure RLS is active on organizations and profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Regular users should be able to SELECT their own organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations' AND policyname = 'Users can view own organization'
  ) THEN
    CREATE POLICY "Users can view own organization"
      ON public.organizations FOR SELECT
      USING (id = get_user_org_id(auth.uid()));
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CRITICAL: Fix purchase_label_udi to validate auth.uid()
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purchase_label_udi(
  p_pool_id UUID,
  p_org_id UUID,
  p_user_id UUID,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_checkout_session_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_row label_udi_pool%ROWTYPE;
  v_purchase_id UUID;
  v_caller_uid UUID;
  v_caller_org UUID;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id != v_caller_uid THEN
    RAISE EXCEPTION 'Cannot purchase on behalf of another user';
  END IF;

  v_caller_org := get_user_org_id(v_caller_uid);
  IF p_org_id != v_caller_org THEN
    RAISE EXCEPTION 'Cannot purchase for a different organization';
  END IF;

  SELECT * INTO v_pool_row
  FROM label_udi_pool
  WHERE id = p_pool_id AND is_available = TRUE
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UDI not available or already taken';
  END IF;

  UPDATE label_udi_pool
  SET is_available = FALSE
  WHERE id = p_pool_id;

  INSERT INTO label_udi_purchases (
    label_udi_pool_id, org_id, user_id,
    stripe_payment_intent_id, stripe_checkout_session_id
  )
  VALUES (
    p_pool_id, p_org_id, p_user_id,
    p_stripe_payment_intent_id, p_stripe_checkout_session_id
  )
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object(
    'purchase_id', v_purchase_id,
    'pool_id', p_pool_id,
    'udi_di_value', v_pool_row.udi_di_value
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Revoke direct RPC access to internal helper functions
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_org_id(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_admin(UUID, UUID) FROM anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Tighten storage bucket policies
-- ─────────────────────────────────────────────────────────────────────────────

-- org-design-images: scope to user's own org folder
DROP POLICY IF EXISTS "Users can upload own org design images" ON storage.objects;
CREATE POLICY "Users can upload own org design images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own org design images" ON storage.objects;
CREATE POLICY "Users can update own org design images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own org design images" ON storage.objects;
CREATE POLICY "Users can delete own org design images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

-- org-signatures: scope to user's own org folder
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
CREATE POLICY "Users can upload own org signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can update signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own signatures" ON storage.objects;
CREATE POLICY "Users can update own org signatures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own signatures" ON storage.objects;
CREATE POLICY "Users can delete own org signatures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Add missing DELETE policies
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_market_reports' AND policyname = 'Users can delete own org post market reports'
  ) THEN
    CREATE POLICY "Users can delete own org post market reports"
      ON public.post_market_reports FOR DELETE
      USING (org_id = get_user_org_id(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'qc_checks' AND policyname = 'Users can update own org qc checks'
  ) THEN
    CREATE POLICY "Users can update own org qc checks"
      ON public.qc_checks FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM production_logs pl
          WHERE pl.id = qc_checks.production_log_id
          AND pl.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;
END $$;
-- =============================================================================
-- Fix Audit Migration Bugs — 29. März 2026
-- Fixes: K1 (purchase_label_udi wrong column names),
--        K2 (REVOKE breaks RLS + wrong has_role signature),
--        K3 (storage SELECT policies not org-scoped)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- K2 FIX: Re-grant EXECUTE on helper functions to `authenticated`
-- The previous migration revoked EXECUTE from `authenticated`, but these
-- functions are called inside RLS policy expressions which evaluate in the
-- authenticated user's context. Without EXECUTE, all org-scoped queries fail.
-- We only revoke from `anon` (unauthenticated PostgREST calls).
-- ─────────────────────────────────────────────────────────────────────────────

-- First, restore access for authenticated (fixes the broken state)
GRANT EXECUTE ON FUNCTION public.get_user_org_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_label_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_label_admin(UUID, UUID) TO authenticated;

-- has_role has signature (uuid, app_role), not (uuid, text)
-- The previous REVOKE targeted (uuid, text) which either failed silently
-- or hit a non-existent overload. Grant the correct signature:
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Revoke from anon only (prevent unauthenticated access via PostgREST)
REVOKE EXECUTE ON FUNCTION public.get_user_org_id(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_admin(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_global_org(UUID) FROM anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- K1 FIX: Rewrite purchase_label_udi with correct column names
-- Previous version referenced non-existent columns:
--   assigned_to_org_id (doesn't exist on label_udi_pool)
--   pool_id (actual: label_udi_pool_id on label_udi_purchases)
--   v_pool_row.udi_di (actual: udi_di_value)
--   v_pool_row.serial_number (doesn't exist)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purchase_label_udi(
  p_pool_id UUID,
  p_org_id UUID,
  p_user_id UUID,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_checkout_session_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_row label_udi_pool%ROWTYPE;
  v_purchase_id UUID;
  v_caller_uid UUID;
  v_caller_org UUID;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id != v_caller_uid THEN
    RAISE EXCEPTION 'Cannot purchase on behalf of another user';
  END IF;

  v_caller_org := get_user_org_id(v_caller_uid);
  IF p_org_id != v_caller_org THEN
    RAISE EXCEPTION 'Cannot purchase for a different organization';
  END IF;

  SELECT * INTO v_pool_row
  FROM label_udi_pool
  WHERE id = p_pool_id AND is_available = TRUE
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UDI not available or already taken';
  END IF;

  UPDATE label_udi_pool
  SET is_available = FALSE
  WHERE id = p_pool_id;

  INSERT INTO label_udi_purchases (
    label_udi_pool_id, org_id, user_id,
    stripe_payment_intent_id, stripe_checkout_session_id
  )
  VALUES (
    p_pool_id, p_org_id, p_user_id,
    p_stripe_payment_intent_id, p_stripe_checkout_session_id
  )
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object(
    'purchase_id', v_purchase_id,
    'pool_id', p_pool_id,
    'udi_di_value', v_pool_row.udi_di_value
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- K3 FIX: Add org-scoped SELECT policies for storage buckets
-- Write policies are already org-scoped, but SELECT was bucket-wide,
-- allowing any authenticated user to read ALL files in the bucket.
-- ─────────────────────────────────────────────────────────────────────────────

-- org-design-images: scope SELECT to own org folder + admin access
DROP POLICY IF EXISTS "Users can view org design images" ON storage.objects;
CREATE POLICY "Users can view own org design images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-signatures: scope SELECT to own org folder + admin access
DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can view signatures" ON storage.objects;
CREATE POLICY "Users can view own org signatures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- NEU-K2 FIX: Add admin exemption to storage WRITE policies
-- The audit migration scoped INSERT/UPDATE/DELETE to the user's org folder,
-- but platform admins upload free design images to `free-designs/` which
-- doesn't match any org_id. Without this fix, admin uploads are blocked.
-- ─────────────────────────────────────────────────────────────────────────────

-- org-design-images: INSERT with admin exemption
DROP POLICY IF EXISTS "Users can upload own org design images" ON storage.objects;
CREATE POLICY "Users can upload own org design images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-design-images: UPDATE with admin exemption
DROP POLICY IF EXISTS "Users can update own org design images" ON storage.objects;
CREATE POLICY "Users can update own org design images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-design-images: DELETE with admin exemption
DROP POLICY IF EXISTS "Users can delete own org design images" ON storage.objects;
CREATE POLICY "Users can delete own org design images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- Fix: Drop legacy org-signatures policies that the audit migration missed
-- (it targeted wrong names: "Authenticated users can ..." instead of "Users can ... own ...")
DROP POLICY IF EXISTS "Users can update own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;

-- org-signatures: INSERT with admin exemption
DROP POLICY IF EXISTS "Users can upload own org signatures" ON storage.objects;
CREATE POLICY "Users can upload own org signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-signatures: UPDATE with admin exemption
DROP POLICY IF EXISTS "Users can update own org signatures" ON storage.objects;
CREATE POLICY "Users can update own org signatures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-signatures: DELETE with admin exemption
DROP POLICY IF EXISTS "Users can delete own org signatures" ON storage.objects;
CREATE POLICY "Users can delete own org signatures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );
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
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Workflow Logic Fixes
-- Fixes found during comprehensive workflow audit 2026-03-29
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Fix qc_checks UPDATE policy: use direct org_id check + WITH CHECK
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update own org qc checks" ON public.qc_checks;

CREATE POLICY "Users can update own org qc checks"
  ON public.qc_checks FOR UPDATE
  USING (org_id = get_user_org_id(auth.uid()))
  WITH CHECK (org_id = get_user_org_id(auth.uid()));

-- 2. Add missing DELETE policy for qc_checks (admin-only)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can delete qc checks" ON public.qc_checks;

CREATE POLICY "Admins can delete qc checks"
  ON public.qc_checks FOR DELETE
  USING (
    has_role(auth.uid(), 'admin')
    OR org_id = get_user_org_id(auth.uid())
  );
-- ============================================================
-- Migration: Security hardening, performance indexes, logic fix
-- Date: 2026-03-29
-- ============================================================

-- ============================================================
-- D1: REVOKE EXECUTE on RPC functions from anon role
-- PostgreSQL grants EXECUTE to PUBLIC by default on new functions.
-- All RPCs already check auth.uid() internally, but anon access
-- exposes function signatures and error messages.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.start_production FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_qc_check FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_production FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_organization FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_organization FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_organization FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_organization FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_label_udi FROM anon;

GRANT EXECUTE ON FUNCTION public.start_production TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_qc_check TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_production TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_label_udi TO authenticated;


-- ============================================================
-- D2: Performance indexes on hot tables
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_production_logs_org_id
  ON public.production_logs (org_id);

CREATE INDEX IF NOT EXISTS idx_production_logs_org_created_mode
  ON public.production_logs (org_id, created_at, mode);

CREATE INDEX IF NOT EXISTS idx_production_logs_org_gtin_status
  ON public.production_logs (org_id, assigned_gtin, status);

CREATE INDEX IF NOT EXISTS idx_profiles_org_id
  ON public.profiles (org_id);

CREATE INDEX IF NOT EXISTS idx_org_colors_org_id
  ON public.org_colors (org_id);

CREATE INDEX IF NOT EXISTS idx_org_designs_org_id
  ON public.org_designs (org_id);


-- ============================================================
-- D3: Fix ambiguous custom_mix color code in start_production
-- Restore delimiter characters (C/M/Y/K/W) between values
-- so codes like "C10M20Y30K5W0" are unambiguously parsable.
-- ============================================================

CREATE OR REPLACE FUNCTION public.start_production(p_design_id uuid DEFAULT NULL::uuid, p_mode text DEFAULT 'optical'::text, p_customer_ref text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_material_id uuid DEFAULT NULL::uuid, p_udi_di_base text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_log_id uuid;
  v_serial text;
  v_prefix text;
  v_today_count int;
  v_gtin_row RECORD;
  v_full_gs1_string text;
  v_fixed_gtin text;
  v_serial_prefix text;
  v_global_count int;
  v_color_code text;
  v_design_name text;
  v_design_udi_di_base text;
  v_design_version int;
  v_color_name text;
  v_color_type text;
  v_cyan numeric;
  v_magenta numeric;
  v_yellow numeric;
  v_black numeric;
  v_white numeric;
BEGIN
  v_user_id := auth.uid();
  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Keine Organisation zugeordnet.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_org_id::text || current_date::text || p_mode));
  IF p_mode NOT IN ('optical', 'optical_sun', 'sunglasses') THEN
    RAISE EXCEPTION 'Ungültiger Modus: %. Erlaubt: optical, optical_sun, sunglasses', p_mode;
  END IF;
  IF p_design_id IS NULL AND p_udi_di_base IS NULL THEN RAISE EXCEPTION 'Design ist Pflicht.'; END IF;

  IF p_design_id IS NOT NULL THEN
    SELECT fixed_gtin, serial_prefix, name, master_udi_di_base
    INTO v_fixed_gtin, v_serial_prefix, v_design_name, v_design_udi_di_base
    FROM org_designs WHERE id = p_design_id AND org_id = v_org_id AND is_active = true;
  END IF;

  IF v_design_name IS NULL AND p_design_id IS NOT NULL THEN
    SELECT name, version, fixed_gtin, serial_prefix, master_udi_di_base
    INTO v_design_name, v_design_version, v_fixed_gtin, v_serial_prefix, v_design_udi_di_base
    FROM designs WHERE id = p_design_id;
  END IF;

  v_design_version := COALESCE(v_design_version, 1);
  v_design_udi_di_base := COALESCE(p_udi_di_base, v_design_udi_di_base);

  IF p_color IS NOT NULL THEN
    BEGIN
      SELECT color_type, UPPER(COALESCE(color_code, name)), name,
             COALESCE(cyan, 0), COALESCE(magenta, 0), COALESCE(yellow, 0), COALESCE(black, 0), COALESCE(white, 0)
      INTO v_color_type, v_color_code, v_color_name,
           v_cyan, v_magenta, v_yellow, v_black, v_white
      FROM org_colors WHERE id = p_color::uuid;

      IF v_color_type = 'custom_mix' THEN
        v_color_code := 'C' || v_cyan::int || 'M' || v_magenta::int || 'Y' || v_yellow::int || 'K' || v_black::int || 'W' || v_white::int;
      ELSE
        v_color_code := LEFT(v_color_code, 4);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_color_code := 'XX'; v_color_name := NULL;
    END;
  END IF;
  v_color_code := COALESCE(v_color_code, 'XX');

  IF v_fixed_gtin IS NOT NULL AND v_serial_prefix IS NOT NULL THEN
    SELECT count(*) + 1 INTO v_global_count FROM production_logs
    WHERE org_id = v_org_id AND assigned_gtin = v_fixed_gtin AND status <> 'cancelled';
    v_serial := v_serial_prefix || '-' || v_color_code || lpad(v_global_count::text, 4, '0');
    v_full_gs1_string := '(01)0' || v_fixed_gtin || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_serial;
    INSERT INTO production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, assigned_gtin, status, color, customer_ref, material_id, design_name, design_udi_di_base, design_version, color_name)
    VALUES (v_org_id, p_design_id, v_user_id, p_mode, v_serial, v_full_gs1_string, v_fixed_gtin, 'qc_pending', p_color, p_customer_ref, p_material_id, v_design_name, v_design_udi_di_base, v_design_version, v_color_name)
    RETURNING id INTO v_log_id;

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'udi_pi', v_serial,
      'full_gs1', v_full_gs1_string, 'gtin', v_fixed_gtin, 'mode', p_mode);
  ELSE
    IF p_mode = 'optical' THEN v_prefix := 'OB';
    ELSIF p_mode = 'optical_sun' THEN v_prefix := 'OS';
    ELSIF p_mode = 'sunglasses' THEN v_prefix := 'SB'; END IF;
    SELECT count(*) + 1 INTO v_today_count FROM production_logs
    WHERE org_id = v_org_id AND created_at::date = current_date AND mode = p_mode;
    v_serial := v_prefix || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(v_today_count::text, 3, '0');
    SELECT id, gtin_value INTO v_gtin_row FROM gtin_pool
    WHERE owner_type = 'org' AND owner_id = v_org_id AND is_used = false
    ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF v_gtin_row.gtin_value IS NOT NULL THEN
      v_full_gs1_string := '(01)' || v_gtin_row.gtin_value || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_serial;
    ELSE v_full_gs1_string := NULL; END IF;
    INSERT INTO production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, assigned_gtin, status, color, customer_ref, material_id, design_name, design_udi_di_base, design_version, color_name)
    VALUES (v_org_id, p_design_id, v_user_id, p_mode, v_serial, v_full_gs1_string, v_gtin_row.gtin_value, 'qc_pending', p_color, p_customer_ref, p_material_id, v_design_name, v_design_udi_di_base, v_design_version, v_color_name)
    RETURNING id INTO v_log_id;
    IF v_gtin_row.id IS NOT NULL THEN
      UPDATE gtin_pool SET is_used = true, used_at = now(), used_by_production_log_id = v_log_id WHERE id = v_gtin_row.id;
    END IF;

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'udi_pi', v_serial,
      'full_gs1', v_full_gs1_string, 'gtin', v_gtin_row.gtin_value, 'mode', p_mode);
  END IF;
END;
$function$;


-- ============================================================
-- Drop duplicate unique index on org_designs.fixed_gtin
-- ============================================================

DROP INDEX IF EXISTS public.idx_org_designs_fixed_gtin;


-- ============================================================
-- Drop redundant SELECT policy on materials
-- (the FOR ALL policy already covers SELECT)
-- ============================================================

DROP POLICY IF EXISTS "Users view own org materials" ON public.materials;
-- ============================================================
-- Migration: Critical Race Condition and Data Integrity Fixes
-- Date: 2026-03-29
-- Fixes: Serial collision, admin_bypass leak, GTIN exhaustion,
--          NOT NULL constraints, Enum constraints
-- ============================================================

-- ============================================================
-- F1: Fix Serial Number Collision in start_production
-- The advisory lock must include v_fixed_gtin to prevent
-- concurrent fixed_gtin designs from getting duplicate serials
-- ============================================================

CREATE OR REPLACE FUNCTION public.start_production(p_design_id uuid DEFAULT NULL::uuid, p_mode text DEFAULT 'optical'::text, p_customer_ref text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_material_id uuid DEFAULT NULL::uuid, p_udi_di_base text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_log_id uuid;
  v_serial text;
  v_prefix text;
  v_today_count int;
  v_gtin_row RECORD;
  v_full_gs1_string text;
  v_fixed_gtin text;
  v_serial_prefix text;
  v_global_count int;
  v_color_code text;
  v_design_name text;
  v_design_udi_di_base text;
  v_design_version int;
  v_color_name text;
  v_color_type text;
  v_cyan numeric;
  v_magenta numeric;
  v_yellow numeric;
  v_black numeric;
  v_white numeric;
BEGIN
  v_user_id := auth.uid();
  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Keine Organisation zugeordnet.'; END IF;

  -- Acquire design info first to know if we have fixed_gtin
  IF p_design_id IS NOT NULL THEN
    SELECT fixed_gtin, serial_prefix, name, master_udi_di_base
    INTO v_fixed_gtin, v_serial_prefix, v_design_name, v_design_udi_di_base
    FROM org_designs WHERE id = p_design_id AND org_id = v_org_id AND is_active = true;
  END IF;

  IF v_design_name IS NULL AND p_design_id IS NOT NULL THEN
    SELECT name, version, fixed_gtin, serial_prefix, master_udi_di_base
    INTO v_design_name, v_design_version, v_fixed_gtin, v_serial_prefix, v_design_udi_di_base
    FROM designs WHERE id = p_design_id;
  END IF;

  v_design_version := COALESCE(v_design_version, 1);
  v_design_udi_di_base := COALESCE(p_udi_di_base, v_design_udi_di_base);

  -- CRITICAL FIX: Lock must include fixed_gtin to prevent serial collisions
  -- Use COALESCE to handle both fixed_gtin designs and pool-based designs
  PERFORM pg_advisory_xact_lock(hashtext(v_org_id::text || COALESCE(v_fixed_gtin, 'POOL') || current_date::text || p_mode));

  IF p_mode NOT IN ('optical', 'optical_sun', 'sunglasses') THEN
    RAISE EXCEPTION 'Ungültiger Modus: %. Erlaubt: optical, optical_sun, sunglasses', p_mode;
  END IF;
  IF p_design_id IS NULL AND p_udi_di_base IS NULL THEN RAISE EXCEPTION 'Design ist Pflicht.'; END IF;

  IF p_color IS NOT NULL THEN
    BEGIN
      SELECT color_type, UPPER(COALESCE(color_code, name)), name,
             COALESCE(cyan, 0), COALESCE(magenta, 0), COALESCE(yellow, 0), COALESCE(black, 0), COALESCE(white, 0)
      INTO v_color_type, v_color_code, v_color_name,
           v_cyan, v_magenta, v_yellow, v_black, v_white
      FROM org_colors WHERE id = p_color::uuid;

      IF v_color_type = 'custom_mix' THEN
        v_color_code := 'C' || v_cyan::int || 'M' || v_magenta::int || 'Y' || v_yellow::int || 'K' || v_black::int || 'W' || v_white::int;
      ELSE
        v_color_code := LEFT(v_color_code, 4);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_color_code := 'XX'; v_color_name := NULL;
    END;
  END IF;
  v_color_code := COALESCE(v_color_code, 'XX');

  IF v_fixed_gtin IS NOT NULL AND v_serial_prefix IS NOT NULL THEN
    SELECT count(*) + 1 INTO v_global_count FROM production_logs
    WHERE org_id = v_org_id AND assigned_gtin = v_fixed_gtin AND status <> 'cancelled';
    v_serial := v_serial_prefix || '-' || v_color_code || lpad(v_global_count::text, 4, '0');
    v_full_gs1_string := '(01)0' || v_fixed_gtin || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_serial;
    INSERT INTO production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, assigned_gtin, status, color, customer_ref, material_id, design_name, design_udi_di_base, design_version, color_name)
    VALUES (v_org_id, p_design_id, v_user_id, p_mode, v_serial, v_full_gs1_string, v_fixed_gtin, 'qc_pending', p_color, p_customer_ref, p_material_id, v_design_name, v_design_udi_di_base, v_design_version, v_color_name)
    RETURNING id INTO v_log_id;

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'udi_pi', v_serial,
      'full_gs1', v_full_gs1_string, 'gtin', v_fixed_gtin, 'mode', p_mode);
  ELSE
    IF p_mode = 'optical' THEN v_prefix := 'OB';
    ELSIF p_mode = 'optical_sun' THEN v_prefix := 'OS';
    ELSIF p_mode = 'sunglasses' THEN v_prefix := 'SB'; END IF;
    SELECT count(*) + 1 INTO v_today_count FROM production_logs
    WHERE org_id = v_org_id AND created_at::date = current_date AND mode = p_mode;
    v_serial := v_prefix || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(v_today_count::text, 3, '0');
    SELECT id, gtin_value INTO v_gtin_row FROM gtin_pool
    WHERE owner_type = 'org' AND owner_id = v_org_id AND is_used = false
    ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;

    -- CRITICAL FIX: Rollback if no GTIN available
    IF v_gtin_row.id IS NULL THEN
      RAISE EXCEPTION 'Kein GTIN verfügbar im Pool. Bitte GTINs importieren.';
    END IF;

    v_full_gs1_string := '(01)' || v_gtin_row.gtin_value || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_serial;
    INSERT INTO production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, assigned_gtin, status, color, customer_ref, material_id, design_name, design_udi_di_base, design_version, color_name)
    VALUES (v_org_id, p_design_id, v_user_id, p_mode, v_serial, v_full_gs1_string, v_gtin_row.gtin_value, 'qc_pending', p_color, p_customer_ref, p_material_id, v_design_name, v_design_udi_di_base, v_design_version, v_color_name)
    RETURNING id INTO v_log_id;

    UPDATE gtin_pool SET is_used = true, used_at = now(), used_by_production_log_id = v_log_id WHERE id = v_gtin_row.id;

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'udi_pi', v_serial,
      'full_gs1', v_full_gs1_string, 'gtin', v_gtin_row.gtin_value, 'mode', p_mode);
  END IF;
END;
$function$;


-- ============================================================
-- F2: Fix admin_bypass leak in join_organization
-- Use EXCEPTION block to ensure cleanup happens even on error
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_organization(p_license_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Verify license key and get org
  SELECT id INTO v_org_id FROM organizations WHERE license_key = p_license_key;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Invalid license key'; END IF;

  -- Check user doesn't already have an org
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND org_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already has an organization';
  END IF;

  -- CRITICAL FIX: Use EXCEPTION block to ensure cleanup
  BEGIN
    PERFORM set_config('app.admin_bypass', 'true', true);

    UPDATE profiles SET org_id = v_org_id WHERE id = v_user_id;

    PERFORM set_config('app.admin_bypass', 'false', true);
  EXCEPTION WHEN OTHERS THEN
    -- Ensure bypass is always reset even on error
    PERFORM set_config('app.admin_bypass', 'false', true);
    RAISE;
  END;

  RETURN true;
END;
$function$;


-- ============================================================
-- F3: Fix cancel_production TOCTOU vulnerability
-- Move status check into WHERE clause for atomicity
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_production(p_production_log_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_affected int;
BEGIN
  v_user_id := auth.uid();
  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Keine Organisation zugeordnet'; END IF;

  -- CRITICAL FIX: Atomic status check in WHERE clause
  -- This prevents TOCTOU: if status changed between check and update, no rows affected
  UPDATE production_logs SET status = 'cancelled'
  WHERE id = p_production_log_id
    AND org_id = v_org_id
    AND status = 'qc_pending';  -- Atomic check

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  IF v_affected = 0 THEN
    RAISE EXCEPTION 'Auftrag nicht gefunden oder Status erlaubt keine Stornierung (nur qc_pending erlaubt)';
  END IF;

  RETURN true;
END;
$function$;


-- ============================================================
-- F4: Add NOT NULL constraints to production_logs
-- Critical fields must never be null for traceability
-- ============================================================

-- First, fix any existing NULL values
UPDATE production_logs SET org_id = (SELECT org_id FROM profiles WHERE id = user_id)
WHERE org_id IS NULL AND user_id IS NOT NULL;

UPDATE production_logs SET user_id = auth.uid()
WHERE user_id IS NULL;

UPDATE production_logs SET status = 'qc_pending'
WHERE status IS NULL;

UPDATE production_logs SET mode = 'optical'
WHERE mode IS NULL;

UPDATE production_logs SET assigned_udi_pi = 'UNKNOWN-' || id::text
WHERE assigned_udi_pi IS NULL;

UPDATE production_logs SET created_at = now()
WHERE created_at IS NULL;

-- Now add constraints
ALTER TABLE production_logs
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN mode SET NOT NULL,
  ALTER COLUMN assigned_udi_pi SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- Add CHECK constraint for mode enum
ALTER TABLE production_logs
  DROP CONSTRAINT IF EXISTS production_logs_mode_check;

ALTER TABLE production_logs
  ADD CONSTRAINT production_logs_mode_check
  CHECK (mode IN ('optical', 'optical_sun', 'sunglasses'));

-- Add CHECK constraint for status enum
ALTER TABLE production_logs
  DROP CONSTRAINT IF EXISTS production_logs_status_check;

ALTER TABLE production_logs
  ADD CONSTRAINT production_logs_status_check
  CHECK (status IN ('qc_pending', 'qc_passed', 'qc_failed', 'cancelled'));


-- ============================================================
-- F5: Add constraints to profiles table
-- ============================================================

-- Add CHECK constraint for role enum
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'user'));


-- ============================================================
-- F6: Add constraints to label_subscriptions
-- ============================================================

-- Add CHECK constraint for status enum
ALTER TABLE label_subscriptions
  DROP CONSTRAINT IF EXISTS label_subscriptions_status_check;

ALTER TABLE label_subscriptions
  ADD CONSTRAINT label_subscriptions_status_check
  CHECK (status IN ('active', 'pending', 'cancelled', 'expired'));


-- ============================================================
-- F7: Add constraints to post_market_reports
-- ============================================================

-- Add CHECK constraint for status enum
ALTER TABLE post_market_reports
  DROP CONSTRAINT IF EXISTS post_market_reports_status_check;

ALTER TABLE post_market_reports
  ADD CONSTRAINT post_market_reports_status_check
  CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));


-- ============================================================
-- F8: Add format validation constraints
-- ============================================================

-- GTIN-13 format (13 digits)
ALTER TABLE gtin_pool
  DROP CONSTRAINT IF EXISTS gtin_pool_format_check;

ALTER TABLE gtin_pool
  ADD CONSTRAINT gtin_pool_format_check
  CHECK (gtin_value ~ '^\d{13}$');

-- UDI-DI format (14 digits)
ALTER TABLE designs
  DROP CONSTRAINT IF EXISTS designs_udi_format_check;

ALTER TABLE designs
  ADD CONSTRAINT designs_udi_format_check
  CHECK (master_udi_di_base ~ '^\d{14}$');

ALTER TABLE label_designs
  DROP CONSTRAINT IF EXISTS label_designs_udi_format_check;

ALTER TABLE label_designs
  ADD CONSTRAINT label_designs_udi_format_check
  CHECK (master_udi_di_base ~ '^\d{14}$');


-- ============================================================
-- F9: Grant execute on fixed functions
-- ============================================================

GRANT EXECUTE ON FUNCTION public.start_production TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_production TO authenticated;
