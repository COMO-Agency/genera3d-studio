
CREATE OR REPLACE FUNCTION public.admin_delete_organization(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Nur Plattform-Admins dürfen Organisationen löschen.';
  END IF;

  SELECT count(*) INTO v_count FROM profiles WHERE org_id = p_org_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Organisation hat noch % Mitglieder. Bitte zuerst alle Mitglieder entfernen.', v_count;
  END IF;

  DELETE FROM organizations WHERE id = p_org_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
