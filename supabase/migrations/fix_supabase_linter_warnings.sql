-- ==============================================================================
-- CORRECCIÓN A PRUEBA DE ERRORES: SUPABASE LINTER WARNINGS (CASCADE)
-- ==============================================================================

-- 1. Crear esquema privado 'internal' para funciones auxiliares de RLS.
CREATE SCHEMA IF NOT EXISTS internal;

-- 2. Crear las funciones dentro del esquema privado
CREATE OR REPLACE FUNCTION internal.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION internal.get_user_parking_lot()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parking_lot_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Otorgar permisos de uso del esquema interno al rol autenticado
GRANT USAGE ON SCHEMA internal TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.get_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION internal.get_user_parking_lot() TO authenticated, service_role;

-- 4. Eliminar con CASCADE las funciones públicas antiguas (evita errores por dependencias)
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_parking_lot() CASCADE;

-- 5. Volver a crear todas las políticas de RLS apuntando a las funciones del esquema internal

-- TABLA: profiles
DROP POLICY IF EXISTS "Profiles - User can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles - User can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles - Admins can view profiles in their parking lot" ON profiles;

CREATE POLICY "Profiles - User can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = profiles.id);

CREATE POLICY "Profiles - User can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = profiles.id);

CREATE POLICY "Profiles - Admins can view profiles in their parking lot" ON profiles
    FOR SELECT USING (
        profiles.parking_lot_id = internal.get_user_parking_lot() AND internal.get_user_role() IN ('admin', 'superadmin')
    );

-- TABLA: app_settings
DROP POLICY IF EXISTS "App Settings - Anyone can read" ON app_settings;
DROP POLICY IF EXISTS "App Settings - Superadmin can write" ON app_settings;

CREATE POLICY "App Settings - Anyone can read" ON app_settings
    FOR SELECT USING (true);

CREATE POLICY "App Settings - Superadmin can write" ON app_settings
    FOR ALL USING (
        internal.get_user_role() = 'superadmin'
    );

-- TABLA: subscription_plans
DROP POLICY IF EXISTS "Subscription Plans - Anyone can read" ON subscription_plans;

CREATE POLICY "Subscription Plans - Anyone can read" ON subscription_plans
    FOR SELECT USING (true);

-- TABLA: parking_lots
DROP POLICY IF EXISTS "Parking Lots - View own" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Superadmin all" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Admins update own" ON parking_lots;

CREATE POLICY "Parking Lots - View own" ON parking_lots
    FOR SELECT USING (
        parking_lots.id = internal.get_user_parking_lot()
    );
CREATE POLICY "Parking Lots - Superadmin all" ON parking_lots
    FOR ALL USING (
        internal.get_user_role() = 'superadmin'
    );
CREATE POLICY "Parking Lots - Admins update own" ON parking_lots
    FOR UPDATE USING (
        parking_lots.id = internal.get_user_parking_lot() AND internal.get_user_role() = 'admin'
    );

-- TABLA: tariffs
DROP POLICY IF EXISTS "Tariffs - Access own parking lot" ON tariffs;

CREATE POLICY "Tariffs - Access own parking lot" ON tariffs
    FOR ALL USING (
        tariffs.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: custom_roles
DROP POLICY IF EXISTS "Custom Roles - Access own parking lot" ON custom_roles;

CREATE POLICY "Custom Roles - Access own parking lot" ON custom_roles
    FOR ALL USING (
        custom_roles.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: vehicles
DROP POLICY IF EXISTS "Vehicles - Auth users can access" ON vehicles;

CREATE POLICY "Vehicles - Auth users can access" ON vehicles
    FOR ALL USING (auth.role() = 'authenticated');

-- TABLA: parking_sessions
DROP POLICY IF EXISTS "Parking Sessions - Access own parking lot" ON parking_sessions;

CREATE POLICY "Parking Sessions - Access own parking lot" ON parking_sessions
    FOR ALL USING (
        parking_sessions.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: cash_closures
DROP POLICY IF EXISTS "Cash Closures - Access own parking lot" ON cash_closures;

CREATE POLICY "Cash Closures - Access own parking lot" ON cash_closures
    FOR ALL USING (
        cash_closures.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: blacklisted_vehicles
DROP POLICY IF EXISTS "Blacklisted Vehicles - Access own parking lot" ON blacklisted_vehicles;

CREATE POLICY "Blacklisted Vehicles - Access own parking lot" ON blacklisted_vehicles
    FOR ALL USING (
        blacklisted_vehicles.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: monthly_subscribers
DROP POLICY IF EXISTS "Monthly Subscribers - Access own parking lot" ON monthly_subscribers;

CREATE POLICY "Monthly Subscribers - Access own parking lot" ON monthly_subscribers
    FOR ALL USING (
        monthly_subscribers.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: private_parking_spaces
DROP POLICY IF EXISTS "Private Parking Spaces - Access own parking lot" ON private_parking_spaces;

CREATE POLICY "Private Parking Spaces - Access own parking lot" ON private_parking_spaces
    FOR ALL USING (
        private_parking_spaces.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: private_parking_history
DROP POLICY IF EXISTS "Private Parking History - Access own parking lot" ON private_parking_history;

CREATE POLICY "Private Parking History - Access own parking lot" ON private_parking_history
    FOR ALL USING (
        private_parking_history.parking_lot_id = internal.get_user_parking_lot()
    );

-- TABLA: cash_withdrawals
DROP POLICY IF EXISTS "Cash Withdrawals - Access own parking lot" ON cash_withdrawals;

CREATE POLICY "Cash Withdrawals - Access own parking lot" ON cash_withdrawals
    FOR ALL USING (
        cash_withdrawals.parking_lot_id = internal.get_user_parking_lot()
    );
