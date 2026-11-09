-- Refuerza el aislamiento entre parqueaderos y corrige el acceso a vehiculos.

DO $$
DECLARE
  v_lot_count integer;
BEGIN
  SELECT count(*) INTO v_lot_count FROM public.parking_lots;
  IF v_lot_count = 0 THEN
    RAISE EXCEPTION 'No se puede asociar vehiculos: no existen parqueaderos.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.parking_sessions
    GROUP BY vehicle_id
    HAVING count(DISTINCT parking_lot_id) > 1
  ) THEN
    RAISE EXCEPTION 'Hay vehiculos asociados a varios parqueaderos; se requiere asignacion manual.';
  END IF;

  IF v_lot_count > 1 AND EXISTS (
    SELECT 1
    FROM public.vehicles v
    WHERE NOT EXISTS (
      SELECT 1 FROM public.parking_sessions ps WHERE ps.vehicle_id = v.id
    )
  ) THEN
    RAISE EXCEPTION 'Hay vehiculos sin sesiones y varios parqueaderos; se requiere asignacion manual.';
  END IF;
END;
$$;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS parking_lot_id uuid;

UPDATE public.vehicles v
SET parking_lot_id = COALESCE(
  (
    SELECT ps.parking_lot_id
    FROM public.parking_sessions ps
    WHERE ps.vehicle_id = v.id
    LIMIT 1
  ),
  (SELECT pl.id FROM public.parking_lots pl LIMIT 1)
)
WHERE v.parking_lot_id IS NULL;

ALTER TABLE public.vehicles
  ALTER COLUMN parking_lot_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.vehicles'::regclass
      AND conname = 'vehicles_parking_lot_id_fkey'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_parking_lot_id_fkey
      FOREIGN KEY (parking_lot_id) REFERENCES public.parking_lots(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_plate_key;
DROP INDEX IF EXISTS public.vehicles_plate_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_parking_lot_plate
  ON public.vehicles (parking_lot_id, plate);

CREATE OR REPLACE FUNCTION public.set_vehicle_parking_lot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_lot_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.parking_lot_id IS NULL THEN
      RAISE EXCEPTION 'El vehiculo debe estar asociado a un parqueadero.';
    END IF;
    RETURN NEW;
  END IF;

  v_user_lot_id := internal.get_user_parking_lot();
  IF NEW.parking_lot_id IS NULL THEN
    NEW.parking_lot_id := v_user_lot_id;
  END IF;

  IF internal.get_user_role() IS DISTINCT FROM 'superadmin'
     AND NEW.parking_lot_id IS DISTINCT FROM v_user_lot_id THEN
    RAISE EXCEPTION 'No puede asociar el vehiculo a otro parqueadero.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_vehicle_parking_lot ON public.vehicles;
CREATE TRIGGER trg_set_vehicle_parking_lot
BEFORE INSERT OR UPDATE OF parking_lot_id ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_vehicle_parking_lot();

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles - Authenticated Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - User can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - User can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - Admins can view profiles in their parking lot" ON public.profiles;
CREATE POLICY "profiles_read_own_or_authorized_lot"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR internal.get_user_role() = 'superadmin'
    OR (
      internal.get_user_role() = 'admin'
      AND parking_lot_id = internal.get_user_parking_lot()
    )
  );

DROP POLICY IF EXISTS "Parking Lots - Authenticated Access" ON public.parking_lots;
DROP POLICY IF EXISTS "Parking Lots - View own" ON public.parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Superadmin all" ON public.parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Admins update own" ON public.parking_lots;
CREATE POLICY "parking_lots_read_own_or_superadmin"
  ON public.parking_lots
  FOR SELECT TO authenticated
  USING (
    id = internal.get_user_parking_lot()
    OR internal.get_user_role() = 'superadmin'
  );
CREATE POLICY "parking_lots_admin_update_own"
  ON public.parking_lots
  FOR UPDATE TO authenticated
  USING (
    id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'admin'
  )
  WITH CHECK (
    id = internal.get_user_parking_lot()
    AND internal.get_user_role() = 'admin'
  );
CREATE POLICY "parking_lots_superadmin_manage_all"
  ON public.parking_lots
  FOR ALL TO authenticated
  USING (internal.get_user_role() = 'superadmin')
  WITH CHECK (internal.get_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Parking Sessions - Authenticated Access" ON public.parking_sessions;
DROP POLICY IF EXISTS "Parking Sessions - Access own parking lot" ON public.parking_sessions;
CREATE POLICY "parking_sessions_manage_own_lot"
  ON public.parking_sessions
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Cash Closures - Authenticated Access" ON public.cash_closures;
DROP POLICY IF EXISTS "Cash Closures - Access own parking lot" ON public.cash_closures;
CREATE POLICY "cash_closures_read_own_lot"
  ON public.cash_closures
  FOR SELECT TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );
CREATE POLICY "cash_closures_admin_manage_own_lot"
  ON public.cash_closures
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

DROP POLICY IF EXISTS "Cash Withdrawals - Access own parking lot" ON public.cash_withdrawals;
CREATE POLICY "cash_withdrawals_read_own_lot"
  ON public.cash_withdrawals
  FOR SELECT TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );
CREATE POLICY "cash_withdrawals_admin_manage_own_lot"
  ON public.cash_withdrawals
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

