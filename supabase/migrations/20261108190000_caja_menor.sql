CREATE TABLE IF NOT EXISTS public.cash_minor_balances (
  parking_lot_id uuid PRIMARY KEY REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cash_minor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid NOT NULL REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  description text NOT NULL,
  amount_delivered numeric(14, 2) NOT NULL CHECK (amount_delivered > 0),
  amount_spent numeric(14, 2) NOT NULL DEFAULT 0 CHECK (amount_spent >= 0),
  amount_returned numeric(14, 2) NOT NULL DEFAULT 0 CHECK (amount_returned >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'legalized', 'cancelled')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  legalized_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  legalized_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.cash_minor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.cash_minor_assignments(id) ON DELETE CASCADE,
  invoice_number text,
  description text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cash_minor_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id uuid NOT NULL REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.cash_minor_assignments(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (
    movement_type IN ('funding', 'assignment', 'assignment_increase', 'return', 'annulment')
  ),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  balance_delta numeric(14, 2) NOT NULL,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'anulado')),
  description text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversal_of uuid UNIQUE REFERENCES public.cash_minor_history(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_minor_assignments_lot_status
  ON public.cash_minor_assignments (parking_lot_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_minor_history_lot_created
  ON public.cash_minor_history (parking_lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_minor_invoices_assignment
  ON public.cash_minor_invoices (assignment_id, created_at);

ALTER TABLE public.cash_minor_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_minor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_minor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_minor_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_minor_balance_same_lot" ON public.cash_minor_balances;
CREATE POLICY "cash_minor_balance_same_lot"
  ON public.cash_minor_balances FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.parking_lot_id = cash_minor_balances.parking_lot_id
      AND p.role IN ('admin', 'employee')
  ));

DROP POLICY IF EXISTS "cash_minor_assignments_same_lot" ON public.cash_minor_assignments;
CREATE POLICY "cash_minor_assignments_same_lot"
  ON public.cash_minor_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.parking_lot_id = cash_minor_assignments.parking_lot_id
      AND p.role IN ('admin', 'employee')
  ));

DROP POLICY IF EXISTS "cash_minor_invoices_same_lot" ON public.cash_minor_invoices;
CREATE POLICY "cash_minor_invoices_same_lot"
  ON public.cash_minor_invoices FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cash_minor_assignments a
    JOIN public.profiles p ON p.parking_lot_id = a.parking_lot_id
    WHERE a.id = cash_minor_invoices.assignment_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'employee')
  ));

DROP POLICY IF EXISTS "cash_minor_history_same_lot" ON public.cash_minor_history;
CREATE POLICY "cash_minor_history_same_lot"
  ON public.cash_minor_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.parking_lot_id = cash_minor_history.parking_lot_id
      AND p.role IN ('admin', 'employee')
  ));

