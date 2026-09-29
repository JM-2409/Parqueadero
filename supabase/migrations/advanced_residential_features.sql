-- FUNCIONALIDADES AVANZADAS DE GESTIÓN RESIDENCIAL

-- 1. Ventanas de Tiempo para Actualización de Documentos (Sorteos/Rotación)
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS doc_update_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS doc_update_end TIMESTAMP WITH TIME ZONE;

-- 2. Tipos de Solicitud Extendidos
-- Los tipos ya están en resident_requests.type, pero aseguramos la lógica de:
-- 'vehicle_change', 'surrender_spot', 'parking_lottery_entry'

-- 3. Módulo de Revistas (Rondas de Seguridad / Inventario)
CREATE TABLE IF NOT EXISTS security_patrols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
  notes TEXT
);

CREATE TABLE IF NOT EXISTS patrol_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patrol_id UUID REFERENCES security_patrols(id) ON DELETE CASCADE,
  plate TEXT, -- Placa del vehículo verificado
  space_number TEXT, -- Espacio verificado
  observation TEXT,
  photo_url TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS para Revistas
ALTER TABLE security_patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage patrols" ON security_patrols
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE parking_lot_id = security_patrols.parking_lot_id AND role IN ('employee', 'admin')));

CREATE POLICY "Employees can manage patrol logs" ON patrol_logs
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE parking_lot_id = (SELECT parking_lot_id FROM security_patrols WHERE id = patrol_id) AND role IN ('employee', 'admin')));
