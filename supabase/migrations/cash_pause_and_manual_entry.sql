-- Migración para soporte de pausa de caja y exclusión de registros de caja en parking_sessions
-- Asegura que la columna features exista en parking_lots y que parking_sessions soporte extra_data con is_paused

-- 1. Asegurar columna features en parking_lots
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- 2. Asegurar columna extra_data en parking_sessions
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

-- 3. Asegurar que las políticas RLS permitan a los administradores actualizar features en su parqueadero
DO $$
BEGIN
  -- Si RLS está activo en parking_lots, aseguramos la política de actualización para administradores
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'parking_lots'
    AND rowsecurity = true
  ) THEN
    -- Actualizar política si existe
    DROP POLICY IF EXISTS "Parking Lots - Admins update own" ON parking_lots;
    CREATE POLICY "Parking Lots - Admins update own" ON parking_lots
      FOR UPDATE
      TO authenticated
      USING (
        id IN (
          SELECT parking_lot_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      )
      WITH CHECK (
        id IN (
          SELECT parking_lot_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      );
  END IF;
END $$;
