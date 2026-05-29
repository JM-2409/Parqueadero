-- ==============================================================================
-- NEXOPARK - ACTUALIZACIÓN DE SEGURIDAD (RLS)
-- ==============================================================================

-- 0. Crear funciones seguras para evitar recursividad (Infinite Recursion) en políticas RLS.
-- Estas funciones evitan consultar la tabla "profiles" desde las propias políticas de "profiles",
-- utilizando la tabla auth.users o definiendo funciones con SECURITY DEFINER.

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_parking_lot()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parking_lot_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 1. Activar RLS en todas las tablas principales
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_parking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas existentes (si aplicable)
DROP POLICY IF EXISTS "Profiles - User can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles - User can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles - Admins can view profiles in their parking lot" ON profiles;
DROP POLICY IF EXISTS "App Settings - Anyone can read" ON app_settings;
DROP POLICY IF EXISTS "App Settings - Superadmin can write" ON app_settings;
DROP POLICY IF EXISTS "Subscription Plans - Anyone can read" ON subscription_plans;
DROP POLICY IF EXISTS "Parking Lots - View own" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Superadmin all" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Admins update own" ON parking_lots;
DROP POLICY IF EXISTS "Tariffs - Access own parking lot" ON tariffs;
DROP POLICY IF EXISTS "Custom Roles - Access own parking lot" ON custom_roles;
DROP POLICY IF EXISTS "Vehicles - Auth users can access" ON vehicles;
DROP POLICY IF EXISTS "Parking Sessions - Access own parking lot" ON parking_sessions;
DROP POLICY IF EXISTS "Cash Closures - Access own parking lot" ON cash_closures;
DROP POLICY IF EXISTS "Blacklisted Vehicles - Access own parking lot" ON blacklisted_vehicles;
DROP POLICY IF EXISTS "Monthly Subscribers - Access own parking lot" ON monthly_subscribers;
DROP POLICY IF EXISTS "Private Parking Spaces - Access own parking lot" ON private_parking_spaces;
DROP POLICY IF EXISTS "Admin Parking Lots - Access own" ON admin_parking_lots;
DROP POLICY IF EXISTS "Private Parking History - Access own parking lot" ON private_parking_history;
DROP POLICY IF EXISTS "Device Approvals - Access own" ON device_approvals;
DROP POLICY IF EXISTS "Cash Withdrawals - Access own parking lot" ON cash_withdrawals;


-- 3. Crear políticas de seguridad con RLS (Usando las funciones seguras)

-- TABLA: profiles
CREATE POLICY "Profiles - User can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles - User can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles - Admins can view profiles in their parking lot" ON profiles
    FOR SELECT USING (
        parking_lot_id = get_user_parking_lot() AND get_user_role() IN ('admin', 'superadmin')
    );

-- TABLA: app_settings
CREATE POLICY "App Settings - Anyone can read" ON app_settings
    FOR SELECT USING (true);
CREATE POLICY "App Settings - Superadmin can write" ON app_settings
    FOR ALL USING (
        get_user_role() = 'superadmin'
    );

-- TABLA: subscription_plans
CREATE POLICY "Subscription Plans - Anyone can read" ON subscription_plans
    FOR SELECT USING (true);

-- TABLA: parking_lots
CREATE POLICY "Parking Lots - View own" ON parking_lots
    FOR SELECT USING (
        id = get_user_parking_lot()
    );
CREATE POLICY "Parking Lots - Superadmin all" ON parking_lots
    FOR ALL USING (
        get_user_role() = 'superadmin'
    );
CREATE POLICY "Parking Lots - Admins update own" ON parking_lots
    FOR UPDATE USING (
        id = get_user_parking_lot() AND get_user_role() = 'admin'
    );

-- TABLA: tariffs
CREATE POLICY "Tariffs - Access own parking lot" ON tariffs
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: custom_roles
CREATE POLICY "Custom Roles - Access own parking lot" ON custom_roles
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: vehicles (Globales, pero requieren auth)
CREATE POLICY "Vehicles - Auth users can access" ON vehicles
    FOR ALL USING (auth.role() = 'authenticated');

-- TABLA: parking_sessions
CREATE POLICY "Parking Sessions - Access own parking lot" ON parking_sessions
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: cash_closures
CREATE POLICY "Cash Closures - Access own parking lot" ON cash_closures
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: blacklisted_vehicles
CREATE POLICY "Blacklisted Vehicles - Access own parking lot" ON blacklisted_vehicles
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: monthly_subscribers
CREATE POLICY "Monthly Subscribers - Access own parking lot" ON monthly_subscribers
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: private_parking_spaces
CREATE POLICY "Private Parking Spaces - Access own parking lot" ON private_parking_spaces
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: admin_parking_lots
CREATE POLICY "Admin Parking Lots - Access own" ON admin_parking_lots
    FOR SELECT USING (
        admin_id = auth.uid()
        OR
        get_user_role() = 'superadmin'
    );

-- TABLA: private_parking_history
CREATE POLICY "Private Parking History - Access own parking lot" ON private_parking_history
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );

-- TABLA: device_approvals
CREATE POLICY "Device Approvals - Access own" ON device_approvals
    FOR ALL USING (
        user_id = auth.uid()
        OR
        (parking_lot_id = get_user_parking_lot() AND get_user_role() IN ('admin', 'superadmin'))
    );

-- TABLA: cash_withdrawals
CREATE POLICY "Cash Withdrawals - Access own parking lot" ON cash_withdrawals
    FOR ALL USING (
        parking_lot_id = get_user_parking_lot()
    );
