-- =====================================================================
-- NEXOPARK · CAJA CONFIABLE, SEGURIDAD Y MÓDULOS FALTANTES
-- Fecha: 2026-10-31
--
-- Esta migración es aditiva: no elimina tablas ni registros.
-- Es compatible con versiones anteriores de la aplicación (PWA en caché).
--
-- 1. Caja: cada cobro guarda el momento real en que entra a caja
--    (cash_recorded_at) y si debe contarse (include_in_cash).
--    Así un ingreso histórico registrado hoy puede sumarse a la caja
--    actual, o quedar excluido, sin depender de su hora de salida.
-- 2. Funciones atómicas para consultar y cerrar la caja en el servidor.
-- 3. Auditoría de cambios de dinero (montos, exclusiones, borrados).
-- 4. Seguridad: funciones peligrosas sin acceso público y políticas
--    RLS para tablas que estaban bloqueadas (bitácora, revistas,
--    aprobación de dispositivos).
-- 5. Tablas de módulos residenciales que el código usa y no existían.
-- 6. Bucket de fotos de observaciones e índices de rendimiento.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CAMPOS DE CAJA EN parking_sessions
-- ---------------------------------------------------------------------
ALTER TABLE public.parking_sessions
  ADD COLUMN IF NOT EXISTS include_in_cash boolean NOT NULL DEFAULT true;
ALTER TABLE public.parking_sessions
  ADD COLUMN IF NOT EXISTS cash_recorded_at timestamptz;

COMMENT ON COLUMN public.parking_sessions.include_in_cash IS
  'Si es false, el cobro existe en el historial pero no suma al recaudo ni al cierre de caja.';
COMMENT ON COLUMN public.parking_sessions.cash_recorded_at IS
  'Momento en que el dinero entró a caja. Para registros históricos es la fecha en que se registraron, no la fecha de salida.';

-- Respetar la marca anterior extra_data.is_paused.
UPDATE public.parking_sessions
SET include_in_cash = NOT ((extra_data->>'is_paused') = 'true')
WHERE extra_data ? 'is_paused';

-- Fecha de caja de los cobros existentes: la más tardía entre la salida
-- y la creación del registro. Para cobros normales es la hora de salida;
-- para ingresos históricos es el momento en que se registraron.
UPDATE public.parking_sessions
SET cash_recorded_at = GREATEST(exit_time, COALESCE(created_at, exit_time))
WHERE status = 'completed'
  AND exit_time IS NOT NULL
  AND cash_recorded_at IS NULL;

-- Disparador: mantiene los campos coherentes para cualquier cliente,
-- incluida la versión anterior que solo escribe extra_data.is_paused.
CREATE OR REPLACE FUNCTION public.parking_sessions_cash_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.extra_data IS NOT NULL AND NEW.extra_data ? 'is_paused' THEN
    NEW.include_in_cash := NOT ((NEW.extra_data->>'is_paused') = 'true');
  END IF;

  IF NEW.status = 'completed' AND NEW.exit_time IS NOT NULL THEN
    IF NEW.cash_recorded_at IS NULL THEN
      NEW.cash_recorded_at := now();
    END IF;
  ELSE
    NEW.cash_recorded_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parking_sessions_cash_sync ON public.parking_sessions;
CREATE TRIGGER trg_parking_sessions_cash_sync
BEFORE INSERT OR UPDATE ON public.parking_sessions
FOR EACH ROW EXECUTE FUNCTION public.parking_sessions_cash_sync();

