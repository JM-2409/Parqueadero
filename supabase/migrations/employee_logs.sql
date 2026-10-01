-- Migration for employee_logs table
CREATE TABLE IF NOT EXISTS public.employee_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    parking_lot_id uuid NULL,
    employee_name text NULL,
    action text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT employee_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE public.employee_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'employee_logs' AND policyname = 'Public full logs'
    ) THEN
        CREATE POLICY "Public full logs" ON public.employee_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
