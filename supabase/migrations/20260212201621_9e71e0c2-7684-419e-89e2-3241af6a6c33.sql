ALTER TABLE production_logs
  DROP CONSTRAINT production_logs_status_check;

ALTER TABLE production_logs
  ADD CONSTRAINT production_logs_status_check
  CHECK (status = ANY (ARRAY[
    'printed', 'failed', 'reprinted',
    'qc_pending', 'qc_passed', 'qc_failed'
  ]));