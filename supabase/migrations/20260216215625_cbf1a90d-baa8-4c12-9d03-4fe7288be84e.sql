
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
BEGIN
  v_user_id := auth.uid();
  SELECT org_id INTO v_org_id FROM profiles WHERE id = v_user_id;

  SELECT status, mode INTO v_log_status, v_log_mode
  FROM production_logs
  WHERE id = p_production_log_id AND org_id = v_org_id;

  IF v_log_status IS NULL THEN
    RAISE EXCEPTION 'Auftrag nicht gefunden oder keine Berechtigung.';
  END IF;

  IF v_log_status <> 'qc_pending' THEN
    RAISE EXCEPTION 'Nur Auftraege mit Status QC ausstehend koennen storniert werden.';
  END IF;

  UPDATE production_logs
  SET status = 'cancelled'
  WHERE id = p_production_log_id AND org_id = v_org_id;

  IF v_log_mode IN ('series', 'sunglasses') THEN
    UPDATE organizations SET udi_credits = udi_credits + 1 WHERE id = v_org_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'refunded', v_log_mode IN ('series', 'sunglasses'));
END;
$$;
