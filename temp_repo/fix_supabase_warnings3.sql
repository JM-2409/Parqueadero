-- Fix for 1. get_user_role() SECURITY DEFINER
ALTER FUNCTION public.get_user_role() SECURITY INVOKER;

-- Fix for 2. unrestricted public.private_parking_spaces access
DROP POLICY IF EXISTS "Public Private Spaces" ON public.private_parking_spaces;

-- Fix for 3. multiple permissive policies for anon on cash_closures UPDATE
DROP POLICY IF EXISTS "Secure Cash Closures" ON public.cash_closures;

-- Fix for 4. multiple permissive policies for authenticated on private_parking_history DELETE
DROP POLICY IF EXISTS "Public Private Parking History" ON public.private_parking_history;
