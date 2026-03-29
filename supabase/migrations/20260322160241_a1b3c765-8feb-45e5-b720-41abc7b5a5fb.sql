
-- Remove FK constraint from production_logs.design_id to designs table
-- org_designs uses a separate table, so this FK prevents using org_design IDs
ALTER TABLE public.production_logs DROP CONSTRAINT IF EXISTS production_logs_design_id_fkey;
