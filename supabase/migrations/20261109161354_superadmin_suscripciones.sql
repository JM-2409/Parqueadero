BEGIN;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_billing_interval_check;
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_billing_interval_check
  CHECK (billing_interval IN ('monthly', 'quarterly', 'yearly'));

DROP POLICY IF EXISTS "Subscription Plans - Superadmin manage" ON public.subscription_plans;
CREATE POLICY "Subscription Plans - Superadmin manage"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING ((SELECT internal.get_user_role()) = 'superadmin')
  WITH CHECK ((SELECT internal.get_user_role()) = 'superadmin');

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE SET NULL,
  parking_lot_name text NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'COP',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'void')),
  period_start date,
  period_end date,
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  paid_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.subscription_invoices(id) ON DELETE SET NULL,
  parking_lot_id uuid REFERENCES public.parking_lots(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'COP',
  method text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'refunded')),
  reference text,
  paid_at timestamptz,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_lot_created
  ON public.subscription_invoices (parking_lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status_due
  ON public.subscription_invoices (status, due_at)
  WHERE status IN ('pending', 'overdue');
CREATE INDEX IF NOT EXISTS idx_subscription_payments_invoice_created
  ON public.subscription_payments (invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_lot_created
  ON public.subscription_payments (parking_lot_id, created_at DESC);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscription invoices - Read own lot or superadmin"
  ON public.subscription_invoices;
CREATE POLICY "Subscription invoices - Read own lot or superadmin"
  ON public.subscription_invoices
  FOR SELECT TO authenticated
  USING (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      (SELECT internal.get_user_role()) = 'admin'
      AND parking_lot_id = (SELECT internal.get_user_parking_lot())
    )
  );

DROP POLICY IF EXISTS "Subscription invoices - Superadmin manage"
  ON public.subscription_invoices;
CREATE POLICY "Subscription invoices - Superadmin manage"
  ON public.subscription_invoices
  FOR ALL TO authenticated
  USING ((SELECT internal.get_user_role()) = 'superadmin')
  WITH CHECK ((SELECT internal.get_user_role()) = 'superadmin');

DROP POLICY IF EXISTS "Subscription payments - Read own lot or superadmin"
  ON public.subscription_payments;
CREATE POLICY "Subscription payments - Read own lot or superadmin"
  ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (
    (SELECT internal.get_user_role()) = 'superadmin'
    OR (
      (SELECT internal.get_user_role()) = 'admin'
      AND parking_lot_id = (SELECT internal.get_user_parking_lot())
    )
  );

DROP POLICY IF EXISTS "Subscription payments - Superadmin manage"
  ON public.subscription_payments;
CREATE POLICY "Subscription payments - Superadmin manage"
  ON public.subscription_payments
  FOR ALL TO authenticated
  USING ((SELECT internal.get_user_role()) = 'superadmin')
  WITH CHECK ((SELECT internal.get_user_role()) = 'superadmin');

DROP TRIGGER IF EXISTS trg_audit_subscription_invoices
  ON public.subscription_invoices;
CREATE TRIGGER trg_audit_subscription_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_money_changes();

DROP TRIGGER IF EXISTS trg_audit_subscription_payments
  ON public.subscription_payments;
CREATE TRIGGER trg_audit_subscription_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_money_changes();

COMMIT;
