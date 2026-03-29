
-- Allow start_production to work with org_designs by accepting an optional UDI-DI base
CREATE OR REPLACE FUNCTION public.start_production(
  p_design_id uuid DEFAULT NULL,
  p_mode text DEFAULT 'series',
  p_customer_ref text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_material_id uuid DEFAULT NULL,
  p_udi_di_base text DEFAULT NULL
)
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
  v_serial text;
  v_prefix text;
  v_today_count int;
begin
  v_user_id := auth.uid();
  select org_id into v_org_id from profiles where id = v_user_id;

  if v_org_id is null then
    raise exception 'Keine Organisation zugeordnet. Bitte tritt zuerst einer Organisation bei.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org_id::text || current_date::text || p_mode));

  -- Design lookup: either from designs table or from provided UDI-DI base
  if p_design_id is not null then
    select version, master_udi_di_base into v_design_version, v_master_udi_base
    from designs where id = p_design_id;
  elsif p_udi_di_base is not null then
    -- org_design: use provided UDI-DI base directly
    v_master_udi_base := p_udi_di_base;
  elsif p_mode not in ('custom', 'sunglasses') then
    raise exception 'Design ist Pflicht fuer Modus: %', p_mode;
  end if;

  if p_mode = 'series' then
    v_prefix := 'SE';
  elsif p_mode = 'custom' then
    v_prefix := 'SA';
  elsif p_mode = 'sunglasses' then
    v_prefix := 'SB';
  else
    raise exception 'Ungültiger Modus: %', p_mode;
  end if;

  select count(*) + 1 into v_today_count
  from production_logs
  where org_id = v_org_id
    and created_at::date = current_date
    and mode = p_mode;

  v_serial := v_prefix || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(v_today_count::text, 3, '0');

  if p_mode = 'series' then
    select udi_credits into v_credits from organizations where id = v_org_id for update;
    if v_credits < 1 then
      raise exception 'Nicht genügend Credits vorhanden.';
    end if;
    update organizations set udi_credits = udi_credits - 1 where id = v_org_id;
    v_new_udi_pi := v_serial;
    if v_master_udi_base is not null then
      v_full_gs1_string := '(01)' || v_master_udi_base || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_new_udi_pi;
    end if;
  elsif p_mode = 'custom' then
    update organizations set custom_counter = custom_counter + 1 where id = v_org_id;
    v_new_udi_pi := v_serial;
    v_full_gs1_string := null;
  elsif p_mode = 'sunglasses' then
    update organizations set custom_counter = custom_counter + 1 where id = v_org_id;
    v_new_udi_pi := v_serial;
    v_full_gs1_string := null;
  end if;

  insert into production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, status, color, customer_ref, material_id)
  values (v_org_id, p_design_id, v_user_id, p_mode, v_new_udi_pi, v_full_gs1_string, 'qc_pending', p_color, p_customer_ref, p_material_id)
  returning id into v_log_id;

  return jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'udi_pi', v_new_udi_pi,
    'full_gs1', v_full_gs1_string,
    'remaining_credits', (select udi_credits from organizations where id = v_org_id),
    'mode', p_mode
  );
end;
$function$;
