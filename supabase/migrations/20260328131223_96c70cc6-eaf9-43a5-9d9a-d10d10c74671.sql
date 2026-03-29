CREATE POLICY "Org members can manage own org gtin_pool"
ON public.gtin_pool FOR ALL TO authenticated
USING (owner_type = 'org' AND owner_id = get_user_org_id(auth.uid()))
WITH CHECK (owner_type = 'org' AND owner_id = get_user_org_id(auth.uid()));