
-- Add docs_tc_accepted_at to profiles for the docs portal AGB gate
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS docs_tc_accepted_at timestamptz DEFAULT NULL;