-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE CAJA (se ejecutan con los permisos del usuario)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cash_register_summary(p_parking_lot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_last timestamptz;
  v_revenue numeric := 0;
  v_count integer := 0;
  v_first timestamptz;
  v_withdrawals numeric := 0;
  v_excluded_count integer := 0;
  v_excluded_amount numeric := 0;
BEGIN
  SELECT max(closed_at) INTO v_last
  FROM cash_closures
  WHERE parking_lot_id = p_parking_lot_id;

  SELECT count(*), COALESCE(sum(COALESCE(total_charged, fee, 0)), 0), min(cash_recorded_at)
  INTO v_count, v_revenue, v_first
  FROM parking_sessions
  WHERE parking_lot_id = p_parking_lot_id
    AND status = 'completed'
    AND include_in_cash
    AND cash_recorded_at IS NOT NULL
    AND (v_last IS NULL OR cash_recorded_at > v_last);

  SELECT count(*), COALESCE(sum(COALESCE(total_charged, fee, 0)), 0)
  INTO v_excluded_count, v_excluded_amount
  FROM parking_sessions
  WHERE parking_lot_id = p_parking_lot_id
    AND status = 'completed'
    AND NOT include_in_cash
    AND cash_recorded_at IS NOT NULL
    AND (v_last IS NULL OR cash_recorded_at > v_last);

  SELECT COALESCE(sum(amount), 0) INTO v_withdrawals
  FROM cash_withdrawals
  WHERE parking_lot_id = p_parking_lot_id
    AND (v_last IS NULL OR withdrawn_at > v_last);

  RETURN jsonb_build_object(
    'last_closure_at', v_last,
    'opened_at', COALESCE(v_last, v_first),
    'sessions_count', v_count,
    'revenue', v_revenue,
    'withdrawals', v_withdrawals,
    'cash_in_register', GREATEST(v_revenue - v_withdrawals, 0),
    'excluded_count', v_excluded_count,
    'excluded_amount', v_excluded_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.close_cash_register(
  p_parking_lot_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.cash_closures
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_last timestamptz;
  v_first timestamptz;
  v_revenue numeric := 0;
  v_withdrawals numeric := 0;
  v_row public.cash_closures;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión para cerrar la caja.';
  END IF;

  -- Evita dos cierres simultáneos del mismo parqueadero.
  PERFORM pg_advisory_xact_lock(hashtext('cash_close_' || p_parking_lot_id::text));

  SELECT max(closed_at) INTO v_last
  FROM cash_closures
  WHERE parking_lot_id = p_parking_lot_id;

  SELECT COALESCE(sum(COALESCE(total_charged, fee, 0)), 0), min(cash_recorded_at)
  INTO v_revenue, v_first
  FROM parking_sessions
  WHERE parking_lot_id = p_parking_lot_id
    AND status = 'completed'
    AND include_in_cash
    AND cash_recorded_at IS NOT NULL
    AND (v_last IS NULL OR cash_recorded_at > v_last)
    AND cash_recorded_at <= v_now;

  SELECT COALESCE(sum(amount), 0) INTO v_withdrawals
  FROM cash_withdrawals
  WHERE parking_lot_id = p_parking_lot_id
    AND (v_last IS NULL OR withdrawn_at > v_last)
    AND withdrawn_at <= v_now;

  INSERT INTO cash_closures (
    parking_lot_id, closed_at, opened_at, closed_by,
    expected_revenue, withdrawn_amount, total_revenue, notes
  ) VALUES (
    p_parking_lot_id, v_now, COALESCE(v_last, v_first, v_now),
    (SELECT id FROM profiles WHERE id = auth.uid()),
    v_revenue, v_withdrawals, GREATEST(v_revenue - v_withdrawals, 0),
    NULLIF(trim(COALESCE(p_notes, '')), '')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cash_register_summary(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_cash_register(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cash_register_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_cash_register(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. AUDITORÍA DE MOVIMIENTOS DE DINERO
-- ---------------------------------------------------------------------
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS parking_lot_id uuid;
CREATE INDEX IF NOT EXISTS idx_audit_logs_lot_created ON public.audit_logs (parking_lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_id);

CREATE OR REPLACE FUNCTION public.audit_money_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_lot uuid;
  v_record uuid;
BEGIN
  SELECT id INTO v_user FROM profiles WHERE id = auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_lot := OLD.parking_lot_id;
    v_record := OLD.id;
  ELSE
    v_lot := NEW.parking_lot_id;
    v_record := NEW.id;
  END IF;

  IF TG_TABLE_NAME = 'parking_sessions' AND TG_OP = 'UPDATE' THEN
    IF NEW.total_charged IS NOT DISTINCT FROM OLD.total_charged
       AND NEW.include_in_cash IS NOT DISTINCT FROM OLD.include_in_cash
       AND NEW.cash_recorded_at IS NOT DISTINCT FROM OLD.cash_recorded_at
       AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO audit_logs (user_id, parking_lot_id, action, table_name, record_id, old_values, new_values, created_at)
  VALUES (
    v_user, v_lot, TG_OP, TG_TABLE_NAME, v_record,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_money_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_parking_sessions ON public.parking_sessions;
CREATE TRIGGER trg_audit_parking_sessions
AFTER UPDATE OR DELETE ON public.parking_sessions
FOR EACH ROW EXECUTE FUNCTION public.audit_money_changes();

DROP TRIGGER IF EXISTS trg_audit_cash_closures ON public.cash_closures;
CREATE TRIGGER trg_audit_cash_closures
AFTER INSERT OR UPDATE OR DELETE ON public.cash_closures
FOR EACH ROW EXECUTE FUNCTION public.audit_money_changes();

DROP TRIGGER IF EXISTS trg_audit_cash_withdrawals ON public.cash_withdrawals;
CREATE TRIGGER trg_audit_cash_withdrawals
AFTER INSERT OR UPDATE OR DELETE ON public.cash_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.audit_money_changes();

DROP POLICY IF EXISTS "Audit Logs - Admin read own parking lot" ON public.audit_logs;
CREATE POLICY "Audit Logs - Admin read own parking lot" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      (SELECT internal.get_user_role()) = 'admin'
      AND parking_lot_id = (SELECT internal.get_user_parking_lot())
    )
  );

-- ---------------------------------------------------------------------
-- 4. SEGURIDAD
-- ---------------------------------------------------------------------
-- Estas funciones podían ejecutarse sin iniciar sesión con la clave pública.
-- La aplicación no las invoca desde el navegador; el reinicio se hace por
-- la ruta de servidor /api/parking-lots/reset con validación de permisos.
DO $$
BEGIN
  IF to_regprocedure('public.reset_parking_lot_data(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.reset_parking_lot_data(uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reset_parking_lot_data(uuid) TO service_role';
    EXECUTE 'ALTER FUNCTION public.reset_parking_lot_data(uuid) SET search_path = public';
  END IF;
  IF to_regprocedure('public.toggle_cash_pause(uuid, boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.toggle_cash_pause(uuid, boolean) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.toggle_cash_pause(uuid, boolean) TO service_role';
    EXECUTE 'ALTER FUNCTION public.toggle_cash_pause(uuid, boolean) SET search_path = public';
  END IF;
END $$;

-- Bitácora de empleados (estaba bloqueada: RLS activo sin políticas).
DROP POLICY IF EXISTS "Employee Logs - Own parking lot" ON public.employee_logs;
CREATE POLICY "Employee Logs - Own parking lot" ON public.employee_logs
  FOR ALL TO authenticated
  USING (
    parking_lot_id = (SELECT internal.get_user_parking_lot())
    OR (SELECT internal.get_user_role()) = 'superadmin'
  )
  WITH CHECK (
    parking_lot_id = (SELECT internal.get_user_parking_lot())
    OR (SELECT internal.get_user_role()) = 'superadmin'
  );

-- Revistas de vehículos (estaban bloqueadas).
DROP POLICY IF EXISTS "Vehicle Inspections - Own parking lot" ON public.vehicle_inspections;
CREATE POLICY "Vehicle Inspections - Own parking lot" ON public.vehicle_inspections
  FOR ALL TO authenticated
  USING (
    parking_lot_id = (SELECT internal.get_user_parking_lot())
    OR (SELECT internal.get_user_role()) = 'superadmin'
  )
  WITH CHECK (
    parking_lot_id = (SELECT internal.get_user_parking_lot())
    OR (SELECT internal.get_user_role()) = 'superadmin'
  );

-- Aprobación de dispositivos (estaba bloqueada).
DROP POLICY IF EXISTS "Device Approvals - Own select" ON public.device_approvals;
CREATE POLICY "Device Approvals - Own select" ON public.device_approvals
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Device Approvals - Own request" ON public.device_approvals;
CREATE POLICY "Device Approvals - Own request" ON public.device_approvals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');

DROP POLICY IF EXISTS "Device Approvals - Own back to pending" ON public.device_approvals;
CREATE POLICY "Device Approvals - Own back to pending" ON public.device_approvals
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');

DROP POLICY IF EXISTS "Device Approvals - Admin manage" ON public.device_approvals;
CREATE POLICY "Device Approvals - Admin manage" ON public.device_approvals
  FOR ALL TO authenticated
  USING (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      (SELECT internal.get_user_role()) = 'admin'
      AND parking_lot_id = (SELECT internal.get_user_parking_lot())
    )
  )
  WITH CHECK (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      (SELECT internal.get_user_role()) = 'admin'
      AND parking_lot_id = (SELECT internal.get_user_parking_lot())
    )
  );

-- ---------------------------------------------------------------------
-- 5. MÓDULOS RESIDENCIALES QUE EL CÓDIGO USA Y NO EXISTÍAN
-- ---------------------------------------------------------------------
ALTER TABLE public.parking_lots ADD COLUMN IF NOT EXISTS doc_update_start timestamptz;
ALTER TABLE public.parking_lots ADD COLUMN IF NOT EXISTS doc_update_end timestamptz;

CREATE TABLE IF NOT EXISTS public.building_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid UNIQUE REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  pedestrian_visitors boolean DEFAULT false,
  extended_tariff_hours boolean DEFAULT false,
  moving_permits boolean DEFAULT false,
  package_registry boolean DEFAULT false,
  whatsapp_packages boolean DEFAULT false,
  residents_directory boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  apartment text NOT NULL,
  block text,
  owner_name text NOT NULL,
  document text,
  phone text,
  email text,
  is_owner boolean DEFAULT true,
  vehicle_plates text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedestrian_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  visitor_document text,
  apartment text NOT NULL,
  resident_name text,
  purpose text,
  entry_time timestamptz DEFAULT now(),
  exit_time timestamptz,
  status text DEFAULT 'inside' CHECK (status IN ('inside', 'exited')),
  registered_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moving_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  apartment text NOT NULL,
  resident_name text,
  moving_company text,
  truck_plate text,
  permit_date date NOT NULL,
  start_time text DEFAULT '08:00',
  end_time text DEFAULT '17:00',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  authorized_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  apartment text NOT NULL,
  recipient_name text,
  company text,
  description text,
  arrival_time timestamptz DEFAULT now(),
  delivered_time timestamptz,
  delivered_to text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'returned')),
  whatsapp_sent boolean DEFAULT false,
  registered_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  phone text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'parking' CHECK (type IN ('parking', 'package', 'moving_permit', 'general')),
  reference_id uuid,
  sent_at timestamptz DEFAULT now(),
  sent_by text
);

CREATE TABLE IF NOT EXISTS public.resident_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text DEFAULT 'pending',
  details jsonb DEFAULT '{}'::jsonb,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_patrols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text DEFAULT 'in_progress',
  notes text
);

CREATE TABLE IF NOT EXISTS public.patrol_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patrol_id uuid REFERENCES public.security_patrols(id) ON DELETE CASCADE,
  plate text,
  space_number text,
  observation text,
  photo_url text,
  verified_at timestamptz DEFAULT now()
);

INSERT INTO public.building_modules (parking_lot_id)
SELECT id FROM public.parking_lots
ON CONFLICT (parking_lot_id) DO NOTHING;

-- RLS por parqueadero en todas las tablas nuevas.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'building_modules', 'residents', 'pedestrian_visitors', 'moving_permits',
    'packages', 'whatsapp_log', 'resident_requests', 'security_patrols'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ' - Own parking lot', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (parking_lot_id = (SELECT internal.get_user_parking_lot()) OR (SELECT internal.get_user_role()) = ''superadmin'')
         WITH CHECK (parking_lot_id = (SELECT internal.get_user_parking_lot()) OR (SELECT internal.get_user_role()) = ''superadmin'')',
      t || ' - Own parking lot', t
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (parking_lot_id)', 'idx_' || t || '_lot', t);
  END LOOP;
END $$;

ALTER TABLE public.patrol_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patrol_logs - Own parking lot" ON public.patrol_logs;
CREATE POLICY "patrol_logs - Own parking lot" ON public.patrol_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.security_patrols sp
    WHERE sp.id = patrol_logs.patrol_id
      AND (sp.parking_lot_id = (SELECT internal.get_user_parking_lot()) OR (SELECT internal.get_user_role()) = 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.security_patrols sp
    WHERE sp.id = patrol_logs.patrol_id
      AND (sp.parking_lot_id = (SELECT internal.get_user_parking_lot()) OR (SELECT internal.get_user_role()) = 'superadmin')
  ));
