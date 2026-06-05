-- 1. Cambiar get_user_role a SECURITY INVOKER
ALTER FUNCTION public.get_user_role() SECURITY INVOKER;
-- Si no lo usamos como API, también podemos revocar el acceso externo por si acaso:
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM authenticated;

-- 2. Cambiar get_user_parking_lot a SECURITY INVOKER
ALTER FUNCTION public.get_user_parking_lot() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_user_parking_lot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_parking_lot() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_parking_lot() FROM authenticated;

-- 3. Eliminar políticas duplicadas y permisivas en blacklisted_vehicles para DELETE/ALL
DROP POLICY IF EXISTS "Auth blacklisted_vehicles" ON public.blacklisted_vehicles;
DROP POLICY IF EXISTS "Authenticated Delete Blacklist" ON public.blacklisted_vehicles;

-- Dejamos activa solamente "Blacklisted Vehicles - Access own parking lot" 
-- que es la que restringe el acceso al parqueadero del usuario actual.
