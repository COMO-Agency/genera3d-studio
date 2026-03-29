
-- 1. New table: post_market_reports
CREATE TABLE public.post_market_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) NOT NULL,
  production_log_id uuid REFERENCES public.production_logs(id),
  reason text NOT NULL,
  description text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  reported_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.post_market_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_org_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM profiles WHERE id = p_user_id
$$;

CREATE POLICY "Users view own org reports" ON public.post_market_reports
  FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users insert own org reports" ON public.post_market_reports
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users update own org reports" ON public.post_market_reports
  FOR UPDATE USING (org_id = public.get_user_org_id(auth.uid()));

-- 2. New table: qc_checks
CREATE TABLE public.qc_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_log_id uuid REFERENCES public.production_logs(id) NOT NULL,
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  passed boolean NOT NULL DEFAULT false,
  checked_by uuid REFERENCES public.profiles(id),
  checked_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid REFERENCES public.organizations(id) NOT NULL
);
ALTER TABLE public.qc_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org qc" ON public.qc_checks
  FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users insert own org qc" ON public.qc_checks
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

-- 3. New table: materials
CREATE TABLE public.materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) NOT NULL,
  name text NOT NULL DEFAULT 'Digital Eyewear',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org materials" ON public.materials
  FOR SELECT USING (org_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users manage own org materials" ON public.materials
  FOR ALL USING (org_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

-- 4. Update start_production RPC to support sunglasses mode & qc_pending status
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
  v_serial text;
begin
  v_user_id := auth.uid();
  select org_id into v_org_id from profiles where id = v_user_id;

  if v_org_id is null then
    raise exception 'Keine Organisation zugeordnet. Bitte tritt zuerst einer Organisation bei.';
  end if;

  select version, master_udi_di_base into v_design_version, v_master_udi_base
  from designs where id = p_design_id;

  -- Generate serial number
  v_serial := to_char(now(), 'YYMMDD') || upper(substr(md5(random()::text), 1, 6));

  if p_mode = 'series' then
    select udi_credits into v_credits from organizations where id = v_org_id;
    if v_credits < 1 then
      raise exception 'Nicht genügend Credits vorhanden.';
    end if;
    update organizations set udi_credits = udi_credits - 1 where id = v_org_id;
    v_new_udi_pi := v_serial;
    v_full_gs1_string := '(01)' || v_master_udi_base || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_new_udi_pi;
  elsif p_mode = 'custom' then
    update organizations set custom_counter = custom_counter + 1 where id = v_org_id;
    v_new_udi_pi := v_serial;
    v_full_gs1_string := null; -- Custom: no GS1 string, serial only
  elsif p_mode = 'sunglasses' then
    select udi_credits into v_credits from organizations where id = v_org_id;
    if v_credits < 1 then
      raise exception 'Nicht genügend Credits vorhanden.';
    end if;
    update organizations set udi_credits = udi_credits - 1 where id = v_org_id;
    v_new_udi_pi := v_serial;
    v_full_gs1_string := '(01)' || v_master_udi_base || '(11)' || to_char(now(), 'YYMMDD') || '(21)' || v_new_udi_pi;
  else
    raise exception 'Ungültiger Modus: %', p_mode;
  end if;

  insert into production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, status, color, customer_ref)
  values (v_org_id, p_design_id, v_user_id, p_mode, v_new_udi_pi, v_full_gs1_string, 'qc_pending', p_color, p_customer_ref)
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
