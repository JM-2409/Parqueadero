DROP POLICY IF EXISTS "Subscription Plans - Read active plans"
  ON public.subscription_plans;
DROP POLICY IF EXISTS "Subscription Plans - Superadmin manage"
  ON public.subscription_plans;

CREATE POLICY "Subscription Plans - Public active read"
  ON public.subscription_plans
  FOR SELECT
  TO anon
  USING (is_active = true);
CREATE POLICY "Subscription Plans - Authenticated read"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR (SELECT internal.get_user_role()) = 'superadmin'
  );
CREATE POLICY "Subscription Plans - Superadmin insert"
  ON public.subscription_plans
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT internal.get_user_role()) = 'superadmin');
CREATE POLICY "Subscription Plans - Superadmin update"
  ON public.subscription_plans
  FOR UPDATE
  TO authenticated
  USING ((SELECT internal.get_user_role()) = 'superadmin')
  WITH CHECK ((SELECT internal.get_user_role()) = 'superadmin');
CREATE POLICY "Subscription Plans - Superadmin delete"
  ON public.subscription_plans
  FOR DELETE
  TO authenticated
  USING ((SELECT internal.get_user_role()) = 'superadmin');

DROP POLICY IF EXISTS "Subscription invoices - Superadmin manage"
  ON public.subscription_invoices;
CREATE POLICY "Subscription invoices - Superadmin insert"
  ON public.subscription_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT internal.get_user_role()) = 'superadmin');
CREATE POLICY "Subscription invoices - Superadmin update"
  ON public.subscription_invoices
  FOR UPDATE
  TO authenticated
  USING ((SELECT internal.get_user_role()) = 'superadmin')
  WITH CHECK ((SELECT internal.get_user_role()) = 'superadmin');
CREATE POLICY "Subscription invoices - Superadmin delete"
  ON public.subscription_invoices
  FOR DELETE
  TO authenticated
  USING ((SELECT internal.get_user_role()) = 'superadmin');

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_created_by
  ON public.subscription_invoices (created_by);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_plan_id
  ON public.subscription_invoices (plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_recorded_by
  ON public.subscription_payments (recorded_by);
