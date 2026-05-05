-- ==========================================
-- SCRIPT DE CORRECCIONES PARA SUPABASE
-- Pega esto en el editor SQL de Supabase 
-- y ejecútalo para limpiar las notificaciones
-- ==========================================

-- 0. Añadir la columna nueva que necesitamos para las preferencias de impresión
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 1. Corregir search_path mutable en funciones expuestas
ALTER FUNCTION public.deactivate_expired_subscribers() SET search_path = public;

-- 2. Revocar permisos inseguros (anon y authenticated) de función de auto-enable para ocultarla
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
-- Opcional: Hacerla SECURITY INVOKER en lugar de DEFINER
ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER;

-- 3. Limpiar políticas duplicadas y excesivamente permisivas (anon)
-- admin_parking_lots
DROP POLICY IF EXISTS "Allow All" ON public.admin_parking_lots;
DROP POLICY IF EXISTS "Public access admin_parking_lots" ON public.admin_parking_lots;

-- app_settings
DROP POLICY IF EXISTS "Allow All" ON public.app_settings;
DROP POLICY IF EXISTS "Public access app_settings" ON public.app_settings;

-- invite_codes
DROP POLICY IF EXISTS "Allow All" ON public.invite_codes;
DROP POLICY IF EXISTS "Public access invite_codes" ON public.invite_codes;

-- custom_roles
DROP POLICY IF EXISTS "Allow All" ON public.custom_roles;
DROP POLICY IF EXISTS "Public access custom_roles" ON public.custom_roles;

-- subscription_plans
DROP POLICY IF EXISTS "Allow All" ON public.subscription_plans;
DROP POLICY IF EXISTS "Public access subscription_plans" ON public.subscription_plans;

-- tariffs
DROP POLICY IF EXISTS "Allow All" ON public.tariffs;
DROP POLICY IF EXISTS "Public access tariffs" ON public.tariffs;

-- tariffs_v2
DROP POLICY IF EXISTS "Allow all for tariffs_v2" ON public.tariffs_v2;
DROP POLICY IF EXISTS "Public Tariffs V2" ON public.tariffs_v2;
DROP POLICY IF EXISTS "Allow Delete Tariffs" ON public.tariffs_v2;
DROP POLICY IF EXISTS "Authenticated Delete Tariffs V2" ON public.tariffs_v2;
-- Eliminamos también la que no está optimizada (la que marca error de auth.<function>())
DROP POLICY IF EXISTS "tariffs_v2_delete_policy" ON public.tariffs_v2;

-- vehicles
DROP POLICY IF EXISTS "Public Vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON public.vehicles;

-- blacklisted_vehicles
DROP POLICY IF EXISTS "Public Blacklist" ON public.blacklisted_vehicles;

-- cash_closures
DROP POLICY IF EXISTS "Public Cash Closures" ON public.cash_closures;

-- 4. Recrear políticas de forma segura (Solo para usuarios autenticados) para evitar los avisos de USING(true)

CREATE POLICY "Auth custom_roles" ON public.custom_roles 
AS PERMISSIVE FOR ALL TO authenticated 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth vehicles" ON public.vehicles 
AS PERMISSIVE FOR ALL TO authenticated 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth blacklisted_vehicles" ON public.blacklisted_vehicles 
AS PERMISSIVE FOR ALL TO authenticated 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth cash_closures" ON public.cash_closures 
AS PERMISSIVE FOR ALL TO authenticated 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');
