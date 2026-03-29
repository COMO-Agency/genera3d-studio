
CREATE POLICY "Admins can insert designs"
ON public.designs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete designs"
ON public.designs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
