-- Label admins can update their own label
CREATE POLICY "Label admins can update own label"
ON public.labels FOR UPDATE TO authenticated
USING (is_label_admin(auth.uid(), id))
WITH CHECK (is_label_admin(auth.uid(), id));

-- Label admins can insert designs for their label
CREATE POLICY "Label admins can insert own label_designs"
ON public.label_designs FOR INSERT TO authenticated
WITH CHECK (is_label_admin(auth.uid(), label_id));

-- Label admins can update designs for their label
CREATE POLICY "Label admins can update own label_designs"
ON public.label_designs FOR UPDATE TO authenticated
USING (is_label_admin(auth.uid(), label_id))
WITH CHECK (is_label_admin(auth.uid(), label_id));

-- Label admins can delete designs for their label
CREATE POLICY "Label admins can delete own label_designs"
ON public.label_designs FOR DELETE TO authenticated
USING (is_label_admin(auth.uid(), label_id));

-- Label admins can fully manage their label's UDI pool
CREATE POLICY "Label admins can manage own label udi pool"
ON public.label_udi_pool FOR ALL TO authenticated
USING (is_label_admin(auth.uid(), label_id))
WITH CHECK (is_label_admin(auth.uid(), label_id));