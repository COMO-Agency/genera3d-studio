-- =============================================================================
-- Fix Audit Migration Bugs — 29. März 2026
-- Fixes: K1 (purchase_label_udi wrong column names),
--        K2 (REVOKE breaks RLS + wrong has_role signature),
--        K3 (storage SELECT policies not org-scoped)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- K2 FIX: Re-grant EXECUTE on helper functions to `authenticated`
-- The previous migration revoked EXECUTE from `authenticated`, but these
-- functions are called inside RLS policy expressions which evaluate in the
-- authenticated user's context. Without EXECUTE, all org-scoped queries fail.
-- We only revoke from `anon` (unauthenticated PostgREST calls).
-- ─────────────────────────────────────────────────────────────────────────────

-- First, restore access for authenticated (fixes the broken state)
GRANT EXECUTE ON FUNCTION public.get_user_org_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_label_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_label_admin(UUID, UUID) TO authenticated;

-- has_role has signature (uuid, app_role), not (uuid, text)
-- The previous REVOKE targeted (uuid, text) which either failed silently
-- or hit a non-existent overload. Grant the correct signature:
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Revoke from anon only (prevent unauthenticated access via PostgREST)
REVOKE EXECUTE ON FUNCTION public.get_user_org_id(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_label_admin(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_global_org(UUID) FROM anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- K1 FIX: Rewrite purchase_label_udi with correct column names
-- Previous version referenced non-existent columns:
--   assigned_to_org_id (doesn't exist on label_udi_pool)
--   pool_id (actual: label_udi_pool_id on label_udi_purchases)
--   v_pool_row.udi_di (actual: udi_di_value)
--   v_pool_row.serial_number (doesn't exist)
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
-- K3 FIX: Add org-scoped SELECT policies for storage buckets
-- Write policies are already org-scoped, but SELECT was bucket-wide,
-- allowing any authenticated user to read ALL files in the bucket.
-- ─────────────────────────────────────────────────────────────────────────────

-- org-design-images: scope SELECT to own org folder + admin access
DROP POLICY IF EXISTS "Users can view org design images" ON storage.objects;
CREATE POLICY "Users can view own org design images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-signatures: scope SELECT to own org folder + admin access
DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can view signatures" ON storage.objects;
CREATE POLICY "Users can view own org signatures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- NEU-K2 FIX: Add admin exemption to storage WRITE policies
-- The audit migration scoped INSERT/UPDATE/DELETE to the user's org folder,
-- but platform admins upload free design images to `free-designs/` which
-- doesn't match any org_id. Without this fix, admin uploads are blocked.
-- ─────────────────────────────────────────────────────────────────────────────

-- org-design-images: INSERT with admin exemption
DROP POLICY IF EXISTS "Users can upload own org design images" ON storage.objects;
CREATE POLICY "Users can upload own org design images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-design-images: UPDATE with admin exemption
DROP POLICY IF EXISTS "Users can update own org design images" ON storage.objects;
CREATE POLICY "Users can update own org design images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-design-images: DELETE with admin exemption
DROP POLICY IF EXISTS "Users can delete own org design images" ON storage.objects;
CREATE POLICY "Users can delete own org design images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-design-images'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- Fix: Drop legacy org-signatures policies that the audit migration missed
-- (it targeted wrong names: "Authenticated users can ..." instead of "Users can ... own ...")
DROP POLICY IF EXISTS "Users can update own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;

-- org-signatures: INSERT with admin exemption
DROP POLICY IF EXISTS "Users can upload own org signatures" ON storage.objects;
CREATE POLICY "Users can upload own org signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-signatures: UPDATE with admin exemption
DROP POLICY IF EXISTS "Users can update own org signatures" ON storage.objects;
CREATE POLICY "Users can update own org signatures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );

-- org-signatures: DELETE with admin exemption
DROP POLICY IF EXISTS "Users can delete own org signatures" ON storage.objects;
CREATE POLICY "Users can delete own org signatures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-signatures'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
      OR has_role(auth.uid(), 'admin')
    )
  );
