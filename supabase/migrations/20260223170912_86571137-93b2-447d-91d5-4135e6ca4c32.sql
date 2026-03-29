
-- ============================================================
-- label_udi_pool: UDI-DI values offered by labels for purchase
-- ============================================================
CREATE TABLE public.label_udi_pool (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id        UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  label_design_id UUID NOT NULL REFERENCES public.label_designs(id) ON DELETE CASCADE,
  udi_di_value    TEXT NOT NULL,
  price_cents     INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'eur',
  is_available    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.label_udi_pool ENABLE ROW LEVEL SECURITY;

-- Label members can do everything
CREATE POLICY "Label members can manage udi pool"
  ON public.label_udi_pool FOR ALL
  USING (is_label_member(auth.uid(), label_id))
  WITH CHECK (is_label_member(auth.uid(), label_id));

-- Subscribed orgs can view available UDIs
CREATE POLICY "Subscribed orgs can view available udis"
  ON public.label_udi_pool FOR SELECT
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM public.label_subscriptions ls
      WHERE ls.label_id = label_udi_pool.label_id
        AND ls.org_id = get_user_org_id(auth.uid())
        AND ls.status = 'active'
    )
  );

-- Platform admins
CREATE POLICY "Admins can view all udi pool"
  ON public.label_udi_pool FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- label_udi_purchases: records of purchased UDIs
-- ============================================================
CREATE TABLE public.label_udi_purchases (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_udi_pool_id          UUID NOT NULL REFERENCES public.label_udi_pool(id),
  org_id                     UUID NOT NULL REFERENCES public.organizations(id),
  user_id                    UUID NOT NULL,
  stripe_payment_intent_id   TEXT,
  stripe_checkout_session_id TEXT,
  purchased_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at                    TIMESTAMPTZ,
  production_log_id          UUID REFERENCES public.production_logs(id)
);

ALTER TABLE public.label_udi_purchases ENABLE ROW LEVEL SECURITY;

-- Own org can view their purchases
CREATE POLICY "Users view own org purchases"
  ON public.label_udi_purchases FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()));

-- Label members can view purchases for their label's UDIs
CREATE POLICY "Label members view purchases"
  ON public.label_udi_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.label_udi_pool p
      WHERE p.id = label_udi_purchases.label_udi_pool_id
        AND is_label_member(auth.uid(), p.label_id)
    )
  );

-- Platform admins
CREATE POLICY "Admins can view all purchases"
  ON public.label_udi_purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No direct INSERT/UPDATE/DELETE for clients — only via RPC

-- ============================================================
-- purchase_label_udi: atomic purchase after Stripe confirmation
-- ============================================================
CREATE OR REPLACE FUNCTION public.purchase_label_udi(
  p_pool_id UUID,
  p_org_id UUID,
  p_user_id UUID,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_checkout_session_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_udi_value TEXT;
  v_purchase_id UUID;
BEGIN
  -- Advisory lock on pool item
  PERFORM pg_advisory_xact_lock(hashtext(p_pool_id::text));

  -- Check availability
  SELECT udi_di_value INTO v_udi_value
  FROM label_udi_pool
  WHERE id = p_pool_id AND is_available = true
  FOR UPDATE;

  IF v_udi_value IS NULL THEN
    RAISE EXCEPTION 'UDI ist nicht mehr verfügbar.';
  END IF;

  -- Mark as unavailable
  UPDATE label_udi_pool SET is_available = false WHERE id = p_pool_id;

  -- Create purchase record
  INSERT INTO label_udi_purchases (label_udi_pool_id, org_id, user_id, stripe_payment_intent_id, stripe_checkout_session_id)
  VALUES (p_pool_id, p_org_id, p_user_id, p_stripe_payment_intent_id, p_stripe_checkout_session_id)
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'udi_di_value', v_udi_value
  );
END;
$$;

-- Indexes for performance
CREATE INDEX idx_label_udi_pool_design ON public.label_udi_pool(label_design_id, is_available);
CREATE INDEX idx_label_udi_pool_label ON public.label_udi_pool(label_id, is_available);
CREATE INDEX idx_label_udi_purchases_org ON public.label_udi_purchases(org_id);
CREATE INDEX idx_label_udi_purchases_pool ON public.label_udi_purchases(label_udi_pool_id);
