
-- =============================================
-- Phase 3, Schritt 3: label_subscriptions
-- =============================================

CREATE TABLE public.label_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id        UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  accepted_tc_at  TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(label_id, org_id)
);

ALTER TABLE public.label_subscriptions ENABLE ROW LEVEL SECURITY;

-- Optiker sees own org subscriptions; label members see their label's subscribers
CREATE POLICY "Users view own org subscriptions"
  ON public.label_subscriptions FOR SELECT TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    OR is_label_member(auth.uid(), label_id)
    OR has_role(auth.uid(), 'admin')
  );

-- Authenticated users can subscribe (insert) for their own org
CREATE POLICY "Users can subscribe to labels"
  ON public.label_subscriptions FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id(auth.uid()));

-- Label members or platform admins can update (suspend/cancel)
CREATE POLICY "Label members and admins can update subscriptions"
  ON public.label_subscriptions FOR UPDATE TO authenticated
  USING (
    is_label_member(auth.uid(), label_id)
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    is_label_member(auth.uid(), label_id)
    OR has_role(auth.uid(), 'admin')
  );

-- Users can also cancel their own subscription
CREATE POLICY "Users can cancel own subscription"
  ON public.label_subscriptions FOR DELETE TO authenticated
  USING (org_id = get_user_org_id(auth.uid()));
