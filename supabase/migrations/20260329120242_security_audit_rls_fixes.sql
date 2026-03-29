-- =============================================================================
-- Security Audit Migration — 29. März 2026
-- Fixes: production_logs RLS, organizations SELECT, purchase_label_udi auth,
--        storage policies, helper function access
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CRITICAL: Enable RLS on production_logs and add org-scoped policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org production logs"
  ON public.production_logs FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Platform admins can view all production logs"
  ON public.production_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert production logs for own org"
  ON public.production_logs FOR INSERT
  WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update own org production logs"
  ON public.production_logs FOR UPDATE
  USING (org_id = get_user_org_id(auth.uid()))
  WITH CHECK (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Platform admins can update any production log"
  ON public.production_logs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can delete production logs"
  ON public.production_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ensure RLS is active on organizations and profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Regular users should be able to SELECT their own organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations' AND policyname = 'Users can view own organization'
  ) THEN
    CREATE POLICY "Users can view own organization"
      ON public.organizations FOR SELECT
      USING (id = get_user_org_id(auth.uid()));
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CRITICAL: Fix purchase_label_udi to validate auth.uid()
-- ─────────────────────────────────────────────────────────────────────────────

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
SET search_path = public
AS $$
DECLARE
  v_pool_row label_udi_pool%ROWTYPE;
  v_purchase_id UUID;
  v_caller_uid UUID;
  v_caller_org UUID;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id != v_caller_uid THEN
    RAISE EXCEPTION 'Cannot purchase on behalf of another user';
  END IF;

  v_caller_org := get_user_org_id(v_caller_uid);
  IF p_org_id != v_caller_org THEN
    RAISE EXCEPTION 'Cannot purchase for a different organization';
  END IF;

  SELECT * INTO v_pool_row
  FROM label_udi_pool
  WHERE id = p_pool_id AND is_available = TRUE
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UDI not available or already taken';
  END IF;

  UPDATE label_udi_pool
  SET is_available = FALSE
  WHERE id = p_pool_id;

  INSERT INTO label_udi_purchases (
    label_udi_pool_id, org_id, user_id,
    stripe_payment_intent_id, stripe_checkout_session_id
  )
  VALUES (
    p_pool_id, p_org_id, p_user_id,
    p_stripe_payment_intent_id, p_stripe_checkout_session_id
  )
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object(
    'purchase_id', v_purchase_id,
    'pool_id', p_pool_id,
    'udi_di_value', v_pool_row.udi_di_value
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Revoke direct RPC access to internal helper functions
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_org_id(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_admin(UUID, UUID) FROM anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Tighten storage bucket policies
-- ─────────────────────────────────────────────────────────────────────────────

-- org-design-images: scope to user's own org folder
DROP POLICY IF EXISTS "Users can upload own org design images" ON storage.objects;
CREATE POLICY "Users can upload own org design images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own org design images" ON storage.objects;
CREATE POLICY "Users can update own org design images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own org design images" ON storage.objects;
CREATE POLICY "Users can delete own org design images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

-- org-signatures: scope to user's own org folder
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
CREATE POLICY "Users can upload own org signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can update signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own signatures" ON storage.objects;
CREATE POLICY "Users can update own org signatures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own signatures" ON storage.objects;
CREATE POLICY "Users can delete own org signatures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Add missing DELETE policies
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_market_reports' AND policyname = 'Users can delete own org post market reports'
  ) THEN
    CREATE POLICY "Users can delete own org post market reports"
      ON public.post_market_reports FOR DELETE
      USING (org_id = get_user_org_id(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'qc_checks' AND policyname = 'Users can update own org qc checks'
  ) THEN
    CREATE POLICY "Users can update own org qc checks"
      ON public.qc_checks FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM production_logs pl
          WHERE pl.id = qc_checks.production_log_id
          AND pl.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;
END $$;
