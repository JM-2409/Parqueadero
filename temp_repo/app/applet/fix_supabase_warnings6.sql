-- 1. Arreglar el search_path en limpiar_recibos_antiguos
ALTER FUNCTION public.limpiar_recibos_antiguos() SET search_path = public;

-- 2. Arreglar funciones para que usen (select auth.uid()) en lugar de sólo auth.uid()
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_parking_lot()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parking_lot_id FROM profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

-- 3. Arreglar política de Profiles
DROP POLICY IF EXISTS "Profiles - User can update their own profile" ON public.profiles;
CREATE POLICY "Profiles - User can update their own profile" ON public.profiles
    FOR UPDATE USING ( (select auth.uid()) = profiles.id );

DROP POLICY IF EXISTS "Profiles - User can view their own profile" ON public.profiles;
CREATE POLICY "Profiles - User can view their own profile" ON public.profiles
    FOR SELECT USING ( (select auth.uid()) = profiles.id );

-- 4. Arreglar políticas de Vehicles
DROP POLICY IF EXISTS "Vehicles - Auth users can access" ON public.vehicles;
CREATE POLICY "Vehicles - Auth users can access" ON public.vehicles
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth vehicles" ON public.vehicles;
CREATE POLICY "Auth vehicles" ON public.vehicles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Arreglar política de Blacklisted Vehicles
DROP POLICY IF EXISTS "Auth blacklisted_vehicles" ON public.blacklisted_vehicles;
CREATE POLICY "Auth blacklisted_vehicles" ON public.blacklisted_vehicles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Arreglar política de Cash Closures
DROP POLICY IF EXISTS "Auth cash_closures" ON public.cash_closures;
CREATE POLICY "Auth cash_closures" ON public.cash_closures
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Arreglar política de Cash Withdrawals
-- Se recrea por si acaso, pero el error principal venía de la función get_user_parking_lot()
DROP POLICY IF EXISTS "Cash Withdrawals - Access own parking lot" ON public.cash_withdrawals;
CREATE POLICY "Cash Withdrawals - Access own parking lot" ON public.cash_withdrawals
    FOR ALL USING (
        cash_withdrawals.parking_lot_id = public.get_user_parking_lot()
    );

-- 8. Remover la política que permite a cualquiera listar TODOS los archivos en el bucket "receipts"
-- Los buckets públicos no necesitan esta política para que las URLs públicas funcionen.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