CREATE OR REPLACE FUNCTION public.cash_minor_assert_access(p_parking_lot_id uuid, p_admin_only boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión para operar la caja menor.';
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
    AND parking_lot_id = p_parking_lot_id;

  IF v_role IS NULL OR v_role NOT IN ('admin', 'employee') THEN
    RAISE EXCEPTION 'No tiene acceso a la caja menor de este parqueadero.';
  END IF;

  IF p_admin_only AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede realizar esta operación.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_minor_add_funds(
  p_parking_lot_id uuid,
  p_amount numeric,
  p_description text DEFAULT 'Inyección de saldo'
)
RETURNS public.cash_minor_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance public.cash_minor_balances;
  v_amount numeric(14, 2);
BEGIN
  PERFORM public.cash_minor_assert_access(p_parking_lot_id, true);
  v_amount := round(p_amount, 2);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero.';
  END IF;

  INSERT INTO public.cash_minor_balances AS current_balance (parking_lot_id, balance)
  VALUES (p_parking_lot_id, v_amount)
  ON CONFLICT (parking_lot_id) DO UPDATE
    SET balance = current_balance.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING * INTO v_balance;

  INSERT INTO public.cash_minor_history (
    parking_lot_id, movement_type, amount, balance_delta, description, created_by
  ) VALUES (
    p_parking_lot_id, 'funding', v_amount, v_amount,
    COALESCE(NULLIF(trim(p_description), ''), 'Inyección de saldo'), auth.uid()
  );
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_minor_create_assignment(
  p_parking_lot_id uuid,
  p_employee_name text,
  p_description text,
  p_amount numeric
)
RETURNS public.cash_minor_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance public.cash_minor_balances;
  v_assignment public.cash_minor_assignments;
  v_amount numeric(14, 2);
BEGIN
  PERFORM public.cash_minor_assert_access(p_parking_lot_id, true);
  v_amount := round(p_amount, 2);
  IF v_amount IS NULL OR v_amount <= 0
    OR NULLIF(trim(p_employee_name), '') IS NULL
    OR NULLIF(trim(p_description), '') IS NULL THEN
    RAISE EXCEPTION 'Ingrese operario, motivo y un monto mayor a cero.';
  END IF;

  SELECT * INTO v_balance
  FROM public.cash_minor_balances
  WHERE parking_lot_id = p_parking_lot_id
  FOR UPDATE;
  IF NOT FOUND OR v_balance.balance < v_amount THEN
    RAISE EXCEPTION 'El saldo de caja menor es insuficiente.';
  END IF;

  UPDATE public.cash_minor_balances
  SET balance = balance - v_amount, updated_at = now()
  WHERE parking_lot_id = p_parking_lot_id;

  INSERT INTO public.cash_minor_assignments (
    parking_lot_id, employee_name, description, amount_delivered, created_by
  ) VALUES (
    p_parking_lot_id, trim(p_employee_name), trim(p_description), v_amount, auth.uid()
  )
  RETURNING * INTO v_assignment;

  INSERT INTO public.cash_minor_history (
    parking_lot_id, assignment_id, movement_type, amount, balance_delta, description, created_by
  ) VALUES (
    p_parking_lot_id, v_assignment.id, 'assignment', v_amount, -v_amount,
    'Asignación a ' || trim(p_employee_name) || ': ' || trim(p_description), auth.uid()
  );
  RETURN v_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_minor_increase_assignment(
  p_assignment_id uuid,
  p_amount numeric,
  p_description text DEFAULT 'Adición de saldo a asignación'
)
RETURNS public.cash_minor_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.cash_minor_assignments;
  v_balance public.cash_minor_balances;
  v_amount numeric(14, 2);
BEGIN
  v_amount := round(p_amount, 2);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero.';
  END IF;

  SELECT * INTO v_assignment
  FROM public.cash_minor_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la asignación.';
  END IF;
  PERFORM public.cash_minor_assert_access(v_assignment.parking_lot_id, true);
  IF v_assignment.status <> 'pending' THEN
    RAISE EXCEPTION 'Solo se puede ampliar una asignación pendiente.';
  END IF;

  SELECT * INTO v_balance
  FROM public.cash_minor_balances
  WHERE parking_lot_id = v_assignment.parking_lot_id
  FOR UPDATE;
  IF NOT FOUND OR v_balance.balance < v_amount THEN
    RAISE EXCEPTION 'El saldo de caja menor es insuficiente.';
  END IF;

  UPDATE public.cash_minor_balances
  SET balance = balance - v_amount, updated_at = now()
  WHERE parking_lot_id = v_assignment.parking_lot_id;
  UPDATE public.cash_minor_assignments
  SET amount_delivered = amount_delivered + v_amount
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  INSERT INTO public.cash_minor_history (
    parking_lot_id, assignment_id, movement_type, amount, balance_delta, description, created_by
  ) VALUES (
    v_assignment.parking_lot_id, p_assignment_id, 'assignment_increase', v_amount, -v_amount,
    COALESCE(NULLIF(trim(p_description), ''), 'Adición de saldo a asignación'), auth.uid()
  );
  RETURN v_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_minor_legalize_assignment(
  p_assignment_id uuid,
  p_invoices jsonb
)
RETURNS public.cash_minor_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.cash_minor_assignments;
  v_total numeric(14, 2);
  v_returned numeric(14, 2);
  v_invoice jsonb;
  v_description text;
  v_amount numeric(14, 2);
BEGIN
  SELECT * INTO v_assignment
  FROM public.cash_minor_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la asignación.';
  END IF;
  PERFORM public.cash_minor_assert_access(v_assignment.parking_lot_id, false);
  IF v_assignment.status <> 'pending' THEN
    RAISE EXCEPTION 'Esta asignación ya no está pendiente de legalización.';
  END IF;
  IF jsonb_typeof(p_invoices) <> 'array' OR jsonb_array_length(p_invoices) = 0 THEN
    RAISE EXCEPTION 'Agregue al menos una factura para legalizar.';
  END IF;

  SELECT COALESCE(sum(round((item->>'amount')::numeric, 2)), 0)::numeric(14, 2)
  INTO v_total
  FROM jsonb_array_elements(p_invoices) item;
  IF v_total <= 0 OR v_total > v_assignment.amount_delivered THEN
    RAISE EXCEPTION 'El total de las facturas debe ser positivo y no superar el monto entregado.';
  END IF;

  FOR v_invoice IN SELECT value FROM jsonb_array_elements(p_invoices)
  LOOP
    v_amount := round((v_invoice->>'amount')::numeric, 2);
    v_description := NULLIF(trim(v_invoice->>'description'), '');
    IF v_amount <= 0 OR v_description IS NULL THEN
      RAISE EXCEPTION 'Cada factura requiere una descripción y un monto mayor a cero.';
    END IF;
    INSERT INTO public.cash_minor_invoices (
      assignment_id, invoice_number, description, amount, created_by
    ) VALUES (
      p_assignment_id, NULLIF(trim(v_invoice->>'invoice_number'), ''),
      v_description, v_amount, auth.uid()
    );
  END LOOP;

  v_returned := v_assignment.amount_delivered - v_total;
  UPDATE public.cash_minor_assignments
  SET amount_spent = v_total, amount_returned = v_returned,
      status = 'legalized', legalized_by = auth.uid(), legalized_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  IF v_returned > 0 THEN
    UPDATE public.cash_minor_balances
    SET balance = balance + v_returned, updated_at = now()
    WHERE parking_lot_id = v_assignment.parking_lot_id;
    INSERT INTO public.cash_minor_history (
      parking_lot_id, assignment_id, movement_type, amount, balance_delta, description, created_by
    ) VALUES (
      v_assignment.parking_lot_id, p_assignment_id, 'return', v_returned, v_returned,
      'Devolución de legalización: ' || v_assignment.description, auth.uid()
    );
  END IF;
  RETURN v_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_minor_annul_movement(p_movement_id uuid)
RETURNS public.cash_minor_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement public.cash_minor_history;
  v_balance public.cash_minor_balances;
  v_result public.cash_minor_history;
  v_reversal_delta numeric(14, 2);
BEGIN
  SELECT * INTO v_movement
  FROM public.cash_minor_history
  WHERE id = p_movement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el movimiento.';
  END IF;
  PERFORM public.cash_minor_assert_access(v_movement.parking_lot_id, true);
  IF v_movement.status <> 'activo' OR v_movement.movement_type = 'annulment' THEN
    RAISE EXCEPTION 'Este movimiento no se puede anular.';
  END IF;

  SELECT * INTO v_balance
  FROM public.cash_minor_balances
  WHERE parking_lot_id = v_movement.parking_lot_id
  FOR UPDATE;
  v_reversal_delta := -v_movement.balance_delta;
  IF v_reversal_delta < 0 AND v_balance.balance < abs(v_reversal_delta) THEN
    RAISE EXCEPTION 'El saldo actual no permite anular este movimiento sin quedar negativo.';
  END IF;

  IF v_movement.movement_type IN ('assignment', 'assignment_increase') THEN
    UPDATE public.cash_minor_assignments
    SET amount_delivered = amount_delivered - v_movement.amount,
        status = CASE
          WHEN amount_delivered - v_movement.amount = 0 THEN 'cancelled'
          ELSE status
        END
    WHERE id = v_movement.assignment_id
      AND status = 'pending'
      AND amount_delivered >= v_movement.amount;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se puede anular una asignación que ya fue legalizada.';
    END IF;
  ELSIF v_movement.movement_type = 'return' THEN
    UPDATE public.cash_minor_assignments
    SET amount_returned = amount_returned - v_movement.amount
    WHERE id = v_movement.assignment_id
      AND amount_returned >= v_movement.amount;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La devolución ya fue modificada y no se puede anular.';
    END IF;
  END IF;

  UPDATE public.cash_minor_balances
  SET balance = balance + v_reversal_delta, updated_at = now()
  WHERE parking_lot_id = v_movement.parking_lot_id;

  UPDATE public.cash_minor_history
  SET status = 'anulado'
  WHERE id = p_movement_id;

  INSERT INTO public.cash_minor_history (
    parking_lot_id, assignment_id, movement_type, amount, balance_delta,
    description, created_by, reversal_of
  ) VALUES (
    v_movement.parking_lot_id, v_movement.assignment_id, 'annulment',
    v_movement.amount, v_reversal_delta,
    'Anulación: ' || v_movement.description, auth.uid(), p_movement_id
  )
  RETURNING * INTO v_result;
  RETURN v_result;
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
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión para cerrar la caja.';
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
    AND parking_lot_id = p_parking_lot_id;
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede cerrar la caja.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('cash_close_' || p_parking_lot_id::text));

  SELECT max(closed_at) INTO v_last
  FROM public.cash_closures
  WHERE parking_lot_id = p_parking_lot_id;

  SELECT COALESCE(sum(COALESCE(total_charged, fee, 0)), 0), min(cash_recorded_at)
  INTO v_revenue, v_first
  FROM public.parking_sessions
  WHERE parking_lot_id = p_parking_lot_id
    AND status = 'completed'
    AND include_in_cash
    AND cash_recorded_at IS NOT NULL
    AND (v_last IS NULL OR cash_recorded_at > v_last)
    AND cash_recorded_at <= v_now;

  SELECT COALESCE(sum(amount), 0) INTO v_withdrawals
  FROM public.cash_withdrawals
  WHERE parking_lot_id = p_parking_lot_id
    AND (v_last IS NULL OR withdrawn_at > v_last)
    AND withdrawn_at <= v_now;

  INSERT INTO public.cash_closures (
    parking_lot_id, closed_at, opened_at, closed_by,
    expected_revenue, withdrawn_amount, total_revenue, notes
  ) VALUES (
    p_parking_lot_id, v_now, COALESCE(v_last, v_first, v_now),
    (SELECT id FROM public.profiles WHERE id = auth.uid()),
    v_revenue, v_withdrawals, GREATEST(v_revenue - v_withdrawals, 0),
    NULLIF(trim(COALESCE(p_notes, '')), '')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cash_minor_assert_access(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cash_minor_add_funds(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cash_minor_create_assignment(uuid, text, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cash_minor_increase_assignment(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cash_minor_legalize_assignment(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cash_minor_annul_movement(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cash_minor_add_funds(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cash_minor_create_assignment(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cash_minor_increase_assignment(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cash_minor_legalize_assignment(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cash_minor_annul_movement(uuid) TO authenticated;

GRANT SELECT ON public.cash_minor_balances, public.cash_minor_assignments,
  public.cash_minor_invoices, public.cash_minor_history TO authenticated;
