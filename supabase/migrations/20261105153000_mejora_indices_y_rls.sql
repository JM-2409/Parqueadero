-- Mejora de índices, políticas RLS y tablas sin política.

-- 1. Índices de claves foráneas (el linter de Supabase las marcó sin cubrir)
CREATE INDEX IF NOT EXISTS idx_admin_parking_lots_parking_lot_id
  ON public.admin_parking_lots (parking_lot_id);

CREATE INDEX IF NOT EXISTS idx_invite_codes_parking_lot_id
  ON public.invite_codes (parking_lot_id);

CREATE INDEX IF NOT EXISTS idx_parking_lots_plan_id
  ON public.parking_lots (plan_id);

CREATE INDEX IF NOT EXISTS idx_tariff_history_parking_lot_id
  ON public.tariff_history (parking_lot_id);

CREATE INDEX IF NOT EXISTS idx_tariffs_parking_lot_id
  ON public.tariffs (parking_lot_id);

CREATE INDEX IF NOT EXISTS idx_tariffs_v2_parking_lot_id
  ON public.tariffs_v2 (parking_lot_id);

CREATE INDEX IF NOT EXISTS idx_tariffs_v3_parking_lot_id
  ON public.tariffs_v3 (parking_lot_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blacklisted_vehicles'
      AND column_name = 'created_by'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_blacklisted_vehicles_created_by
      ON public.blacklisted_vehicles (created_by);
  END IF;
END $$;

-- Consulta caliente de vehículos estacionados
CREATE INDEX IF NOT EXISTS idx_parking_sessions_active_lot_entry
  ON public.parking_sessions (parking_lot_id, entry_time DESC)
  WHERE status = 'active';

-- 2. Quitar índice duplicado en parking_sessions
DROP INDEX IF EXISTS public.idx_parking_sessions_status_parking_lot;

-- 3. Políticas RLS: evitar reevaluar auth.uid()/auth.role() por cada fila
DROP POLICY IF EXISTS "Blacklisted Vehicles - Authenticated Access" ON public.blacklisted_vehicles;
CREATE POLICY "Blacklisted Vehicles - Authenticated Access"
  ON public.blacklisted_vehicles
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Cash Closures - Authenticated Access" ON public.cash_closures;
CREATE POLICY "Cash Closures - Authenticated Access"
  ON public.cash_closures
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Monthly Subscribers - Authenticated Access" ON public.monthly_subscribers;
CREATE POLICY "Monthly Subscribers - Authenticated Access"
  ON public.monthly_subscribers
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Parking Lots - Authenticated Access" ON public.parking_lots;
CREATE POLICY "Parking Lots - Authenticated Access"
  ON public.parking_lots
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Parking Sessions - Authenticated Access" ON public.parking_sessions;
CREATE POLICY "Parking Sessions - Authenticated Access"
  ON public.parking_sessions
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Profiles - Authenticated Access" ON public.profiles;
CREATE POLICY "Profiles - Authenticated Access"
  ON public.profiles
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Profiles - User can update their own profile" ON public.profiles;
CREATE POLICY "Profiles - User can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Profiles - User can view their own profile" ON public.profiles;
CREATE POLICY "Profiles - User can view their own profile"
  ON public.profiles
  FOR SELECT
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Administradores pueden gestionar tarifas especiales" ON public.special_tariffs;
CREATE POLICY "Administradores pueden gestionar tarifas especiales"
  ON public.special_tariffs
  FOR ALL
  USING (
    parking_lot_id IN (
      SELECT profiles.parking_lot_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text])
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden ver tarifas especiales de su parqueadero" ON public.special_tariffs;
CREATE POLICY "Usuarios pueden ver tarifas especiales de su parqueadero"
  ON public.special_tariffs
  FOR SELECT
  USING (
    parking_lot_id IN (
      SELECT profiles.parking_lot_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  );

-- Política duplicada en vehicles (ya existe "Auth vehicles Access" optimizada)
DROP POLICY IF EXISTS "Vehicles - Auth users can access" ON public.vehicles;

-- 4. Tablas con RLS activo pero sin política (quedaban bloqueadas para la API)
DROP POLICY IF EXISTS "Admin Parking Lots - Authenticated Access" ON public.admin_parking_lots;
CREATE POLICY "Admin Parking Lots - Authenticated Access"
  ON public.admin_parking_lots
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Invite Codes - Authenticated Access" ON public.invite_codes;
CREATE POLICY "Invite Codes - Authenticated Access"
  ON public.invite_codes
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Tariff History - Authenticated Access" ON public.tariff_history;
CREATE POLICY "Tariff History - Authenticated Access"
  ON public.tariff_history
  FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
