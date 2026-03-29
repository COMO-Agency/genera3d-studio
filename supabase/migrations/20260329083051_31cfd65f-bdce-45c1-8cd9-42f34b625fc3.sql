
-- Add 'cancelled' to allowed status values
ALTER TABLE production_logs DROP CONSTRAINT production_logs_status_check;
ALTER TABLE production_logs ADD CONSTRAINT production_logs_status_check 
  CHECK (status = ANY (ARRAY['printed','failed','reprinted','qc_pending','qc_passed','qc_failed','cancelled']));

-- Now reset Sachsenweger test production logs
UPDATE production_logs SET status = 'cancelled'
WHERE org_id = '5a9900b5-fe74-45d8-b89e-f89f81bd6e35' AND status != 'cancelled';
