-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Workflow Logic Fixes
-- Fixes found during comprehensive workflow audit 2026-03-29
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Fix qc_checks UPDATE policy: use direct org_id check + WITH CHECK
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update own org qc checks" ON public.qc_checks;

CREATE POLICY "Users can update own org qc checks"
  ON public.qc_checks FOR UPDATE
  USING (org_id = get_user_org_id(auth.uid()))
  WITH CHECK (org_id = get_user_org_id(auth.uid()));

-- 2. Add missing DELETE policy for qc_checks (admin-only)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can delete qc checks" ON public.qc_checks;

CREATE POLICY "Admins can delete qc checks"
  ON public.qc_checks FOR DELETE
  USING (
    has_role(auth.uid(), 'admin')
    OR org_id = get_user_org_id(auth.uid())
  );
