-- Set resolved_at to use server-side now() automatically when status changes to resolved
ALTER TABLE public.post_market_reports
  ALTER COLUMN resolved_at SET DEFAULT now();
