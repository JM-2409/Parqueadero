CREATE OR REPLACE FUNCTION public.cash_minor_guard_transfer_reversal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.movement_type = 'cash_transfer'
     AND OLD.status = 'activo'
     AND NEW.status = 'anulado'
     AND EXISTS (
       SELECT 1
       FROM public.cash_withdrawals
       WHERE cash_minor_history_id = OLD.id
     ) THEN
    RAISE EXCEPTION 'Las transferencias deben reversarse desde Caja.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cash_minor_guard_transfer_reversal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cash_minor_guard_transfer_reversal ON public.cash_minor_history;
CREATE TRIGGER trg_cash_minor_guard_transfer_reversal
  BEFORE UPDATE OF status ON public.cash_minor_history
  FOR EACH ROW
  EXECUTE FUNCTION public.cash_minor_guard_transfer_reversal();

-- Reversa juntos el retiro de Caja y el abono al fondo de gastos.
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
    DELETE FROM public.cash_withdrawals
    WHERE id = p_withdrawal_id;

    PERFORM public.cash_minor_annul_movement(v_withdrawal.cash_minor_history_id);
    RETURN;
  END IF;

  DELETE FROM public.cash_withdrawals
  WHERE id = p_withdrawal_id;
END;
$$;
