-- Agrega el session_id a la tabla vehicle_inspections
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS session_id UUID;
