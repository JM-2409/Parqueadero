-- 1. Arreglar public.vehicles (Eliminar política duplicada para INSERT)
DROP POLICY IF EXISTS "vehicles_insert_policy_secure" ON public.vehicles;

-- 2. Arreglar public.tariffs_v2 (Eliminar políticas duplicadas para INSERT y UPDATE)
DROP POLICY IF EXISTS "Authenticated Insert Tariffs V2" ON public.tariffs_v2;
DROP POLICY IF EXISTS "Authenticated Update Tariffs V2" ON public.tariffs_v2;
-- Se asume que "Secure Tariffs V2" o "Auth Tariffs V2" ya existe y otorga permisos correctamente.

-- 3. Arreglar public.profiles (Combinar permisos de SELECT en una sola política para evitar conflictos con roles)
DROP POLICY IF EXISTS "Profiles - Admins can view profiles in their parking lot" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - User can view their own profile" ON public.profiles;

CREATE POLICY "Profiles - Select Access" ON public.profiles
    FOR SELECT USING (
        (select auth.uid()) = id OR 
        (parking_lot_id = public.get_user_parking_lot() AND public.get_user_role() IN ('admin', 'superadmin'))
    );

-- 4. Arreglar public.custom_roles (Eliminar política duplicada para UPDATE)
DROP POLICY IF EXISTS "Auth custom_roles" ON public.custom_roles;
