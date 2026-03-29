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
