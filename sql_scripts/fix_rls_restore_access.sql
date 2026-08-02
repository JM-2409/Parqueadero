-- ==============================================================================
-- RESTAURACIÓN INMEDIATA DE ACCESO RLS Y TARIFAS EN SUPABASE
-- ==============================================================================

-- 1. Asegurar que las lecturas de tarifas no sean bloqueadas por RLS (evita cobros $0)
DROP POLICY IF EXISTS "Tariffs - Access own parking lot" ON tariffs;
DROP POLICY IF EXISTS "Tariffs - Read authenticated" ON tariffs;
CREATE POLICY "Tariffs - Read authenticated" ON tariffs 
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Permitir a todos los usuarios autenticados crear/editar sesiones de parqueadero
DROP POLICY IF EXISTS "Parking Sessions - Access own parking lot" ON parking_sessions;
DROP POLICY IF EXISTS "Parking Sessions - Authenticated Access" ON parking_sessions;
CREATE POLICY "Parking Sessions - Authenticated Access" ON parking_sessions 
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Permitir acceso autenticado a perfiles y parqueaderos
DROP POLICY IF EXISTS "Profiles - Admins can view profiles in their parking lot" ON profiles;
DROP POLICY IF EXISTS "Profiles - Authenticated Access" ON profiles;
CREATE POLICY "Profiles - Authenticated Access" ON profiles 
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Parking Lots - View own" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Superadmin all" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Admins update own" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Authenticated Access" ON parking_lots;
CREATE POLICY "Parking Lots - Authenticated Access" ON parking_lots 
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. Permitir acceso autenticado a abonados y lista negra
DROP POLICY IF EXISTS "Monthly Subscribers - Access own parking lot" ON monthly_subscribers;
DROP POLICY IF EXISTS "Monthly Subscribers - Authenticated Access" ON monthly_subscribers;
CREATE POLICY "Monthly Subscribers - Authenticated Access" ON monthly_subscribers 
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Blacklisted Vehicles - Access own parking lot" ON blacklisted_vehicles;
DROP POLICY IF EXISTS "Blacklisted Vehicles - Authenticated Access" ON blacklisted_vehicles;
CREATE POLICY "Blacklisted Vehicles - Authenticated Access" ON blacklisted_vehicles 
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Cash Closures - Access own parking lot" ON cash_closures;
DROP POLICY IF EXISTS "Cash Closures - Authenticated Access" ON cash_closures;
CREATE POLICY "Cash Closures - Authenticated Access" ON cash_closures 
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
