
-- Drop legacy columns from organizations
ALTER TABLE public.organizations DROP COLUMN IF EXISTS udi_credits;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS custom_counter;

-- Update protect_org_fields trigger to remove references to dropped columns
CREATE OR REPLACE FUNCTION public.protect_org_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow settings to be changed via direct update
  NEW.name := OLD.name;
  NEW.license_key := OLD.license_key;
  RETURN NEW;
END;
$function$;
