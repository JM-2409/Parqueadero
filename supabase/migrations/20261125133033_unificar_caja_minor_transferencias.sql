ALTER TABLE public.cash_minor_history
  DROP CONSTRAINT IF EXISTS cash_minor_history_movement_type_check;

ALTER TABLE public.cash_minor_history
  ADD CONSTRAINT cash_minor_history_movement_type_check
  CHECK (movement_type IN (
    'funding',
    'cash_transfer',
    'assignment',
    'assignment_increase',
    'return',
    'annulment'
  ));

ALTER TABLE public.cash_withdrawals
  ADD COLUMN IF NOT EXISTS cash_minor_history_id uuid
  REFERENCES public.cash_minor_history(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_withdrawals_minor_history
  ON public.cash_withdrawals (cash_minor_history_id)
  WHERE cash_minor_history_id IS NOT NULL;

DROP POLICY IF EXISTS "Auth cash_withdrawals" ON public.cash_withdrawals;
DROP POLICY IF EXISTS "Cash Withdrawals - Access own parking lot" ON public.cash_withdrawals;
DROP POLICY IF EXISTS "cash_withdrawals_admin_manage_own_lot" ON public.cash_withdrawals;
DROP POLICY IF EXISTS "cash_withdrawals_employee_read_own_lot" ON public.cash_withdrawals;

DROP POLICY IF EXISTS "cash_withdrawals_read_own_lot" ON public.cash_withdrawals;
CREATE POLICY "cash_withdrawals_read_own_lot"
  ON public.cash_withdrawals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.parking_lot_id = cash_withdrawals.parking_lot_id
      AND p.role IN ('admin', 'employee')
  ));

REVOKE INSERT, UPDATE, DELETE ON public.cash_withdrawals FROM authenticated;

-- Registra el egreso de Caja y el ingreso al fondo en la misma transacción.
CREATE OR REPLACE FUNCTION public.cash_minor_transfer_from_register(
  p_parking_lot_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS public.cash_withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz;
  v_last timestamptz;
  v_revenue numeric := 0;
  v_withdrawals numeric := 0;
  v_amount numeric(14, 2);
  v_reason text;
  v_history_id uuid;
  v_withdrawal public.cash_withdrawals;
BEGIN
  PERFORM public.cash_minor_assert_access(p_parking_lot_id, true);

  IF p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_amount > 999999999999.99 THEN
    RAISE EXCEPTION 'El monto está fuera del rango permitido.';
  END IF;

  v_amount := round(p_amount, 2);
  v_reason := NULLIF(trim(p_reason), '');
  IF v_amount <= 0 OR v_reason IS NULL OR length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Ingrese un motivo y un monto mayor a cero.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('cash_close_' || p_parking_lot_id::text));
  v_now := clock_timestamp();

  SELECT max(closed_at) INTO v_last
  FROM public.cash_closures
  WHERE parking_lot_id = p_parking_lot_id;

  SELECT COALESCE(sum(COALESCE(total_charged, fee, 0)), 0)
  INTO v_revenue
  FROM public.parking_sessions
  WHERE parking_lot_id = p_parking_lot_id
    AND status = 'completed'
    AND include_in_cash
    AND cash_recorded_at IS NOT NULL
    AND (v_last IS NULL OR cash_recorded_at > v_last)
    AND cash_recorded_at <= v_now;

  SELECT COALESCE(sum(amount), 0)
  INTO v_withdrawals
  FROM public.cash_withdrawals
  WHERE parking_lot_id = p_parking_lot_id
    AND (v_last IS NULL OR withdrawn_at > v_last)
    AND withdrawn_at <= v_now;

  IF v_amount > GREATEST(v_revenue - v_withdrawals, 0) THEN
    RAISE EXCEPTION 'El recaudo disponible no alcanza para esta transferencia.';
  END IF;

  INSERT INTO public.cash_minor_balances (parking_lot_id, balance)
  VALUES (p_parking_lot_id, 0)
  ON CONFLICT (parking_lot_id) DO NOTHING;

  UPDATE public.cash_minor_balances
  SET balance = balance + v_amount, updated_at = now()
  WHERE parking_lot_id = p_parking_lot_id;

  INSERT INTO public.cash_minor_history (
    parking_lot_id,
    movement_type,
    amount,
    balance_delta,
    description,
    created_by
  ) VALUES (
    p_parking_lot_id,
    'cash_transfer',
    v_amount,
    v_amount,
    'Transferencia desde Caja: ' || v_reason,
    auth.uid()
  )
  RETURNING id INTO v_history_id;

  INSERT INTO public.cash_withdrawals (
    parking_lot_id,
    amount,
    reason,
    withdrawn_by,
    cash_minor_history_id,
    withdrawn_at
  ) VALUES (
    p_parking_lot_id,
    v_amount,
    'Traslado a caja menor: ' || v_reason,
    auth.uid(),
    v_history_id,
    v_now
  )
  RETURNING * INTO v_withdrawal;

  RETURN v_withdrawal;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_minor_reverse_register_transfer(
  p_withdrawal_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal public.cash_withdrawals;
  v_last timestamptz;
BEGIN
  SELECT * INTO v_withdrawal
  FROM public.cash_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el retiro.';
  END IF;

  PERFORM public.cash_minor_assert_access(v_withdrawal.parking_lot_id, true);
  PERFORM pg_advisory_xact_lock(hashtext('cash_close_' || v_withdrawal.parking_lot_id::text));

  SELECT max(closed_at) INTO v_last
  FROM public.cash_closures
  WHERE parking_lot_id = v_withdrawal.parking_lot_id;

  IF v_last IS NOT NULL AND v_withdrawal.withdrawn_at <= v_last THEN
    RAISE EXCEPTION 'No se puede reversar un movimiento incluido en un cierre de caja.';
  END IF;

  IF v_withdrawal.cash_minor_history_id IS NOT NULL THEN
    PERFORM public.cash_minor_annul_movement(v_withdrawal.cash_minor_history_id);
  END IF;

  DELETE FROM public.cash_withdrawals
  WHERE id = p_withdrawal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cash_minor_transfer_from_register(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cash_minor_reverse_register_transfer(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cash_minor_transfer_from_register(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cash_minor_reverse_register_transfer(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.cash_minor_add_funds(uuid, numeric, text) FROM authenticated;
