-- 1. Revertir ambas funciones a SECURITY DEFINER para evitar el error de permisos en el login
-- y para evitar bucles infinitos (infinite recursion) al evaluar las políticas RLS.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_parking_lot()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parking_lot_id FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

-- 2. Asegurarnos de que el rol "authenticated" (usuarios logueados) 
-- tengan permisos para usar estas funciones en las políticas de seguridad
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_parking_lot() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_parking_lot() TO service_role;
