
-- 1. Add is_global column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- 2. Mark Genera as global
UPDATE public.organizations SET is_global = true WHERE id = '946f07a0-ae0e-4917-bc04-db39897d3d48';

-- 3. Security definer function to check if an org is global
CREATE OR REPLACE FUNCTION public.is_global_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = _org_id AND is_global = true
  )
$$;

-- 4. SELECT policy on org_colors for global org colors
CREATE POLICY "Authenticated users can view global org colors"
ON public.org_colors
FOR SELECT
TO authenticated
USING (is_global_org(org_id));

-- 5. SELECT policy on materials for global org materials
CREATE POLICY "Authenticated users can view global materials"
ON public.materials
FOR SELECT
TO authenticated
USING (is_global_org(org_id));
