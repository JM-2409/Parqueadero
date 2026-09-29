-- ================================================================
-- NEXOPARK - MÓDULOS DE ADMINISTRACIÓN RESIDENCIAL
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. CONFIGURACIÓN DE MÓDULOS POR CONJUNTO
--    Cada conjunto puede activar/desactivar módulos opcionales
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS building_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE UNIQUE,
  -- Módulos activables
  pedestrian_visitors    BOOLEAN DEFAULT false,
  extended_tariff_hours  BOOLEAN DEFAULT false,
  moving_permits         BOOLEAN DEFAULT false,
  package_registry       BOOLEAN DEFAULT false,
  whatsapp_packages      BOOLEAN DEFAULT false,
  residents_directory    BOOLEAN DEFAULT false,
  -- Metadatos
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear registro de módulos para todos los conjuntos existentes (todos OFF por defecto)
INSERT INTO building_modules (parking_lot_id)
SELECT id FROM parking_lots
WHERE id NOT IN (SELECT parking_lot_id FROM building_modules WHERE parking_lot_id IS NOT NULL)
ON CONFLICT DO NOTHING;

ALTER TABLE building_modules DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- 2. DIRECTORIO DE RESIDENTES
--    Solo visible para el administrador del conjunto
--    Datos sensibles: nombre, documento, celular, apartamento
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  apartment      TEXT NOT NULL,
  block          TEXT,
  owner_name     TEXT NOT NULL,
  document       TEXT,
  phone          TEXT,
  email          TEXT,
  is_owner       BOOLEAN DEFAULT true,   -- propietario vs arrendatario
  vehicle_plates TEXT[],                  -- placas registradas (opcional)
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE residents DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- 3. VISITANTES PEATONALES
--    Registro de personas que ingresan a pie al conjunto
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedestrian_visitors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id  UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  visitor_name    TEXT NOT NULL,
  visitor_document TEXT,
  apartment       TEXT NOT NULL,         -- a quién visita (apto/casa)
  resident_name   TEXT,                  -- nombre del residente visitado
  purpose         TEXT,                  -- motivo de la visita
  entry_time      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_time       TIMESTAMP WITH TIME ZONE,
  status          TEXT DEFAULT 'inside' CHECK (status IN ('inside', 'exited')),
  registered_by   TEXT,                  -- nombre del guardia/empleado
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pedestrian_visitors DISABLE ROW LEVEL SECURITY;

-- Realtime para visitantes peatonales
ALTER TABLE pedestrian_visitors REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pedestrian_visitors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedestrian_visitors;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 4. PERMISOS DE TRASTEO
--    Autorización de mudanzas dentro del conjunto
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moving_permits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id  UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  apartment       TEXT NOT NULL,         -- apto de origen o destino
  resident_name   TEXT,
  moving_company  TEXT,                  -- empresa de trasteo
  truck_plate     TEXT,                  -- placa del camión
  permit_date     DATE NOT NULL,         -- fecha autorizada
  start_time      TEXT DEFAULT '08:00',  -- hora inicio
  end_time        TEXT DEFAULT '17:00',  -- hora fin
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  authorized_by   TEXT,                  -- nombre del admin que aprueba
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE moving_permits DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- 5. REGISTRO DE PAQUETES Y DOMICILIOS
--    Control de paquetes que llegan al conjunto
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id  UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  apartment       TEXT NOT NULL,         -- destinatario (apto)
  recipient_name  TEXT,                  -- nombre del residente
  company         TEXT,                  -- empresa (Rappi, Amazon, etc.)
  description     TEXT,                  -- descripción del paquete
  arrival_time    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_time  TIMESTAMP WITH TIME ZONE,
  delivered_to    TEXT,                  -- quien recibió
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','delivered','returned')),
  whatsapp_sent   BOOLEAN DEFAULT false, -- si se envió notificación WA
  registered_by   TEXT,                  -- nombre del guardia/empleado
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- Realtime para paquetes
ALTER TABLE packages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'packages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 6. LOG DE MENSAJES WHATSAPP
--    Historial de todos los mensajes enviados por la plataforma
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  phone          TEXT NOT NULL,
  message        TEXT NOT NULL,
  type           TEXT DEFAULT 'parking' CHECK (type IN ('parking','package','moving_permit','general')),
  reference_id   UUID,                   -- ID del paquete, sesión, trasteo, etc.
  sent_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by        TEXT                    -- nombre del empleado que lo envió
);

ALTER TABLE whatsapp_log DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- 7. ACTIVAR REALTIME EN device_approvals (corrección pendiente)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.device_approvals REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'device_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_approvals;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 8. ACTUALIZAR COLUMNA features EN parking_lots
--    Para guardar config de módulos también en el campo features
-- ────────────────────────────────────────────────────────────────
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS private_custom_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS entry_grace_period_mins INTEGER DEFAULT 0;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS shift_grace_period_mins INTEGER DEFAULT 15;

-- ────────────────────────────────────────────────────────────────
-- Confirmación
-- ────────────────────────────────────────────────────────────────
SELECT 'building_modules' AS tabla, COUNT(*) FROM building_modules
UNION ALL SELECT 'residents', COUNT(*) FROM residents
UNION ALL SELECT 'pedestrian_visitors', COUNT(*) FROM pedestrian_visitors
UNION ALL SELECT 'moving_permits', COUNT(*) FROM moving_permits
UNION ALL SELECT 'packages', COUNT(*) FROM packages
UNION ALL SELECT 'whatsapp_log', COUNT(*) FROM whatsapp_log;
