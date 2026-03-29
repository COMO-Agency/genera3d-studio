
-- =============================================
-- 1. GTIN Pool Table
-- =============================================
CREATE TABLE public.gtin_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('org', 'label')),
  owner_id uuid NOT NULL,
  gtin_value text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by_production_log_id uuid REFERENCES public.production_logs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gtin_value)
);

CREATE INDEX idx_gtin_pool_owner ON public.gtin_pool(owner_type, owner_id);
CREATE INDEX idx_gtin_pool_available ON public.gtin_pool(owner_type, owner_id, is_used) WHERE is_used = false;

ALTER TABLE public.gtin_pool ENABLE ROW LEVEL SECURITY;

-- Platform admins can do everything
CREATE POLICY "Admins full access gtin_pool"
  ON public.gtin_pool FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Org users can view their own pool
CREATE POLICY "Org users view own gtin_pool"
  ON public.gtin_pool FOR SELECT
  USING (owner_type = 'org' AND owner_id = get_user_org_id(auth.uid()));

-- Label members can view their label's pool
CREATE POLICY "Label members view label gtin_pool"
  ON public.gtin_pool FOR SELECT
  USING (owner_type = 'label' AND is_label_member(auth.uid(), owner_id));

-- Label admins can manage their label's pool
CREATE POLICY "Label admins manage label gtin_pool"
  ON public.gtin_pool FOR ALL
  USING (owner_type = 'label' AND is_label_admin(auth.uid(), owner_id))
  WITH CHECK (owner_type = 'label' AND is_label_admin(auth.uid(), owner_id));

-- =============================================
-- 2. Add gtin column to production_logs
-- =============================================
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS assigned_gtin text;

-- =============================================
-- 3. Drop old start_production overloads & create new one
-- =============================================
DROP FUNCTION IF EXISTS public.start_production(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.start_production(uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.start_production(uuid, text, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.start_production(
  p_design_id uuid DEFAULT NULL,
  p_mode text DEFAULT 'optical',
  p_customer_ref text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_material_id uuid DEFAULT NULL,
  p_udi_di_base text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_log_id uuid;
  v_serial text;
  v_prefix text;
  v_today_count int;
  v_gtin_row RECORD;
  v_full_gs1_string text;
BEGIN
  v_user_id := auth.uid();
  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Keine Organisation zugeordnet.';
  END IF;

  -- Advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(v_org_id::text || current_date::text || p_mode));

  -- Validate mode
  IF p_mode NOT IN ('optical', 'optical_sun', 'sunglasses') THEN
    RAISE EXCEPTION 'Ungültiger Modus: %. Erlaubt: optical, optical_sun, sunglasses', p_mode;
  END IF;

  -- Design is required for all modes
  IF p_design_id IS NULL AND p_udi_di_base IS NULL THEN
    RAISE EXCEPTION 'Design ist Pflicht.';
  END IF;

  -- Prefix by mode
  IF p_mode = 'optical' THEN
    v_prefix := 'OB';
  ELSIF p_mode = 'optical_sun' THEN
    v_prefix := 'OS';
  ELSIF p_mode = 'sunglasses' THEN
    v_prefix := 'SB';
  END IF;

  -- Daily counter
  SELECT count(*) + 1 INTO v_today_count
  FROM production_logs
  WHERE org_id = v_org_id
    AND created_at::date = current_date
    AND mode = p_mode;

  v_serial := v_prefix || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(v_today_count::text, 3, '0');

  -- Claim a GTIN from the org's pool
  SELECT id, gtin_value INTO v_gtin_row
  FROM gtin_pool
  WHERE owner_type = 'org' AND owner_id = v_org_id AND is_used = false
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Build GS1 string if GTIN available
  IF v_gtin_row.gtin_value IS NOT NULL THEN
    v_full_gs1_string := '(01)' || v_gtin_row.gtin_value || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_serial;
  ELSE
    v_full_gs1_string := NULL;
  END IF;

  -- Insert production log
  INSERT INTO production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, assigned_gtin, status, color, customer_ref, material_id)
  VALUES (v_org_id, p_design_id, v_user_id, p_mode, v_serial, v_full_gs1_string, v_gtin_row.gtin_value, 'qc_pending', p_color, p_customer_ref, p_material_id)
  RETURNING id INTO v_log_id;

  -- Mark GTIN as used
  IF v_gtin_row.id IS NOT NULL THEN
    UPDATE gtin_pool SET is_used = true, used_at = now(), used_by_production_log_id = v_log_id
    WHERE id = v_gtin_row.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'udi_pi', v_serial,
    'full_gs1', v_full_gs1_string,
    'gtin', v_gtin_row.gtin_value,
    'mode', p_mode
  );
END;
$$;

-- =============================================
-- 4. Update cancel_production for new modes
-- =============================================
CREATE OR REPLACE FUNCTION public.cancel_production(p_production_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_log_status text;
  v_log_mode text;
  v_gtin_value text;
BEGIN
  v_user_id := auth.uid();
  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;

  SELECT status, mode, assigned_gtin INTO v_log_status, v_log_mode, v_gtin_value
  FROM production_logs
  WHERE id = p_production_log_id AND org_id = v_org_id;

  IF v_log_status IS NULL THEN
    RAISE EXCEPTION 'Auftrag nicht gefunden oder keine Berechtigung.';
  END IF;

  IF v_log_status <> 'qc_pending' THEN
    RAISE EXCEPTION 'Nur Aufträge mit Status QC ausstehend können storniert werden.';
  END IF;

  UPDATE production_logs SET status = 'cancelled'
  WHERE id = p_production_log_id AND org_id = v_org_id;

  -- Return GTIN to pool
  IF v_gtin_value IS NOT NULL THEN
    UPDATE gtin_pool SET is_used = false, used_at = NULL, used_by_production_log_id = NULL
    WHERE gtin_value = v_gtin_value AND used_by_production_log_id = p_production_log_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'gtin_returned', v_gtin_value IS NOT NULL);
END;
$$;
