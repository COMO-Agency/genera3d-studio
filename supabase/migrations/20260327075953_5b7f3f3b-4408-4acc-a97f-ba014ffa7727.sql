ALTER TABLE public.post_market_reports
  ADD CONSTRAINT fk_post_market_reports_production_log
  FOREIGN KEY (production_log_id) REFERENCES public.production_logs(id);