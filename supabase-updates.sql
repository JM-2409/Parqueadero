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

CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id),
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount NUMERIC DEFAULT 0,
  closed_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
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

-- Disable RLS for new tables
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_parking_spaces DISABLE ROW LEVEL SECURITY;
