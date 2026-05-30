-- Fix for 5. multiple permissive policies for dashboard_user on custom_roles DELETE
DROP POLICY IF EXISTS "Secure access custom_roles" ON public.custom_roles;

-- Fix for 6. multiple permissive policies for anon on monthly_subscribers DELETE
DROP POLICY IF EXISTS "Public Subscribers" ON public.monthly_subscribers;

-- Fix for 7. multiple permissive policies for authenticated on parking_lots SELECT
DROP POLICY IF EXISTS "Public Parking Lots" ON public.parking_lots;
