
-- These 3: RLS Security

-- collections: Enable RLS + SELECT for authenticated
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view collections"
  ON public.collections FOR SELECT TO authenticated USING (true);

-- designs: Enable RLS + SELECT for authenticated
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view designs"
  ON public.designs FOR SELECT TO authenticated USING (true);

-- profiles: SELECT + INSERT policies
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Fix start_production search_path
CREATE OR REPLACE FUNCTION public.start_production(p_design_id uuid, p_mode text, p_customer_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
  insert into production_logs (org_id, design_id, user_id, mode, assigned_udi_pi, full_udi_string, status)
  values (v_org_id, p_design_id, v_user_id, p_mode, v_new_udi_pi, v_full_gs1_string, 'printed')
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

-- These 2: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
