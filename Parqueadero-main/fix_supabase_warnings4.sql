-- Fix for 1. multiple permissive policies for authenticator/authenticated on parking_sessions SELECT
DROP POLICY IF EXISTS "Public Sessions" ON public.parking_sessions;

-- Fix for 2. multiple permissive policies for anon on blacklisted_vehicles SELECT
DROP POLICY IF EXISTS "Secure Blacklist" ON public.blacklisted_vehicles;

-- Fix for 3. multiple permissive policies for authenticated on app_settings SELECT
-- IF "App Settings - Superadmin can write" also applies to SELECT, it is redundant with "App Settings - Anyone can read".
-- Let's drop "App Settings - Anyone can read" and recreate it just to be sure, or simply drop the redundant SELECT action.
-- Usually, we want everyone to read settings, so we keep "App Settings - Anyone can read" and remove the SELECT right from "App Settings - Superadmin can write" if it had it.
-- We can drop the "App Settings - Anyone can read" for anon if it's there but wait, the warning is for "authenticated".
-- The easiest way to fix the warning is to drop the Superadmin one if it's a SELECT policy, but it's likely an ALL policy. 
-- We can recreate it as INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "App Settings - Superadmin can write" ON public.app_settings;
CREATE POLICY "App Settings - Superadmin can write" ON public.app_settings 
FOR ALL TO authenticated 
USING ( public.get_user_role() = 'superadmin' )
WITH CHECK ( public.get_user_role() = 'superadmin' );

-- To avoid the overlap on SELECT, we can drop the generic one and recreate it for read operations
DROP POLICY IF EXISTS "App Settings - Anyone can read" ON public.app_settings;
CREATE POLICY "App Settings - Anyone can read" ON public.app_settings 
FOR SELECT TO authenticated, anon 
USING (true);

-- And recreate the superadmin one ONLY for INSERT, UPDATE, DELETE to avoid the multiple SELECT policies warning
DROP POLICY IF EXISTS "App Settings - Superadmin can write" ON public.app_settings;
CREATE POLICY "App Settings - Superadmin insert" ON public.app_settings 
FOR INSERT TO authenticated 
WITH CHECK ( public.get_user_role() = 'superadmin' );

CREATE POLICY "App Settings - Superadmin update" ON public.app_settings 
FOR UPDATE TO authenticated 
USING ( public.get_user_role() = 'superadmin' )
WITH CHECK ( public.get_user_role() = 'superadmin' );

CREATE POLICY "App Settings - Superadmin delete" ON public.app_settings 
FOR DELETE TO authenticated 
USING ( public.get_user_role() = 'superadmin' );
