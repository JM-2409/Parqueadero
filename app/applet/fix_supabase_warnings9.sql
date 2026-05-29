-- 1. Fix public.vehicles overly permissive policies + multiple permissive for UPDATE
DROP POLICY IF EXISTS "Vehicles - Auth users can access" ON public.vehicles;
DROP POLICY IF EXISTS "Auth vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Secure Vehicles" ON public.vehicles;

CREATE POLICY "Auth vehicles Access" ON public.vehicles 
FOR ALL TO authenticated 
USING ( (select auth.role()) = 'authenticated' ) 
WITH CHECK ( (select auth.role()) = 'authenticated' );

-- 2. Fix public.tariffs_v3 Public Tariffs V3
DROP POLICY IF EXISTS "Public Tariffs V3" ON public.tariffs_v3;

CREATE POLICY "Auth Tariffs V3" ON public.tariffs_v3 
FOR ALL TO authenticated 
USING ( parking_lot_id = public.get_user_parking_lot() ) 
WITH CHECK ( parking_lot_id = public.get_user_parking_lot() );

-- 3. Fix public.tariff_history
DROP POLICY IF EXISTS "Public Access Tariff History" ON public.tariff_history;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tariff_history') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tariff_history' AND column_name='parking_lot_id') THEN
            EXECUTE 'CREATE POLICY "Auth Access Tariff History" ON public.tariff_history FOR ALL TO authenticated USING ( parking_lot_id = public.get_user_parking_lot() ) WITH CHECK ( parking_lot_id = public.get_user_parking_lot() );';
        ELSE
            EXECUTE 'CREATE POLICY "Auth Access Tariff History" ON public.tariff_history FOR ALL TO authenticated USING ( (select auth.role()) = ''authenticated'' ) WITH CHECK ( (select auth.role()) = ''authenticated'' );';
        END IF;
    END IF;
END
$$;

-- 4. Fix public.employee_logs
DROP POLICY IF EXISTS "Public full logs" ON public.employee_logs;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='employee_logs') THEN
        EXECUTE 'CREATE POLICY "Auth full logs" ON public.employee_logs FOR ALL TO authenticated USING ( parking_lot_id = public.get_user_parking_lot() ) WITH CHECK ( parking_lot_id = public.get_user_parking_lot() );';
    END IF;
END
$$;

-- 5. Fix public.device_approvals
DROP POLICY IF EXISTS "Public Device Approvals" ON public.device_approvals;

CREATE POLICY "Auth Device Approvals" ON public.device_approvals 
FOR ALL TO authenticated 
USING ( parking_lot_id = public.get_user_parking_lot() ) 
WITH CHECK ( parking_lot_id = public.get_user_parking_lot() );

-- 6. Fix public.cash_closures overly permissive policy
-- We just DROP the bad one, leaving "Cash Closures - Access own parking lot" which is secure.
DROP POLICY IF EXISTS "Auth cash_closures" ON public.cash_closures;
