-- Conserva lectura operativa para empleados y reserva cambios administrativos
-- de tarifas, caja y configuracion al administrador.

DROP POLICY IF EXISTS "blacklisted_vehicles_manage_own_lot" ON public.blacklisted_vehicles;
CREATE POLICY "blacklisted_vehicles_employee_read_own_lot"
  ON public.blacklisted_vehicles
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );
CREATE POLICY "blacklisted_vehicles_admin_manage_own_lot"
  ON public.blacklisted_vehicles
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "monthly_subscribers_manage_own_lot" ON public.monthly_subscribers;
CREATE POLICY "monthly_subscribers_employee_read_own_lot"
  ON public.monthly_subscribers
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );
CREATE POLICY "monthly_subscribers_admin_manage_own_lot"
  ON public.monthly_subscribers
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "tariffs_manage_own_lot" ON public.tariffs;
CREATE POLICY "tariffs_employee_read_own_lot"
  ON public.tariffs
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );
CREATE POLICY "tariffs_admin_manage_own_lot"
  ON public.tariffs
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "tariffs_v2_manage_own_lot" ON public.tariffs_v2;
CREATE POLICY "tariffs_v2_employee_read_own_lot"
  ON public.tariffs_v2
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );
CREATE POLICY "tariffs_v2_admin_manage_own_lot"
  ON public.tariffs_v2
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "tariffs_v3_manage_own_lot" ON public.tariffs_v3;
CREATE POLICY "tariffs_v3_employee_read_own_lot"
  ON public.tariffs_v3
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );
CREATE POLICY "tariffs_v3_admin_manage_own_lot"
  ON public.tariffs_v3
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "tariff_history_manage_own_lot" ON public.tariff_history;
CREATE POLICY "tariff_history_employee_read_own_lot"
  ON public.tariff_history
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );
CREATE POLICY "tariff_history_admin_manage_own_lot"
  ON public.tariff_history
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "cash_closures_read_own_lot" ON public.cash_closures;
CREATE POLICY "cash_closures_employee_read_own_lot"
  ON public.cash_closures
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );

DROP POLICY IF EXISTS "cash_withdrawals_read_own_lot" ON public.cash_withdrawals;
CREATE POLICY "cash_withdrawals_employee_read_own_lot"
  ON public.cash_withdrawals
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'employee'
  );

DROP POLICY IF EXISTS "Custom Roles - Access own parking lot" ON public.custom_roles;
CREATE POLICY "custom_roles_admin_manage_own_lot"
  ON public.custom_roles
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() = 'admin'
    )
  );
