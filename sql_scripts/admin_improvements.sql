-- ============================================================
-- Mejoras de base de datos para el panel de administrador
-- Archivo: admin_improvements.sql
-- ============================================================

-- 1. Agregar columna full_name a la tabla profiles si no existe
--    (usada en EmployeeManagement.tsx y EmployeeLogs.tsx)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ============================================================
-- 2. Índices de performance para consultas frecuentes
-- ============================================================

-- Índice compuesto para filtrar sesiones activas por parqueadero
-- (usado en dashboard para contar ocupación actual)
CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_status
  ON parking_sessions(parking_lot_id, status);

-- Índice para ordenar sesiones por tiempo de entrada
-- (usado en historial y dashboard)
CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_entry
  ON parking_sessions(parking_lot_id, entry_time DESC);

-- Índice parcial para sesiones registradas en caja
-- (usado en cálculos de recaudo)
CREATE INDEX IF NOT EXISTS idx_parking_sessions_cash_recorded
  ON parking_sessions(parking_lot_id, cash_recorded_at DESC)
  WHERE cash_recorded_at IS NOT NULL;

-- Índice para registros de turnos de empleados
-- (usado en EmployeeLogs.tsx con filtros de fecha)
CREATE INDEX IF NOT EXISTS idx_employee_logs_lot_created
  ON employee_logs(parking_lot_id, created_at DESC);

-- Índice para abonados mensuales ordenados por fecha de vencimiento
-- (usado en alertas de dashboard)
CREATE INDEX IF NOT EXISTS idx_monthly_subscribers_lot_dates
  ON monthly_subscribers(parking_lot_id, end_date);

-- ============================================================
-- 3. Vista para facilitar reportes de estadísticas por tipo
-- ============================================================
-- Esta vista agrupa las sesiones completadas por parqueadero,
-- tipo de vehículo y día para facilitar la generación de reportes.
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

-- ============================================================
-- Instrucciones de uso:
-- 1. Abre el Editor SQL de Supabase
-- 2. Pega el contenido de este archivo
-- 3. Ejecuta el script completo
-- ============================================================
