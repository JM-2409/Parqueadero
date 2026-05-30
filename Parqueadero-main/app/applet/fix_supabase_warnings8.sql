-- 1. Eliminar política duplicada en blacklisted_vehicles para INSERT
DROP POLICY IF EXISTS "Authenticated Insert Blacklist" ON public.blacklisted_vehicles;

-- 2. Eliminar política duplicada en blacklisted_vehicles para UPDATE
DROP POLICY IF EXISTS "Authenticated Update Blacklist" ON public.blacklisted_vehicles;

-- 3. Eliminar política permisiva duplicada/insegura en profiles para UPDATE (anon)
DROP POLICY IF EXISTS "Public Profiles" ON public.profiles;