CREATE INDEX IF NOT EXISTS idx_patrol_logs_patrol ON public.patrol_logs (patrol_id);
CREATE INDEX IF NOT EXISTS idx_security_patrols_employee ON public.security_patrols (employee_id);
CREATE INDEX IF NOT EXISTS idx_resident_requests_resident ON public.resident_requests (resident_id);

-- Tiempo real para visitantes y paquetes.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pedestrian_visitors', 'packages'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 6. ALMACENAMIENTO E ÍNDICES
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('observations', 'observations', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Observations - Authenticated upload" ON storage.objects;
CREATE POLICY "Observations - Authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'observations');

CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_status ON public.parking_sessions (parking_lot_id, status);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_cash ON public.parking_sessions (parking_lot_id, cash_recorded_at);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_lot_exit ON public.parking_sessions (parking_lot_id, exit_time);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_vehicle ON public.parking_sessions (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_lot_closed ON public.cash_closures (parking_lot_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_closures_closed_by ON public.cash_closures (closed_by);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_lot_time ON public.cash_withdrawals (parking_lot_id, withdrawn_at);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_by ON public.cash_withdrawals (withdrawn_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_lot_created ON public.vehicle_inspections (parking_lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_employee ON public.vehicle_inspections (employee_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_session ON public.vehicle_inspections (session_id);
CREATE INDEX IF NOT EXISTS idx_device_approvals_user_device ON public.device_approvals (user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_device_approvals_lot ON public.device_approvals (parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_employee_logs_lot_created ON public.employee_logs (parking_lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_subscribers_lot ON public.monthly_subscribers (parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_vehicles_lot ON public.blacklisted_vehicles (parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_private_parking_spaces_lot ON public.private_parking_spaces (parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_private_parking_history_lot ON public.private_parking_history (parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_lot ON public.custom_roles (parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_profiles_custom_role ON public.profiles (custom_role_id);
