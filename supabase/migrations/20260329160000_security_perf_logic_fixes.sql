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
