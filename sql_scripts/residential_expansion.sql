-- EXPANSIÓN HACIA GESTIÓN RESIDENCIAL INTEGRAL

-- 1. Actualizar roles en perfiles para incluir 'resident'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'admin', 'employee', 'resident'));

-- 2. Configuración de Requisitos de Documentación (Admin define qué pedir)
CREATE TABLE IF NOT EXISTS document_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'parking_request', 'vehicle_change', 'move_in'
  document_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Solicitudes de Residentes (Parqueo, Vehículos, Zonas Comunes)
CREATE TABLE IF NOT EXISTS resident_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'parking', 'vehicle', 'common_area', 'move'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  details JSONB DEFAULT '{}'::jsonb, -- Datos de la solicitud (ej. fecha BBQ, placa nueva)
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Documentos Cargados por Residentes
CREATE TABLE IF NOT EXISTS resident_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES resident_requests(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Gestión de Encomiendas (Paquetes)
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  block TEXT,
  apartment TEXT,
  description TEXT,
  received_by UUID REFERENCES profiles(id), -- Empleado que recibe
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivered_to_name TEXT,
  status TEXT DEFAULT 'in_porteria', -- 'in_porteria', 'delivered'
  notification_sent BOOLEAN DEFAULT false
);

-- 6. Zonas Comunes
CREATE TABLE IF NOT EXISTS common_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'BBQ', 'Salón Social', 'Gimnasio', 'Piscina'
  capacity INTEGER,
  rules TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Vincular espacios de parqueo privados a perfiles de residentes
ALTER TABLE private_parking_spaces ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
