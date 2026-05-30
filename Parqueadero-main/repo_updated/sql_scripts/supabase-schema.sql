-- COMPLETE SYSTEM SCHEMA RE-FACTORY

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. App Settings (Global Platform Options)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name TEXT DEFAULT 'Sistema de Parqueaderos',
  logo_url TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  max_branches INTEGER DEFAULT 1,
  allow_custom_roles BOOLEAN DEFAULT true,
  allow_monthly_subscribers BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Tiers if empty
INSERT INTO subscription_plans (name, price, max_branches, allow_custom_roles, allow_monthly_subscribers)
SELECT 'Básico', 50000, 1, false, false
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Básico');

INSERT INTO subscription_plans (name, price, max_branches, allow_custom_roles, allow_monthly_subscribers)
SELECT 'Premium', 120000, 1, true, true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Premium');

INSERT INTO subscription_plans (name, price, max_branches, allow_custom_roles, allow_monthly_subscribers)
SELECT 'Multi-Sede (Avanzado)', 250000, 5, true, true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Multi-Sede (Avanzado)');

-- 3. Parking Lots (Branches)
CREATE TABLE IF NOT EXISTS parking_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nit TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  phone_contact TEXT,
  capacity INTEGER DEFAULT 100,
  allowed_vehicles JSONB DEFAULT '["motos", "carros", "bicicletas"]',
  show_revenue BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '[]',
  lost_ticket_fee NUMERIC DEFAULT 15000,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add new columns to parking_lots if they do not exist
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS receipt_sequence INTEGER DEFAULT 0;

-- Note: Ensure ALL existing parking lots have a baseline plan assigned
UPDATE parking_lots SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'Básico' LIMIT 1) WHERE plan_id IS NULL;

-- 4. User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'employee')),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  custom_role_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Puente Multi-Sedes para el Administrador
CREATE TABLE IF NOT EXISTS admin_parking_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, parking_lot_id)
);

-- 5. Tariffs configuration
CREATE TABLE IF NOT EXISTS tariffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  charge_type TEXT NOT NULL,
  day_rate NUMERIC DEFAULT 0,
  night_rate NUMERIC DEFAULT 0,
  day_start_time TEXT DEFAULT '06:00',
  night_start_time TEXT DEFAULT '18:00',
  grace_period_minutes INTEGER DEFAULT 15,
  free_minutes INTEGER DEFAULT 0,
  block_hours INTEGER DEFAULT 12,
  fraction_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parking_lot_id, vehicle_type)
);

-- Safely add new columns to tariffs if they do not exist (migration support)
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS fraction_minutes INTEGER DEFAULT 15;

-- 6. Custom Employee Roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enforce Foreign Key correctly strictly referencing custom_roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_custom_role_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_custom_role_id_fkey FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id) ON DELETE SET NULL;

-- 7. Vehicles DB (CRM approach)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  color TEXT,
  owner_name TEXT,
  custom_fields_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Active & Historical Sessions
CREATE TABLE IF NOT EXISTS parking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  entry_employee_name TEXT,
  exit_employee_name TEXT,
  fee NUMERIC,
  total_charged NUMERIC,
  receipt_number TEXT,
  duration_minutes INTEGER,
  extra_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add new columns to parking_sessions if they do not exist
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS total_charged NUMERIC;

-- 9. Cash Closures (Arqueos)
CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Blacklist
CREATE TABLE IF NOT EXISTS blacklisted_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parking_lot_id, plate)
);

-- 11. Monthly Subscribers
CREATE TABLE IF NOT EXISTS monthly_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  owner_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_paid NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add new columns to monthly_subscribers if they do not exist
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS owner_document TEXT;
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'carros';
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 12. Private Parking Spaces 
CREATE TABLE IF NOT EXISTS private_parking_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  space_number TEXT NOT NULL,
  block TEXT,
  house_or_apartment TEXT,
  owner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parking_lot_id, space_number)
);

-- DISABLE RLS for prototype (MUST BE ENABLED IN PRODUCTION)
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_parking_lots DISABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_parking_spaces DISABLE ROW LEVEL SECURITY;
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
CREATE TABLE IF NOT EXISTS private_parking_history (
CREATE TABLE IF NOT EXISTS private_parking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT,
  owner_name TEXT,
  custom_fields_data JSONB DEFAULT '{}'::jsonb,
  released_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE private_parking_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Private Parking History" ON private_parking_history FOR ALL USING (true) WITH CHECK (true);
-- Create cash_withdrawals table
CREATE TABLE IF NOT EXISTS cash_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  withdrawn_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  withdrawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add basic policy
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth cash_withdrawals" ON cash_withdrawals FOR ALL USING (true) WITH CHECK (true);

-- Update cash_closures to track withdrawals and expected revenue clearly
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS withdrawn_amount NUMERIC DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS expected_revenue NUMERIC DEFAULT 0;