DROP POLICY IF EXISTS "Blacklisted Vehicles - Authenticated Access" ON public.blacklisted_vehicles;
DROP POLICY IF EXISTS "Blacklisted Vehicles - Access own parking lot" ON public.blacklisted_vehicles;
CREATE POLICY "blacklisted_vehicles_manage_own_lot"
  ON public.blacklisted_vehicles
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Monthly Subscribers - Authenticated Access" ON public.monthly_subscribers;
DROP POLICY IF EXISTS "Monthly Subscribers - Access own parking lot" ON public.monthly_subscribers;
CREATE POLICY "monthly_subscribers_manage_own_lot"
  ON public.monthly_subscribers
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Admin Parking Lots - Authenticated Access" ON public.admin_parking_lots;
CREATE POLICY "admin_parking_lots_read_own_or_superadmin"
  ON public.admin_parking_lots
  FOR SELECT TO authenticated
  USING (
    admin_id = (SELECT auth.uid())
    OR internal.get_user_role() = 'superadmin'
  );
CREATE POLICY "admin_parking_lots_superadmin_manage"
  ON public.admin_parking_lots
  FOR ALL TO authenticated
  USING (internal.get_user_role() = 'superadmin')
  WITH CHECK (internal.get_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Invite Codes - Authenticated Access" ON public.invite_codes;
CREATE POLICY "invite_codes_manage_own_lot"
  ON public.invite_codes
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

DROP POLICY IF EXISTS "Tariff History - Authenticated Access" ON public.tariff_history;
CREATE POLICY "tariff_history_manage_own_lot"
  ON public.tariff_history
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Tariffs - Authenticated Access" ON public.tariffs;
DROP POLICY IF EXISTS "Tariffs - Access own parking lot" ON public.tariffs;
CREATE POLICY "tariffs_manage_own_lot"
  ON public.tariffs
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Secure Tariffs V2" ON public.tariffs_v2;
DROP POLICY IF EXISTS "Tariffs_V2 - Authenticated Access" ON public.tariffs_v2;
CREATE POLICY "tariffs_v2_manage_own_lot"
  ON public.tariffs_v2
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Tariffs_V3 - Authenticated Access" ON public.tariffs_v3;
DROP POLICY IF EXISTS "Tariffs_V3 - Access own parking lot" ON public.tariffs_v3;
CREATE POLICY "tariffs_v3_manage_own_lot"
  ON public.tariffs_v3
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Auth vehicles Access" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles - Auth users can access" ON public.vehicles;
CREATE POLICY "vehicles_manage_own_lot"
  ON public.vehicles
  FOR ALL TO authenticated
  USING (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  )
  WITH CHECK (
    internal.get_user_role() = 'superadmin'
    OR (
      parking_lot_id = internal.get_user_parking_lot()
      AND internal.get_user_role() IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "cash_minor_balance_same_lot" ON public.cash_minor_balances;
CREATE POLICY "cash_minor_balance_same_lot"
  ON public.cash_minor_balances
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() IN ('admin', 'employee')
  );

DROP POLICY IF EXISTS "cash_minor_assignments_same_lot" ON public.cash_minor_assignments;
CREATE POLICY "cash_minor_assignments_same_lot"
  ON public.cash_minor_assignments
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() IN ('admin', 'employee')
  );

DROP POLICY IF EXISTS "cash_minor_invoices_same_lot" ON public.cash_minor_invoices;
CREATE POLICY "cash_minor_invoices_same_lot"
  ON public.cash_minor_invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cash_minor_assignments a
      WHERE a.id = cash_minor_invoices.assignment_id
        AND a.parking_lot_id = internal.get_user_parking_lot()
    )
    AND internal.get_user_role() IN ('admin', 'employee')
  );

DROP POLICY IF EXISTS "cash_minor_history_same_lot" ON public.cash_minor_history;
CREATE POLICY "cash_minor_history_same_lot"
  ON public.cash_minor_history
  FOR SELECT TO authenticated
  USING (
    parking_lot_id = internal.get_user_parking_lot()
    AND internal.get_user_role() IN ('admin', 'employee')
  );

CREATE INDEX IF NOT EXISTS idx_cash_minor_assignments_created_by
  ON public.cash_minor_assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_cash_minor_assignments_legalized_by
  ON public.cash_minor_assignments (legalized_by);
CREATE INDEX IF NOT EXISTS idx_cash_minor_history_assignment_id
  ON public.cash_minor_history (assignment_id);
CREATE INDEX IF NOT EXISTS idx_cash_minor_history_created_by
  ON public.cash_minor_history (created_by);
CREATE INDEX IF NOT EXISTS idx_cash_minor_invoices_created_by
  ON public.cash_minor_invoices (created_by);

CREATE OR REPLACE VIEW public.v_session_stats
WITH (security_invoker = true)
AS
SELECT
  ps.parking_lot_id,
  v.type AS vehicle_type,
  DATE_TRUNC('day', ps.exit_time) AS day,
  COUNT(*) AS session_count,
  SUM(ps.total_charged) AS total_revenue
FROM public.parking_sessions ps
JOIN public.vehicles v ON v.id = ps.vehicle_id
WHERE ps.status = 'completed'
  AND ps.exit_time IS NOT NULL
GROUP BY
  ps.parking_lot_id,
  v.type,
  DATE_TRUNC('day', ps.exit_time);
