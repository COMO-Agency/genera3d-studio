
-- Remove the incorrect platform admin role from admin@genera.com
-- Only superadmin@genera.com should have the global 'admin' role
DELETE FROM public.user_roles
WHERE user_id = '65ef2021-2093-4402-95b6-fabab530cacf'
  AND role = 'admin';

-- Harden Label-Shop write access: only platform admins (has_role 'admin')
-- label_designs: restrict INSERT/UPDATE/DELETE to platform admins
DROP POLICY IF EXISTS "Label members can insert label_designs" ON public.label_designs;
DROP POLICY IF EXISTS "Label members can update label_designs" ON public.label_designs;
DROP POLICY IF EXISTS "Label admins can delete label_designs" ON public.label_designs;

CREATE POLICY "Platform admins can insert label_designs"
  ON public.label_designs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can update label_designs"
  ON public.label_designs FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can delete label_designs"
  ON public.label_designs FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- label_udi_pool: restrict management to platform admins only
DROP POLICY IF EXISTS "Label members can manage udi pool" ON public.label_udi_pool;

CREATE POLICY "Platform admins can manage udi pool"
  ON public.label_udi_pool FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- labels: restrict UPDATE to platform admins only (remove label_admin access)
DROP POLICY IF EXISTS "Label admins and platform admins can update labels" ON public.labels;

CREATE POLICY "Platform admins can update labels"
  ON public.labels FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
