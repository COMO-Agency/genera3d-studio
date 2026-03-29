
-- These 3: Add customer_ref column to production_logs
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS customer_ref text;

-- These 9: RLS policy for org settings update
CREATE POLICY "Users update own org settings"
ON public.organizations
FOR UPDATE
USING (id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- These 1: Update start_production RPC with org_id guard + customer_ref storage
CREATE OR REPLACE FUNCTION public.start_production(p_design_id uuid, p_mode text, p_customer_ref text, p_color text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_credits int;
  v_design_version int;
  v_master_udi_base text;
  v_new_udi_pi text;
  v_full_gs1_string text;
  v_log_id uuid;
begin
  v_user_id := auth.uid();
  select org_id into v_org_id from profiles where id = v_user_id;

  -- Guard: User must belong to an organization
  if v_org_id is null then
    raise exception 'Keine Organisation zugeordnet. Bitte tritt zuerst einer Organisation bei.';
  end if;

  select version, master_udi_di_base into v_design_version, v_master_udi_base
  from designs where id = p_design_id;

  if p_mode = 'series' then
    select udi_credits into v_credits from organizations where id = v_org_id;
    if v_credits < 1 then
      raise exception 'Nicht genügend Credits vorhanden.';
    end if;
  end if;

  if p_mode = 'series' then
    update organizations set udi_credits = udi_credits - 1 where id = v_org_id;
  else
    update organizations set custom_counter = custom_counter + 1 where id = v_org_id;
  end if;

  v_new_udi_pi := to_char(now(), 'YYMMDD') || upper(substr(md5(random()::text), 1, 6));

  if p_mode = 'series' then
    v_full_gs1_string := '(01)' || v_master_udi_base || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_new_udi_pi;
  else
    v_full_gs1_string := 'CUSTOM-DEVICE-ART-21';
  end if;

  insert into production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, status, color, customer_ref)
  values (v_org_id, p_design_id, v_user_id, p_mode, v_new_udi_pi, v_full_gs1_string, 'printed', p_color, p_customer_ref)
  returning id into v_log_id;

  return jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'udi_pi', v_new_udi_pi,
    'full_gs1', v_full_gs1_string,
    'remaining_credits', (select udi_credits from organizations where id = v_org_id)
  );
end;
$function$;
