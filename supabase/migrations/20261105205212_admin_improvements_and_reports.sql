-- Migración: admin_improvements_and_reports
-- 1. Agregar full_name a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Agregar device_info a employee_logs si no existe
ALTER TABLE employee_logs ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 3. Índices de performance para el panel de administración
CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_status
  ON parking_sessions(parking_lot_id, status);

CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_entry
  ON parking_sessions(parking_lot_id, entry_time DESC);

CREATE INDEX IF NOT EXISTS idx_parking_sessions_cash_recorded
  ON parking_sessions(parking_lot_id, cash_recorded_at DESC)
  WHERE cash_recorded_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_logs_lot_created
  ON employee_logs(parking_lot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_subscribers_lot_dates
  ON monthly_subscribers(parking_lot_id, end_date);

-- 4. Vista para estadísticas y reportes
CREATE OR REPLACE VIEW v_session_stats AS
SELECT
  ps.parking_lot_id,
  v.type AS vehicle_type,
  DATE_TRUNC('day', ps.exit_time) AS day,
  COUNT(*) AS session_count,
  SUM(ps.total_charged) AS total_revenue
FROM parking_sessions ps
JOIN vehicles v ON v.id = ps.vehicle_id
WHERE ps.status = 'completed'
  AND ps.exit_time IS NOT NULL
GROUP BY
  ps.parking_lot_id,
  v.type,
  DATE_TRUNC('day', ps.exit_time);

-- 5. Poblar full_name en profiles existentes con datos limpios
UPDATE profiles
SET full_name = INITCAP(REPLACE(SPLIT_PART(email, '@', 1), '_', ' '))
WHERE full_name IS NULL AND email IS NOT NULL;
