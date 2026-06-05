-- 1. FIX FOR vehicle_inspections (Permissive policy)
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth Vehicle Inspections" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Vehicle Inspections - Access own parking lot" ON public.vehicle_inspections;

CREATE POLICY "Vehicle Inspections - Select" ON public.vehicle_inspections
FOR SELECT TO authenticated
USING (
  parking_lot_id = public.get_user_parking_lot() OR
  public.get_user_role() = 'superadmin' OR
  public.get_user_role() = 'admin'
);

CREATE POLICY "Vehicle Inspections - Insert" ON public.vehicle_inspections
FOR INSERT TO authenticated
WITH CHECK (
  parking_lot_id = public.get_user_parking_lot() OR
  public.get_user_role() = 'superadmin' OR
  public.get_user_role() = 'admin'
);

CREATE POLICY "Vehicle Inspections - Update" ON public.vehicle_inspections
FOR UPDATE TO authenticated
USING (
  parking_lot_id = public.get_user_parking_lot() OR
  public.get_user_role() = 'superadmin' OR
  public.get_user_role() = 'admin'
)
WITH CHECK (
  parking_lot_id = public.get_user_parking_lot() OR
  public.get_user_role() = 'superadmin' OR
  public.get_user_role() = 'admin'
);

CREATE POLICY "Vehicle Inspections - Delete" ON public.vehicle_inspections
FOR DELETE TO authenticated
USING (
  parking_lot_id = public.get_user_parking_lot() OR
  public.get_user_role() = 'superadmin' OR
  public.get_user_role() = 'admin'
);
