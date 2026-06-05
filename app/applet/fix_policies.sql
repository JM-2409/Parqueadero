-- SOLUCIÓN 1: Políticas seguras para vehicle_inspections
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth Vehicle Inspections" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Vehicle Inspections - Access own parking lot" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Vehicle Inspections - Select" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Vehicle Inspections - Insert" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Vehicle Inspections - Update" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Vehicle Inspections - Delete" ON public.vehicle_inspections;

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


-- SOLUCIÓN 2: Políticas seguras para device_approvals
ALTER TABLE public.device_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Device Approvals" ON public.device_approvals;
DROP POLICY IF EXISTS "Device Approvals - Select" ON public.device_approvals;
DROP POLICY IF EXISTS "Device Approvals - Insert" ON public.device_approvals;
DROP POLICY IF EXISTS "Device Approvals - Update" ON public.device_approvals;
DROP POLICY IF EXISTS "Device Approvals - Delete" ON public.device_approvals;

CREATE POLICY "Device Approvals - Select" ON public.device_approvals
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  public.get_user_role() = 'superadmin' OR
  (public.get_user_role() = 'admin' AND public.get_user_parking_lot() = parking_lot_id)
);

CREATE POLICY "Device Approvals - Insert" ON public.device_approvals
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  public.get_user_role() = 'superadmin' OR
  (public.get_user_role() = 'admin' AND public.get_user_parking_lot() = parking_lot_id)
);

CREATE POLICY "Device Approvals - Update" ON public.device_approvals
FOR UPDATE TO authenticated
USING (
  public.get_user_role() = 'superadmin' OR
  (public.get_user_role() = 'admin' AND public.get_user_parking_lot() = parking_lot_id) OR
  user_id = auth.uid()
)
WITH CHECK (
  public.get_user_role() = 'superadmin' OR
  (public.get_user_role() = 'admin' AND public.get_user_parking_lot() = parking_lot_id) OR
  user_id = auth.uid()
);

CREATE POLICY "Device Approvals - Delete" ON public.device_approvals
FOR DELETE TO authenticated
USING (
  public.get_user_role() = 'superadmin' OR
  (public.get_user_role() = 'admin' AND public.get_user_parking_lot() = parking_lot_id) OR
  user_id = auth.uid()
);
