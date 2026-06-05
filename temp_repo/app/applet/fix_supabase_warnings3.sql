-- 1. Fix get_user_role()SECURITY DEFINER
ALTER FUNCTION public.get_user_role() SECURITY INVOKER;

-- 2. Fix unrestricted public.private_parking_spaces access
DROP POLICY IF EXISTS "Public Private Spaces" ON public.private_parking_spaces;

-- 3. Fix multiple permissive policies for anon on cash_closures UPDATE
DROP POLICY IF EXISTS "Secure Cash Closures" ON public.cash_closures;

-- 4. Fix multiple permissive policies for authenticated on private_parking_history DELETE
DROP POLICY IF EXISTS "Public Private Parking History" ON public.private_parking_history;
