-- 1. Tabla para almacenar las inspecciones (revistas) de vehículos
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- 'visitor' o 'private'
  plate TEXT NOT NULL,
  notes TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Políticas de Seguridad (RLS)
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth Vehicle Inspections" ON vehicle_inspections FOR ALL USING (true) WITH CHECK (true);

-- 3. Actualizar la tabla de configuraciones de parqueadero
-- Agregamos un JSONB para guardar la configuración de revistas en los parqueaderos
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS inspection_settings JSONB DEFAULT '{"require_photos": false, "require_notes": false, "enabled": true}'::jsonb;
