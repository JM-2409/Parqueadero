-- Tabla para Tarifas Especiales por Placa
CREATE TABLE IF NOT EXISTS special_tariffs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  rate_type TEXT NOT NULL DEFAULT 'dia', -- 'dia', 'hora', 'minuto', 'fijo'
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ, -- NULL significa indefinido
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas por placa y parqueadero
CREATE INDEX IF NOT EXISTS idx_special_tariffs_parking_plate ON special_tariffs(parking_lot_id, plate);
CREATE INDEX IF NOT EXISTS idx_special_tariffs_dates ON special_tariffs(start_date, end_date);

-- Habilitar RLS
ALTER TABLE special_tariffs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para special_tariffs
CREATE POLICY "Usuarios pueden ver tarifas especiales de su parqueadero"
ON special_tariffs FOR SELECT
USING (
  parking_lot_id IN (
    SELECT parking_lot_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Administradores pueden gestionar tarifas especiales"
ON special_tariffs FOR ALL
USING (
  parking_lot_id IN (
    SELECT parking_lot_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  )
);
