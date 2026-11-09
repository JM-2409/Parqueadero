CREATE OR REPLACE FUNCTION public.record_subscription_payment(
  p_invoice_id uuid,
  p_method text,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_invoice public.subscription_invoices%ROWTYPE;
  v_payment_id uuid;
  v_paid_at timestamptz := pg_catalog.now();
BEGIN
  IF internal.get_user_role() IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Solo un superadministrador puede registrar pagos';
  END IF;

  IF p_method NOT IN ('cash', 'bank_transfer', 'other') THEN
    RAISE EXCEPTION 'El método de pago no es válido';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.subscription_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la factura seleccionada';
  END IF;

  IF v_invoice.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'La factura no está pendiente de pago';
  END IF;

  IF v_invoice.parking_lot_id IS NULL
     OR v_invoice.period_end IS NULL
     OR v_invoice.plan_id IS NULL THEN
    RAISE EXCEPTION 'La factura no tiene una suscripción válida asociada';
  END IF;

  IF v_invoice.amount <= 0 THEN
    RAISE EXCEPTION 'No se puede registrar un pago para una factura sin costo';
  END IF;

  IF v_invoice.period_end <
     (pg_catalog.now() AT TIME ZONE 'America/Bogota')::date THEN
    RAISE EXCEPTION 'El período de la factura ya terminó';
  END IF;

  INSERT INTO public.subscription_payments (
    invoice_id,
    parking_lot_id,
    amount,
    currency,
    method,
    status,
    reference,
    paid_at,
    recorded_by
  )
  VALUES (
    v_invoice.id,
    v_invoice.parking_lot_id,
    v_invoice.amount,
    v_invoice.currency,
    p_method,
    'confirmed',
    NULLIF(pg_catalog.btrim(p_reference), ''),
    v_paid_at,
    auth.uid()
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.subscription_invoices
  SET status = 'paid',
      paid_at = v_paid_at
  WHERE id = v_invoice.id;

  UPDATE public.parking_lots
  SET plan_id = v_invoice.plan_id,
      subscription_end_date =
        ((v_invoice.period_end + 1)::timestamp AT TIME ZONE 'America/Bogota')
  WHERE id = v_invoice.parking_lot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El parqueadero asociado a la factura ya no existe';
  END IF;

  RETURN v_payment_id;
END;
$function$;
