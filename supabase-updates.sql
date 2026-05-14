CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name TEXT DEFAULT 'Sistema de Parqueaderos',
  logo_url TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO app_settings (app_name, logo_url)
SELECT 'Sistema de Parqueaderos', ''
WHERE NOT EXISTS (SELECT 1 FROM app_settings);

ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS allow_employee_view_revenue BOOLEAN DEFAULT false;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS receipt_sequence INTEGER DEFAULT 0;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS nit TEXT;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS lost_ticket_fee NUMERIC DEFAULT 15000;

CREATE TABLE IF NOT EXISTS tariffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('minute', 'hour', 'fraction', 'block')),
  block_hours INTEGER DEFAULT 12,
  day_rate NUMERIC DEFAULT 0,
  night_rate NUMERIC DEFAULT 0,
  day_start_time TIME DEFAULT '06:00:00',
  night_start_time TIME DEFAULT '18:00:00',
  free_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS total_charged NUMERIC DEFAULT 0;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS custom_fields_data JSONB DEFAULT '{}'::jsonb;

-- Mejoras en Cierre de Caja (Control Avanzado)
CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id),
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount NUMERIC DEFAULT 0, -- Monto real recolectado
  expected_amount NUMERIC DEFAULT 0, -- Monto calculado por sistema
  base_amount NUMERIC DEFAULT 0, -- Base de caja dejada
  difference NUMERIC DEFAULT 0, -- Si hubo descuadre
  observations TEXT,
  closed_by UUID REFERENCES profiles(id)
);
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS expected_amount NUMERIC DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS base_amount NUMERIC DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS difference NUMERIC DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS observations TEXT;

-- Mensualidades / Abonados
CREATE TABLE IF NOT EXISTS monthly_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_document TEXT,
  phone TEXT,
  vehicle_type TEXT DEFAULT 'carros',
  amount_paid NUMERIC DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lista Negra (Vehículos Vetados)
CREATE TABLE IF NOT EXISTS blacklisted_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS private_parking_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  block TEXT,
  house_or_apartment TEXT,
  owner_name TEXT,
  space_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  parking_lot_id UUID REFERENCES parking_lots(id),
  used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE invite_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_parking_spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_vehicles DISABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS device_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

ALTER TABLE device_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Device Approvals" ON device_approvals FOR ALL USING (true) WITH CHECK (true);
