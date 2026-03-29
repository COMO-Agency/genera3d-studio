-- 1. Backfill all designs with GENERA manufacturer data
UPDATE designs SET
  manufacturer_name = 'GENERA PRINTER GmbH',
  manufacturer_address = 'Modecenterstraße 22, Office 4 C13-C15',
  manufacturer_city = '1030 Wien',
  manufacturer_contact = 'Klaus Stadlmann'
WHERE manufacturer_name IS NULL;

-- 2. Cancel ALL non-cancelled production logs (test data reset)
UPDATE production_logs SET status = 'cancelled'
WHERE status != 'cancelled';

-- 3. Return all used GTINs to pool
UPDATE gtin_pool SET is_used = false, used_at = NULL, used_by_production_log_id = NULL
WHERE is_used = true;