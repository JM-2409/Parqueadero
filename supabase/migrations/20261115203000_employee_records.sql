-- Relaciona los movimientos operativos con la cuenta del empleado.
ALTER TABLE public.employee_logs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.parking_sessions
  ADD COLUMN IF NOT EXISTS entry_employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exit_employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_logs_lot_user_created
  ON public.employee_logs (parking_lot_id, user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_entry_employee
  ON public.parking_sessions (parking_lot_id, entry_employee_id, entry_time DESC)
  WHERE entry_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_exit_employee
  ON public.parking_sessions (parking_lot_id, exit_employee_id, exit_time DESC)
  WHERE exit_employee_id IS NOT NULL;

-- Evita que una cuenta de empleado registre actividad a nombre de otra.
DROP POLICY IF EXISTS "Public full logs" ON public.employee_logs;
DROP POLICY IF EXISTS "Employee Logs - Own parking lot" ON public.employee_logs;
DROP POLICY IF EXISTS "employee_logs_read_own_lot" ON public.employee_logs;
DROP POLICY IF EXISTS "employee_logs_insert_own_lot" ON public.employee_logs;
DROP POLICY IF EXISTS "employee_logs_admin_update_own_lot" ON public.employee_logs;
DROP POLICY IF EXISTS "employee_logs_admin_delete_own_lot" ON public.employee_logs;

CREATE POLICY "employee_logs_read_own_lot"
  ON public.employee_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR parking_lot_id = (SELECT internal.get_user_parking_lot())
  );

CREATE POLICY "employee_logs_insert_own_lot"
  ON public.employee_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      parking_lot_id = (SELECT internal.get_user_parking_lot())
      AND (
        (SELECT internal.get_user_role()) = 'admin'
        OR (
          (SELECT internal.get_user_role()) = 'employee'
          AND user_id = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY "employee_logs_admin_update_own_lot"
  ON public.employee_logs
  FOR UPDATE TO authenticated
  USING (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      parking_lot_id = (SELECT internal.get_user_parking_lot())
      AND (SELECT internal.get_user_role()) = 'admin'
    )
  )
  WITH CHECK (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      parking_lot_id = (SELECT internal.get_user_parking_lot())
      AND (SELECT internal.get_user_role()) = 'admin'
    )
  );

CREATE POLICY "employee_logs_admin_delete_own_lot"
  ON public.employee_logs
  FOR DELETE TO authenticated
  USING (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      parking_lot_id = (SELECT internal.get_user_parking_lot())
      AND (SELECT internal.get_user_role()) = 'admin'
    )
  );
